import { POLL_STATUS } from "@polling-app/shared";

import { redisClient } from "../../lib/redis.js";
import { getRedisTtlSeconds } from "../../utils/duration.js";
import { getRequiredPollDefinitionById, ensureLiveSession, finalisePoll, getPollStateById } from "../polls/poll.service.js";
import {
  getPollCountsKey,
  getPollMetaKey,
  getPollVotersKey,
  POLL_SESSION_RETENTION_SECONDS,
  VOTE_SCRIPT_CODES
} from "../polls/poll.constants.js";

const VOTE_SCRIPT = `
  if redis.call("EXISTS", KEYS[2]) == 0 then
    return {"SESSION_NOT_FOUND"}
  end

  local status = redis.call("HGET", KEYS[3], "status")
  if not status then
    return {"SESSION_NOT_FOUND"}
  end

  local expiresAtMs = tonumber(redis.call("HGET", KEYS[3], "expiresAtMs"))
  local nowMs = tonumber(ARGV[3])

  if status ~= "active" then
    return {"POLL_NOT_ACTIVE"}
  end

  if expiresAtMs and nowMs >= expiresAtMs then
    return {"POLL_EXPIRED"}
  end

  if redis.call("HEXISTS", KEYS[2], ARGV[2]) == 0 then
    return {"INVALID_OPTION"}
  end

  if redis.call("SISMEMBER", KEYS[1], ARGV[1]) == 1 then
    return {"ALREADY_VOTED"}
  end

  redis.call("SADD", KEYS[1], ARGV[1])
  redis.call("EXPIRE", KEYS[1], tonumber(ARGV[4]))
  redis.call("EXPIRE", KEYS[2], tonumber(ARGV[4]))
  redis.call("EXPIRE", KEYS[3], tonumber(ARGV[4]))

  local newCount = redis.call("HINCRBY", KEYS[2], ARGV[2], 1)
  local totalVotes = redis.call("SCARD", KEYS[1])

  return {"OK", tostring(newCount), tostring(totalVotes)}
`;

function buildRejection(code, message, state = null) {
  return {
    status: "rejected",
    code,
    message,
    state
  };
}

async function executeVote(definition, optionId, userId) {
  const ttlSeconds = getRedisTtlSeconds(definition.expiresAt, POLL_SESSION_RETENTION_SECONDS);

  return redisClient.eval(VOTE_SCRIPT, {
    keys: [
      getPollVotersKey(definition.id),
      getPollCountsKey(definition.id),
      getPollMetaKey(definition.id)
    ],
    arguments: [
      userId,
      optionId,
      String(Date.now()),
      String(ttlSeconds)
    ]
  });
}

export async function submitVote({ pollId, optionId, userId }) {
  const definition = await getRequiredPollDefinitionById(pollId);

  if (!definition.options.some((option) => option.id === optionId)) {
    return buildRejection("INVALID_OPTION", "The selected option does not exist for this poll.");
  }

  if (definition.status !== POLL_STATUS.ACTIVE) {
    const state = await getPollStateById({
      pollId: definition.id,
      viewerUserId: userId
    });

    return buildRejection("POLL_NOT_ACTIVE", "Voting is closed for this poll.", state);
  }

  if (Date.now() >= new Date(definition.expiresAt).getTime()) {
    const state = await finalisePoll({
      definition,
      finalStatus: POLL_STATUS.EXPIRED,
      viewerUserId: userId
    });

    return buildRejection("POLL_EXPIRED", "This poll has expired.", state);
  }

  await ensureLiveSession(definition);

  let scriptResult = await executeVote(definition, optionId, userId);
  let resultCode = scriptResult?.[0];

  if (resultCode === VOTE_SCRIPT_CODES.SESSION_NOT_FOUND) {
    await ensureLiveSession(definition);
    scriptResult = await executeVote(definition, optionId, userId);
    resultCode = scriptResult?.[0];
  }

  if (resultCode === VOTE_SCRIPT_CODES.OK) {
    const state = await getPollStateById({
      pollId: definition.id,
      viewerUserId: userId
    });

    return {
      status: "accepted",
      state
    };
  }

  if (resultCode === VOTE_SCRIPT_CODES.ALREADY_VOTED) {
    return buildRejection("ALREADY_VOTED", "You have already voted in this poll.");
  }

  if (resultCode === VOTE_SCRIPT_CODES.INVALID_OPTION) {
    return buildRejection("INVALID_OPTION", "The selected option does not exist for this poll.");
  }

  if (resultCode === VOTE_SCRIPT_CODES.POLL_NOT_ACTIVE) {
    const state = await getPollStateById({
      pollId: definition.id,
      viewerUserId: userId
    });

    return buildRejection("POLL_NOT_ACTIVE", "Voting is closed for this poll.", state);
  }

  if (resultCode === VOTE_SCRIPT_CODES.POLL_EXPIRED) {
    const state = await finalisePoll({
      definition,
      finalStatus: POLL_STATUS.EXPIRED,
      viewerUserId: userId
    });

    return buildRejection("POLL_EXPIRED", "This poll has expired.", state);
  }

  return buildRejection(
    "VOTE_FAILED",
    "Unable to record the vote because the live session is unavailable."
  );
}
