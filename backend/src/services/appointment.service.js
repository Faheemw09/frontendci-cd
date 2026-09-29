const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { prisma } = require('../config/db');
const { httpError } = require('../utils/httpError');
const env = require('../config/env');
const {
  buildSlotTime,
  addMinutesToHm,
  dayOfWeekFromDateStr,
  parseHm,
} = require('../utils/slotTime');
const { isOnLeave } = require('./slots.service');
const { sendNotification } = require('./notification.service');

const CLINIC_ROLES = new Set(['clinic_admin', 'staff', 'doctor']);

function serializeAppointment(a) {
  return {
    id: a.id,
    clinicId: a.clinicId,
    doctorId: a.doctorId,
    patientId: a.patientId,
    bookedByUserId: a.bookedByUserId,
    appointmentDate: a.appointmentDate,
    startTime: a.startTime,
    endTime: a.endTime,
    slotTime: a.slotTime,
    status: a.status,
    notes: a.notes,
    cancellationReason: a.cancellationReason,
    cancelledByRole: a.cancelledByRole,
    cancelledAt: a.cancelledAt,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    doctor: a.doctor || undefined,
    patient: a.patient || undefined,
    clinic: a.clinic || undefined,
  };
}

async function assertSlotBookable(tx, doctor, date, startTime) {
  if (isOnLeave(doctor, date)) {
    throw httpError(409, 'Doctor is on leave for this date');
  }

  const duration = doctor.slotDurationMinutes;
  const endTime = addMinutesToHm(startTime, duration);
  const slotTime = buildSlotTime(date, startTime);
  const dow = dayOfWeekFromDateStr(date);

  const windows = doctor.availability.filter((w) => w.dayOfWeek === dow);
  const aligned = windows.some((w) => {
    const offset = parseHm(startTime) - parseHm(w.startTime);
    return offset >= 0 && offset % duration === 0 && parseHm(endTime) <= parseHm(w.endTime);
  });
  if (!aligned) {
    throw httpError(400, 'Requested time is not a valid available slot');
  }

  const clash = await tx.appointment.findFirst({
    where: {
      doctorId: doctor.id,
      slotTime,
      status: { not: 'cancelled' },
    },
  });
  if (clash) throw httpError(409, 'Slot is no longer available');

  return { endTime, slotTime, duration };
}

/**
 * Confirm booking (patient self-serve or staff booking for known patientId).
 * Creates appointment as `booked` inside $transaction, then stubs sendNotification.
 */
async function confirmBooking({
  actor,
  doctorId,
  patientId,
  date,
  startTime,
  notes,
  isWalkIn = false,
}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw httpError(400, 'date must be YYYY-MM-DD');
  }

  const clinicFilter = CLINIC_ROLES.has(actor.role) ? actor.clinicId : null;

  try {
    const appointment = await prisma.$transaction(async (tx) => {
      const doctor = await tx.doctor.findFirst({
        where: {
          id: doctorId,
          isActive: true,
          ...(clinicFilter ? { clinicId: clinicFilter } : {}),
        },
        include: {
          availability: { where: { isActive: true } },
          leave: true,
          user: true,
          clinic: true,
        },
      });
      if (!doctor) throw httpError(404, 'Doctor not found');

      const patient = await tx.patient.findUnique({
        where: { id: patientId },
        include: { user: true },
      });
      if (!patient) throw httpError(404, 'Patient not found');

      if (actor.role === 'patient') {
        const ownId = actor.patientProfile?.id;
        if (!ownId || ownId !== patientId) {
          throw httpError(403, 'Patients may only book for themselves');
        }
      }

      const { endTime, slotTime } = await assertSlotBookable(tx, doctor, date, startTime);

      return tx.appointment.create({
        data: {
          clinicId: doctor.clinicId,
          doctorId: doctor.id,
          patientId: patient.id,
          bookedByUserId: actor.id,
          appointmentDate: new Date(`${date}T00:00:00.000Z`),
          startTime,
          endTime,
          slotTime,
          status: 'booked',
          notes: notes || (isWalkIn ? 'Walk-in booking' : null),
        },
        include: {
          doctor: { include: { user: true } },
          patient: { include: { user: true } },
          clinic: true,
        },
      });
    });

    const doctorName = appointment.doctor?.user
      ? `Dr ${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName}`
      : 'your doctor';

    if (appointment.patient?.userId) {
      await sendNotification({
        userId: appointment.patient.userId,
        clinicId: appointment.clinicId,
        type: 'appointment_confirmed',
        channel: 'sms',
        title: 'Appointment confirmed',
        body: `Your appointment with ${doctorName} on ${date} at ${startTime} is confirmed.`,
        payload: {
          appointmentId: appointment.id,
          doctorId: appointment.doctorId,
          slotTime: appointment.slotTime,
        },
      });
    }

    return serializeAppointment(appointment);
  } catch (err) {
    if (err.code === 'P2002') {
      throw httpError(409, 'Slot already booked (double-booking prevented)');
    }
    throw err;
  }
}

/**
 * Manual walk-in: find/create patient by phone, then book.
 */
async function bookWalkIn({
  actor,
  doctorId,
  date,
  startTime,
  notes,
  patient: patientInput,
}) {
  if (actor.role !== 'clinic_admin' && actor.role !== 'staff') {
    throw httpError(403, 'Only clinic admin/staff can create walk-in bookings');
  }

  const phone = patientInput.phone.trim();
  let patient = await prisma.patient.findFirst({
    where: { phone },
    include: { user: true },
  });

  if (!patient) {
    const email =
      patientInput.email?.toLowerCase() ||
      `walkin+${phone.replace(/\D/g, '')}@clinicy.local`;
    const passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
    const names = (patientInput.fullName || 'Walk-in Patient').trim().split(/\s+/);
    const firstName = names[0] || 'Walk-in';
    const lastName = names.slice(1).join(' ') || 'Patient';

    const existingUser = await prisma.user.findFirst({
      where: { email, clinicId: null },
      include: { patientProfile: true },
    });

    if (existingUser?.patientProfile) {
      patient = await prisma.patient.findUnique({
        where: { id: existingUser.patientProfile.id },
        include: { user: true },
      });
    } else if (existingUser) {
      patient = await prisma.patient.create({
        data: {
          userId: existingUser.id,
          fullName: patientInput.fullName,
          phone,
          email,
        },
        include: { user: true },
      });
    } else {
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          phone,
          role: 'patient',
          clinicId: null,
          firstName,
          lastName,
          patientProfile: {
            create: {
              fullName: patientInput.fullName,
              phone,
              email,
            },
          },
        },
        include: { patientProfile: true },
      });
      patient = { ...user.patientProfile, user };
    }
  }

  return confirmBooking({
    actor,
    doctorId,
    patientId: patient.id,
    date,
    startTime,
    notes: notes || `Walk-in: ${patientInput.fullName}`,
    isWalkIn: true,
  });
}

async function listAppointments({ actor, date, doctorId, patientId, status }) {
  const where = {};

  if (actor.role === 'patient') {
    where.patientId = actor.patientProfile?.id;
    if (!where.patientId) throw httpError(404, 'Patient profile not found');
  } else if (actor.role === 'doctor') {
    where.doctorId = actor.doctorProfile?.id;
    if (!where.doctorId) throw httpError(404, 'Doctor profile not found');
    where.clinicId = actor.clinicId;
  } else if (actor.role === 'clinic_admin' || actor.role === 'staff') {
    where.clinicId = actor.clinicId;
    if (doctorId) where.doctorId = doctorId;
    if (patientId) where.patientId = patientId;
  } else {
    throw httpError(403, 'Forbidden');
  }

  if (date) where.appointmentDate = new Date(`${date}T00:00:00.000Z`);
  if (status) where.status = status;

  const rows = await prisma.appointment.findMany({
    where,
    orderBy: [{ appointmentDate: 'asc' }, { startTime: 'asc' }],
    include: {
      doctor: { include: { user: true } },
      patient: true,
      clinic: true,
    },
  });
  return rows.map(serializeAppointment);
}

function assertCancelCutoff(slotTime, role) {
  // Clinic-side cancels are always allowed; patient must respect cutoff
  if (role !== 'patient') return;

  const cutoffMs = env.cancellationCutoffHours * 60 * 60 * 1000;
  const msUntil = new Date(slotTime).getTime() - Date.now();
  if (msUntil < cutoffMs) {
    throw httpError(
      400,
      `Cannot cancel within ${env.cancellationCutoffHours} hours of the appointment`
    );
  }
}

/**
 * Cancel appointment. Clinic cancel returns supportTicketPrompt for the patient.
 */
async function cancelAppointment({ actor, appointmentId, reason }) {
  const existing = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
      clinic: true,
    },
  });
  if (!existing || existing.status === 'cancelled') {
    throw httpError(404, 'Appointment not found');
  }
  if (existing.status !== 'booked') {
    throw httpError(400, 'Only booked appointments can be cancelled');
  }

  if (actor.role === 'patient') {
    if (existing.patientId !== actor.patientProfile?.id) {
      throw httpError(403, 'Forbidden');
    }
  } else if (actor.role === 'doctor') {
    if (existing.doctorId !== actor.doctorProfile?.id) {
      throw httpError(403, 'Forbidden');
    }
  } else if (actor.role === 'clinic_admin' || actor.role === 'staff') {
    if (existing.clinicId !== actor.clinicId) {
      throw httpError(403, 'Forbidden');
    }
  } else {
    throw httpError(403, 'Forbidden');
  }

  assertCancelCutoff(existing.slotTime, actor.role);

  const cancelledByClinic = CLINIC_ROLES.has(actor.role);

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: 'cancelled',
      cancellationReason: reason || null,
      cancelledByRole: actor.role,
      cancelledAt: new Date(),
    },
    include: {
      doctor: { include: { user: true } },
      patient: { include: { user: true } },
      clinic: true,
    },
  });

  if (updated.patient?.userId) {
    await sendNotification({
      userId: updated.patient.userId,
      clinicId: updated.clinicId,
      type: 'appointment_cancelled',
      channel: 'sms',
      title: 'Appointment cancelled',
      body: cancelledByClinic
        ? `Your appointment at ${updated.clinic?.name || 'the clinic'} on ${updated.startTime} was cancelled by the clinic.`
        : `Your appointment was cancelled.`,
      payload: { appointmentId: updated.id, cancelledByRole: actor.role },
    });
  }

  const result = { appointment: serializeAppointment(updated) };

  if (cancelledByClinic) {
    result.offerSupportTicket = true;
    result.supportTicketPrompt = {
      message:
        'This appointment was cancelled by the clinic. The patient can raise a support ticket.',
      endpoint: 'POST /api/support-tickets',
      suggestedPayload: {
        linkedAppointmentId: updated.id,
        clinicId: updated.clinicId,
        category: 'slot_cancelled',
        subject: 'Clinic cancelled my appointment',
        description: `Appointment ${updated.id} on ${updated.appointmentDate?.toISOString?.().slice(0, 10) || ''} at ${updated.startTime} was cancelled by the clinic.${reason ? ` Reason: ${reason}` : ''}`,
        priority: 'medium',
      },
    };
  }

  return result;
}

async function updateAppointmentStatus({ actor, appointmentId, status }) {
  const allowed = ['completed', 'no_show', 'cancelled'];
  if (!allowed.includes(status)) {
    throw httpError(400, `status must be one of ${allowed.join(', ')}`);
  }

  if (status === 'cancelled') {
    return cancelAppointment({ actor, appointmentId, reason: 'Status set to cancelled' });
  }

  const existing = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });
  if (!existing) throw httpError(404, 'Appointment not found');
  if (existing.status !== 'booked') {
    throw httpError(400, 'Only booked appointments can be marked completed/no_show');
  }

  if (actor.role === 'doctor') {
    if (existing.doctorId !== actor.doctorProfile?.id) throw httpError(403, 'Forbidden');
  } else if (actor.role === 'clinic_admin' || actor.role === 'staff') {
    if (existing.clinicId !== actor.clinicId) throw httpError(403, 'Forbidden');
  } else {
    throw httpError(403, 'Forbidden');
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status },
    include: {
      doctor: { include: { user: true } },
      patient: true,
      clinic: true,
    },
  });
  return { appointment: serializeAppointment(updated) };
}

/**
 * Reschedule a booked appointment.
 * Clinic staff: any appointment in their clinic.
 * Patient: own appointments only.
 */
async function rescheduleAppointment({ actor, appointmentId, date, startTime }) {
  const isStaff = actor.role === 'clinic_admin' || actor.role === 'staff';
  const isPatient = actor.role === 'patient';
  if (!isStaff && !isPatient) {
    throw httpError(403, 'Forbidden');
  }

  try {
    const appointment = await prisma.$transaction(async (tx) => {
      const existing = await tx.appointment.findUnique({
        where: { id: appointmentId },
      });
      if (!existing) throw httpError(404, 'Appointment not found');

      if (isStaff && existing.clinicId !== actor.clinicId) {
        throw httpError(404, 'Appointment not found');
      }
      if (isPatient && existing.patientId !== actor.patientProfile?.id) {
        throw httpError(403, 'Forbidden');
      }
      if (existing.status !== 'booked') {
        throw httpError(400, 'Only booked appointments can be rescheduled');
      }

      const doctor = await tx.doctor.findFirst({
        where: {
          id: existing.doctorId,
          clinicId: existing.clinicId,
          isActive: true,
        },
        include: {
          availability: { where: { isActive: true } },
          leave: true,
        },
      });
      if (!doctor) throw httpError(404, 'Doctor not found');

      const { endTime, slotTime } = await assertSlotBookable(tx, doctor, date, startTime);

      return tx.appointment.update({
        where: { id: appointmentId },
        data: {
          appointmentDate: new Date(`${date}T00:00:00.000Z`),
          startTime,
          endTime,
          slotTime,
          notes: existing.notes
            ? `${existing.notes}\n[Rescheduled]`
            : `Rescheduled by ${actor.role}`,
        },
        include: {
          doctor: { include: { user: true } },
          patient: true,
          clinic: true,
        },
      });
    });

    if (appointment.patient?.userId) {
      await sendNotification({
        userId: appointment.patient.userId,
        clinicId: appointment.clinicId,
        type: 'appointment_rescheduled',
        channel: 'sms',
        title: 'Appointment rescheduled',
        body: `Your appointment was moved to ${date} at ${startTime}.`,
        payload: { appointmentId: appointment.id, date, startTime },
      });
    }

    return { appointment: serializeAppointment(appointment) };
  } catch (err) {
    if (err.code === 'P2002') {
      throw httpError(409, 'Target slot already booked');
    }
    throw err;
  }
}

module.exports = {
  confirmBooking,
  bookWalkIn,
  listAppointments,
  cancelAppointment,
  updateAppointmentStatus,
  rescheduleAppointment,
  serializeAppointment,
  bookAppointment: confirmBooking,
};
