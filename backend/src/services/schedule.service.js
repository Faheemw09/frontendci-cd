const { prisma } = require('../config/db');
const { httpError } = require('../utils/httpError');
const { parseHm } = require('../utils/slotTime');

async function assertDoctorExists(db, doctorId) {
  const doctor = await db.doctor.findFirst({ where: { id: doctorId } });
  if (!doctor) throw httpError(404, 'Doctor not found');
  return doctor;
}

/**
 * Ensure doctor windows sit inside clinic.settings.hours for that weekday.
 * If clinic has no hours configured, allow any window.
 */
async function assertWithinClinicHours(clinicId, windows) {
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
  const hours = clinic?.settings?.hours;
  if (!Array.isArray(hours) || !hours.length) return;

  for (const w of windows) {
    const day = hours.find((h) => Number(h.dayOfWeek) === Number(w.dayOfWeek));
    if (!day || day.closed) {
      throw httpError(
        400,
        `Clinic is closed on day ${w.dayOfWeek}; cannot set availability`
      );
    }
    if (parseHm(w.startTime) < parseHm(day.open) || parseHm(w.endTime) > parseHm(day.close)) {
      throw httpError(
        400,
        `Availability ${w.startTime}-${w.endTime} must be within clinic hours ${day.open}-${day.close}`
      );
    }
  }
}

async function listAvailability(db, doctorId) {
  await assertDoctorExists(db, doctorId);
  return db.doctorAvailability.findMany({
    where: { doctorId },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
}

async function createAvailability(db, clinicId, doctorId, data) {
  await assertDoctorExists(db, doctorId);
  await assertWithinClinicHours(clinicId, [data]);
  return db.doctorAvailability.create({
    data: {
      clinicId,
      doctorId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      isActive: data.isActive ?? true,
    },
  });
}

async function updateAvailability(db, doctorId, availabilityId, data) {
  const row = await db.doctorAvailability.findFirst({
    where: { id: availabilityId, doctorId },
  });
  if (!row) throw httpError(404, 'Availability window not found');

  const startTime = data.startTime ?? row.startTime;
  const endTime = data.endTime ?? row.endTime;
  if (startTime >= endTime) throw httpError(400, 'startTime must be before endTime');

  const next = {
    dayOfWeek: data.dayOfWeek ?? row.dayOfWeek,
    startTime,
    endTime,
  };
  await assertWithinClinicHours(row.clinicId, [next]);

  return db.doctorAvailability.update({
    where: { id: availabilityId },
    data: {
      ...(data.dayOfWeek !== undefined && { dayOfWeek: data.dayOfWeek }),
      ...(data.startTime !== undefined && { startTime: data.startTime }),
      ...(data.endTime !== undefined && { endTime: data.endTime }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

async function deleteAvailability(db, doctorId, availabilityId) {
  const row = await db.doctorAvailability.findFirst({
    where: { id: availabilityId, doctorId },
  });
  if (!row) throw httpError(404, 'Availability window not found');
  await db.doctorAvailability.delete({ where: { id: availabilityId } });
  return { ok: true };
}

async function replaceAvailability(db, clinicId, doctorId, windows) {
  await assertDoctorExists(db, doctorId);
  await assertWithinClinicHours(clinicId, windows);

  await db.doctorAvailability.deleteMany({ where: { doctorId } });

  const created = [];
  for (const w of windows) {
    const row = await db.doctorAvailability.create({
      data: {
        clinicId,
        doctorId,
        dayOfWeek: w.dayOfWeek,
        startTime: w.startTime,
        endTime: w.endTime,
        isActive: w.isActive ?? true,
      },
    });
    created.push(row);
  }
  return created;
}

async function listLeave(db, doctorId) {
  await assertDoctorExists(db, doctorId);
  return db.doctorLeave.findMany({
    where: { doctorId },
    orderBy: { startDate: 'desc' },
  });
}

async function createLeave(db, clinicId, doctorId, data) {
  await assertDoctorExists(db, doctorId);
  return db.doctorLeave.create({
    data: {
      clinicId,
      doctorId,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      reason: data.reason || null,
    },
  });
}

async function updateLeave(db, doctorId, leaveId, data) {
  const row = await db.doctorLeave.findFirst({
    where: { id: leaveId, doctorId },
  });
  if (!row) throw httpError(404, 'Leave record not found');

  const startDate = data.startDate ? new Date(data.startDate) : row.startDate;
  const endDate = data.endDate ? new Date(data.endDate) : row.endDate;
  if (startDate > endDate) throw httpError(400, 'startDate must be on or before endDate');

  return db.doctorLeave.update({
    where: { id: leaveId },
    data: {
      ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
      ...(data.endDate !== undefined && { endDate: new Date(data.endDate) }),
      ...(data.reason !== undefined && { reason: data.reason }),
    },
  });
}

async function deleteLeave(db, doctorId, leaveId) {
  const row = await db.doctorLeave.findFirst({
    where: { id: leaveId, doctorId },
  });
  if (!row) throw httpError(404, 'Leave record not found');
  await db.doctorLeave.delete({ where: { id: leaveId } });
  return { ok: true };
}

module.exports = {
  listAvailability,
  createAvailability,
  updateAvailability,
  deleteAvailability,
  replaceAvailability,
  listLeave,
  createLeave,
  updateLeave,
  deleteLeave,
  assertWithinClinicHours,
};
