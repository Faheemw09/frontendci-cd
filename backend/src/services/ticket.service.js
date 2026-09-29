const { prisma } = require('../config/db');
const { httpError } = require('../utils/httpError');
const env = require('../config/env');
const { sendNotification } = require('./notification.service');

const TICKET_INCLUDE = {
  patient: true,
  linkedAppointment: true,
  raisedByUser: {
    select: { id: true, firstName: true, lastName: true, role: true, email: true },
  },
  assignedToUser: {
    select: { id: true, firstName: true, lastName: true, role: true, email: true },
  },
  clinic: { select: { id: true, name: true, slug: true } },
  messages: {
    orderBy: { createdAt: 'asc' },
    include: {
      author: {
        select: { id: true, firstName: true, lastName: true, role: true },
      },
    },
  },
};

function isSlaBreached(ticket) {
  if (!['open', 'in_progress'].includes(ticket.status)) return false;
  const ageMs = Date.now() - new Date(ticket.createdAt).getTime();
  return ageMs > env.ticketSlaHours * 60 * 60 * 1000;
}

function serializeMessage(m) {
  return {
    id: m.id,
    ticketId: m.ticketId,
    authorId: m.authorId,
    body: m.body,
    createdAt: m.createdAt,
    author: m.author || undefined,
  };
}

function serializeTicket(t) {
  const ageHours =
    (Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);

  return {
    id: t.id,
    clinicId: t.clinicId,
    patientId: t.patientId,
    linkedAppointmentId: t.linkedAppointmentId,
    raisedBy: t.raisedBy,
    assignedTo: t.assignedTo,
    subject: t.subject,
    description: t.description,
    category: t.category,
    status: t.status,
    priority: t.priority,
    createdAt: t.createdAt,
    resolvedAt: t.resolvedAt,
    updatedAt: t.updatedAt,
    ageHours: Math.round(ageHours * 10) / 10,
    slaBreached: isSlaBreached(t),
    slaHours: env.ticketSlaHours,
    clinic: t.clinic || undefined,
    patient: t.patient || undefined,
    linkedAppointment: t.linkedAppointment || undefined,
    raisedByUser: t.raisedByUser || undefined,
    assignedToUser: t.assignedToUser || undefined,
    messages: Array.isArray(t.messages) ? t.messages.map(serializeMessage) : undefined,
  };
}

async function notifyPatientStatusChange(ticket, previousStatus, newStatus) {
  const patient = ticket.patientId
    ? await prisma.patient.findUnique({ where: { id: ticket.patientId } })
    : null;
  if (!patient?.userId) return;

  await sendNotification({
    userId: patient.userId,
    clinicId: ticket.clinicId,
    type: 'ticket_status_changed',
    channel: 'in_app',
    title: 'Support ticket updated',
    body: `Ticket "${ticket.subject}" status changed from ${previousStatus} to ${newStatus}.`,
    payload: {
      ticketId: ticket.id,
      previousStatus,
      status: newStatus,
    },
  });
}

async function assertCanAccessTicket(actor, ticket) {
  if (actor.role === 'super_admin') return;
  if (actor.role === 'patient') {
    if (ticket.patientId !== actor.patientProfile?.id && ticket.raisedBy !== actor.id) {
      throw httpError(403, 'Forbidden');
    }
    return;
  }
  if (actor.role === 'clinic_admin' || actor.role === 'staff') {
    if (ticket.clinicId !== actor.clinicId) throw httpError(403, 'Forbidden');
    return;
  }
  throw httpError(403, 'Forbidden');
}

async function createTicket({ actor, data }) {
  let clinicId = data.clinicId || null;
  let patientId = data.patientId || null;
  let linkedAppointmentId = data.linkedAppointmentId || data.appointmentId || null;

  if (linkedAppointmentId) {
    const appt = await prisma.appointment.findUnique({
      where: { id: linkedAppointmentId },
    });
    if (!appt) throw httpError(404, 'Appointment not found');
    clinicId = appt.clinicId;
    patientId = appt.patientId;

    if (actor.role === 'patient' && appt.patientId !== actor.patientProfile?.id) {
      throw httpError(403, 'Forbidden');
    }
  }

  if (actor.role === 'patient') {
    patientId = actor.patientProfile?.id || patientId;
    if (!patientId) throw httpError(404, 'Patient profile not found');
    if (!clinicId) throw httpError(400, 'clinicId or linkedAppointmentId required');
  } else if (actor.role === 'clinic_admin' || actor.role === 'staff') {
    clinicId = actor.clinicId;
  } else if (actor.role === 'super_admin') {
    if (!clinicId) throw httpError(400, 'clinicId required for platform tickets');
  } else {
    throw httpError(403, 'Forbidden');
  }

  const ticket = await prisma.$transaction(async (tx) => {
    const created = await tx.supportTicket.create({
      data: {
        clinicId,
        patientId,
        linkedAppointmentId,
        raisedBy: actor.id,
        subject: data.subject,
        description: data.description,
        category: data.category || 'general_complaint',
        priority: data.priority || 'medium',
        status: 'open',
        assignedTo: data.assignedTo || null,
      },
    });

    // Seed thread with opening description
    await tx.ticketMessage.create({
      data: {
        ticketId: created.id,
        authorId: actor.id,
        body: data.description,
      },
    });

    return tx.supportTicket.findUnique({
      where: { id: created.id },
      include: TICKET_INCLUDE,
    });
  });

  return serializeTicket(ticket);
}

async function listTickets({ actor, status, category, clinicId, slaBreachedOnly }) {
  const where = {};

  if (actor.role === 'patient') {
    where.OR = [
      { patientId: actor.patientProfile?.id },
      { raisedBy: actor.id },
    ];
  } else if (actor.role === 'clinic_admin' || actor.role === 'staff') {
    where.clinicId = actor.clinicId;
  } else if (actor.role === 'super_admin') {
    if (clinicId) where.clinicId = clinicId;
  } else {
    throw httpError(403, 'Forbidden');
  }

  if (status) where.status = status;
  if (category) where.category = category;

  let rows = await prisma.supportTicket.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    include: TICKET_INCLUDE,
  });

  let tickets = rows.map(serializeTicket);

  if (slaBreachedOnly === true || slaBreachedOnly === 'true') {
    tickets = tickets.filter((t) => t.slaBreached);
  }

  // Super-admin aging view: breached first, then oldest
  if (actor.role === 'super_admin') {
    tickets.sort((a, b) => {
      if (a.slaBreached !== b.slaBreached) return a.slaBreached ? -1 : 1;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
  } else {
    tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return {
    tickets,
    meta:
      actor.role === 'super_admin'
        ? {
            slaHours: env.ticketSlaHours,
            breachedCount: tickets.filter((t) => t.slaBreached).length,
            openCount: tickets.filter((t) =>
              ['open', 'in_progress'].includes(t.status)
            ).length,
          }
        : undefined,
  };
}

async function getTicket({ actor, ticketId }) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: TICKET_INCLUDE,
  });
  if (!ticket) throw httpError(404, 'Ticket not found');
  await assertCanAccessTicket(actor, ticket);
  return serializeTicket(ticket);
}

async function updateTicket({ actor, ticketId, data }) {
  const existing = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: { patient: true },
  });
  if (!existing) throw httpError(404, 'Ticket not found');

  if (actor.role === 'super_admin') {
    // full access
  } else if (actor.role === 'clinic_admin' || actor.role === 'staff') {
    if (existing.clinicId !== actor.clinicId) throw httpError(403, 'Forbidden');
  } else {
    throw httpError(403, 'Only clinic staff or super admin can update tickets');
  }

  const previousStatus = existing.status;
  const nextStatus = data.status !== undefined ? data.status : previousStatus;

  const updated = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      ...(data.status !== undefined && { status: data.status }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo }),
      ...(nextStatus === 'resolved' || nextStatus === 'closed'
        ? { resolvedAt: existing.resolvedAt || new Date() }
        : {}),
      ...(nextStatus === 'open' || nextStatus === 'in_progress'
        ? { resolvedAt: null }
        : {}),
    },
    include: TICKET_INCLUDE,
  });

  if (data.status !== undefined && data.status !== previousStatus) {
    await notifyPatientStatusChange(updated, previousStatus, data.status);
  }

  return serializeTicket(updated);
}

async function addReply({ actor, ticketId, body }) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
  });
  if (!ticket) throw httpError(404, 'Ticket not found');
  await assertCanAccessTicket(actor, ticket);

  if (['resolved', 'closed'].includes(ticket.status) && actor.role === 'patient') {
    throw httpError(400, 'Cannot reply to a closed ticket');
  }

  const message = await prisma.ticketMessage.create({
    data: {
      ticketId,
      authorId: actor.id,
      body,
    },
    include: {
      author: {
        select: { id: true, firstName: true, lastName: true, role: true },
      },
    },
  });

  // Auto-move open → in_progress when staff/super_admin replies
  if (
    ticket.status === 'open' &&
    (actor.role === 'clinic_admin' ||
      actor.role === 'staff' ||
      actor.role === 'super_admin')
  ) {
    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'in_progress' },
      include: { patient: true },
    });
    await notifyPatientStatusChange(updated, 'open', 'in_progress');
  }

  // Notify patient when staff replies
  if (actor.role !== 'patient' && ticket.patientId) {
    const patient = await prisma.patient.findUnique({
      where: { id: ticket.patientId },
    });
    if (patient?.userId) {
      await sendNotification({
        userId: patient.userId,
        clinicId: ticket.clinicId,
        type: 'ticket_reply',
        channel: 'in_app',
        title: 'New reply on your support ticket',
        body: `There is a new reply on "${ticket.subject}".`,
        payload: { ticketId, messageId: message.id },
      });
    }
  }

  return serializeMessage(message);
}

module.exports = {
  createTicket,
  listTickets,
  getTicket,
  updateTicket,
  addReply,
  serializeTicket,
  isSlaBreached,
};
