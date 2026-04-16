export const POLL_STATUS = Object.freeze({
  ACTIVE: "active",
  CLOSED: "closed",
  EXPIRED: "expired"
});

export const SOCKET_EVENTS = Object.freeze({
  JOIN_POLL: "poll:join",
  POLL_STATE: "poll:state",
  POLL_UPDATED: "poll:update",
  POLL_CLOSED: "poll:closed",
  POLL_ERROR: "poll:error"
});

export const POLL_RULES = Object.freeze({
  MIN_OPTIONS: 2,
  MAX_OPTIONS: 6,
  MIN_QUESTION_LENGTH: 10,
  MAX_QUESTION_LENGTH: 160,
  MAX_DESCRIPTION_LENGTH: 280,
  MAX_OPTION_LENGTH: 80,
  DEFAULT_DURATION_MINUTES: 30,
  MIN_DURATION_MINUTES: 1,
  MAX_DURATION_MINUTES: 180
});

export function trimToNull(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normaliseOptions(options) {
  if (!Array.isArray(options)) {
    return [];
  }

  return options
    .map((option) => trimToNull(option))
    .filter(Boolean)
    .slice(0, POLL_RULES.MAX_OPTIONS);
}

export function getPollRoomName(pollId) {
  return `poll:${pollId}`;
}

export function formatVotePercentage(voteCount, totalVotes) {
  if (!totalVotes) {
    return 0;
  }

  return Number(((voteCount / totalVotes) * 100).toFixed(1));
}
