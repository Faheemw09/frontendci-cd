const { prisma } = require('../config/db');
const { httpError } = require('../utils/httpError');
const {
  parseHm,
  formatHm,
  buildSlotTime,
  dayOfWeekFromDateStr,
  addMinutesToHm,
  ymdInRange,
} = require('../utils/slotTime');

/**
 * Load doctor + schedule. Global prisma so patients can query any clinic's doctor.
 * When clinicId is set (clinic roles), enforces tenant match.
 */
async function loadDoctorContext(doctorId, clinicId = null) {
  const doctor = await prisma.doctor.findFirst({
    where: {
      id: doctorId,
      ...(clinicId ? { clinicId } : {}),
      isActive: true,
    },
    include: {
      availability: { where: { isActive: true } },
      leave: true,
    },
  });
  if (!doctor) throw httpError(404, 'Doctor not found');
  return doctor;
}

function isOnLeave(doctor, dateStr) {
  return doctor.leave.some((l) => ymdInRange(dateStr, l.startDate, l.endDate));
}

/**
 * Free slots for a doctor on YYYY-MM-DD from:
 * weekday windows − leave − non-cancelled bookings, stepped by slot_duration_minutes.
 */
async function getAvailableSlots(doctorId, dateStr, clinicId = null) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw httpError(400, 'date must be YYYY-MM-DD');
  }

  const doctor = await loadDoctorContext(doctorId, clinicId);

  if (isOnLeave(doctor, dateStr)) {
    return {
      doctorId,
      date: dateStr,
      onLeave: true,
      slotDurationMinutes: doctor.slotDurationMinutes,
      slots: [],
    };
  }

  const dow = dayOfWeekFromDateStr(dateStr);
  const windows = doctor.availability.filter((w) => w.dayOfWeek === dow);
  const duration = doctor.slotDurationMinutes;

  const dayStart = buildSlotTime(dateStr, '00:00');
  const dayEnd = buildSlotTime(dateStr, '23:59');

  const bookings = await prisma.appointment.findMany({
    where: {
      doctorId,
      status: { not: 'cancelled' },
      slotTime: { gte: dayStart, lte: dayEnd },
    },
    select: { startTime: true },
  });
  const bookedStarts = new Set(bookings.map((b) => b.startTime));

  const slots = [];
  for (const window of windows) {
    let cursor = parseHm(window.startTime);
    const end = parseHm(window.endTime);
    while (cursor + duration <= end) {
      const hm = formatHm(cursor);
      const endHm = addMinutesToHm(hm, duration);
      if (!bookedStarts.has(hm)) {
        slots.push({
          startTime: hm,
          endTime: endHm,
          slotTime: buildSlotTime(dateStr, hm).toISOString(),
        });
      }
      cursor += duration;
    }
  }

  slots.sort((a, b) => a.startTime.localeCompare(b.startTime));

  return {
    doctorId,
    date: dateStr,
    onLeave: false,
    slotDurationMinutes: duration,
    slots,
  };
}

module.exports = {
  getAvailableSlots,
  loadDoctorContext,
  isOnLeave,
};
