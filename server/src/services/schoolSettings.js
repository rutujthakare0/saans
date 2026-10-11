export const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
export function defaultNotifyBy(schoolStart = '08:00') {
  const [hour, minute] = schoolStart.split(':').map(Number);
  const total = Math.max(0, hour * 60 + minute - 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
export function validateSchoolSettings(input) {
  const name = String(input.name || '').trim();
  const locationLabel = String(input.locationLabel || '').trim();
  const lat = Number(input.lat), lng = Number(input.lng);
  const schoolStart = String(input.schoolStart || ''), schoolEnd = String(input.schoolEnd || '');
  const checkTime = String(input.checkTime || '06:00');
  const notifyBy = String(input.notifyBy || defaultNotifyBy(schoolStart));
  if (name.length < 2 || name.length > 80) return { error: 'School name must be between 2 and 80 characters.' };
  if (!Number.isFinite(lat) || lat < 6 || lat > 38 || !Number.isFinite(lng) || lng < 68 || lng > 98) return { error: 'Choose a location within India (latitude 6–38, longitude 68–98).' };
  if (!locationLabel || locationLabel.length > 120) return { error: 'Choose or enter a location label (up to 120 characters).' };
  if (!timePattern.test(schoolStart) || !timePattern.test(schoolEnd) || schoolStart >= schoolEnd) return { error: 'Enter valid school hours with the start before the end.' };
  if (!timePattern.test(checkTime) || checkTime >= schoolStart) return { error: 'The daily check time must be before school starts.' };
  if (!timePattern.test(notifyBy) || notifyBy < checkTime || notifyBy >= schoolStart) return { error: 'Principal reminder time must not be before the daily check and must be before school starts.' };
  const district = String(input.district || 'Unspecified district').trim();
  if (district.length > 100) return { error: 'District must be 100 characters or fewer.' };
  return { value: { name, lat, lng, locationLabel, schoolStart, schoolEnd, checkTime, notifyBy, district, optedInToLeaderboard: input.optedInToLeaderboard === true, timezone: 'Asia/Kolkata', configured: true } };
}
export function makeSlug(name, suffix = '') {
  const base = String(name).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 45) || 'school';
  return suffix ? `${base}-${suffix}` : base;
}
