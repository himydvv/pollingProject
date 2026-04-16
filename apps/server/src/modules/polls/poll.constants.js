export const POLL_SESSION_RETENTION_SECONDS = 3600;

export const VOTE_SCRIPT_CODES = Object.freeze({
  OK: "OK",
  ALREADY_VOTED: "ALREADY_VOTED",
  INVALID_OPTION: "INVALID_OPTION",
  POLL_EXPIRED: "POLL_EXPIRED",
  POLL_NOT_ACTIVE: "POLL_NOT_ACTIVE",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND"
});

export function getPollMetaKey(pollId) {
  return `poll:${pollId}:meta`;
}

export function getPollCountsKey(pollId) {
  return `poll:${pollId}:counts`;
}

export function getPollVotersKey(pollId) {
  return `poll:${pollId}:voters`;
}

