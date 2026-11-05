// All calendar-day logic uses South African Standard Time (UTC+2, no daylight saving).
const TIME_ZONE = 'Africa/Johannesburg';
const DAY_MS = 24 * 60 * 60 * 1000;

const keyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Returns the SAST calendar day of a moment as "YYYY-MM-DD".
function dayKey(date = new Date()) {
  return keyFormatter.format(date);
}

// Midnight SAST at the start of a "YYYY-MM-DD" day, as a Date.
function startOfDay(key) {
  return new Date(`${key}T00:00:00+02:00`);
}

function addDays(key, days) {
  return dayKey(new Date(startOfDay(key).getTime() + days * DAY_MS + 12 * 60 * 60 * 1000));
}

function hoursBetween(from, to) {
  return (to.getTime() - from.getTime()) / (60 * 60 * 1000);
}

module.exports = { TIME_ZONE, DAY_MS, dayKey, startOfDay, addDays, hoursBetween };
