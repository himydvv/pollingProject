const ONE_SECOND_IN_MS = 1000;
const ONE_MINUTE_IN_MS = 60 * ONE_SECOND_IN_MS;

export function minutesToMilliseconds(minutes) {
  return minutes * ONE_MINUTE_IN_MS;
}

export function createExpiryDate(durationMinutes) {
  return new Date(Date.now() + minutesToMilliseconds(durationMinutes));
}

export function getRedisTtlSeconds(expiresAt, retentionWindowSeconds = 3600) {
  const expiresAtMs = new Date(expiresAt).getTime();
  const remainingSeconds = Math.ceil((expiresAtMs - Date.now()) / ONE_SECOND_IN_MS);
  return Math.max(retentionWindowSeconds, remainingSeconds + retentionWindowSeconds);
}

