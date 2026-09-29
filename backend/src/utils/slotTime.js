/** Time helpers for slot generation (HH:MM wall clock, date YYYY-MM-DD). */

function parseHm(hm) {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

function formatHm(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Build timestamptz for (date, HH:MM) using UTC wall-clock.
 * Must match migration backfill and booking path exactly.
 */
function buildSlotTime(dateStr, startTimeHm) {
  return new Date(`${dateStr}T${startTimeHm}:00.000Z`);
}

function dateToYmd(date) {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 10);
}

/** JS getUTCDay(): 0=Sun … 6=Sat — matches schema dayOfWeek. */
function dayOfWeekFromDateStr(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
}

function addMinutesToHm(hm, minutes) {
  return formatHm(parseHm(hm) + minutes);
}

function ymdInRange(dateStr, startDate, endDate) {
  const ymd = dateStr;
  const start = dateToYmd(startDate);
  const end = dateToYmd(endDate);
  return ymd >= start && ymd <= end;
}

module.exports = {
  parseHm,
  formatHm,
  buildSlotTime,
  dateToYmd,
  dayOfWeekFromDateStr,
  addMinutesToHm,
  ymdInRange,
};
