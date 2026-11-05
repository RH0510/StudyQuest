const { ObjectId } = require('mongodb');

// ValidateEmail from Section 4.6.6.
function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (local.length < 1 || /\s/.test(email)) return false;
  const dot = domain.indexOf('.');
  return dot > 0 && domain.lastIndexOf('.') < domain.length - 1;
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normaliseEmail(value) {
  return cleanString(value).toLowerCase();
}

// Returns a Date, or null when the value is missing or not a real date.
function parseDate(value) {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toObjectId(value) {
  if (typeof value !== 'string' || !ObjectId.isValid(value) || String(new ObjectId(value)) !== value) return null;
  return new ObjectId(value);
}

module.exports = { isValidEmail, cleanString, normaliseEmail, parseDate, toObjectId };
