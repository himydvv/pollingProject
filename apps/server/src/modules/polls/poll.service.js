import { POLL_STATUS } from "@polling-app/shared";

import { redisClient } from "../../lib/redis.js";
import { AppError } from "../../utils/app-error.js";
import { createExpiryDate, getRedisTtlSeconds } from "../../utils/duration.js";
import { generateShareCode } from "../../utils/share-code.js";
import {
  fetchPollById,
  fetchPollByShareCode,
  fetchPollResult,
  createPollWithOptions,
  updatePollStatus,
  upsertPollResultSnapshot
} from "./poll.repository.js";
import {
  buildPollResultSnapshot,
  buildPollState,
  buildPollStateFromResult
} from "./poll.mapper.js";
import {
  findPollSessionByShareCode,
  initialisePollSessionRepository,
  upsertPollSession
} from "./poll-session.repository.js";
import {
  getPollCountsKey,
  getPollMetaKey,
  getPollVotersKey,
  POLL_SESSION_RETENTION_SECONDS
} from "./poll.constants.js";

function isExpired(expiresAt) {
  return Date.now() >= new Date(expiresAt).getTime();
}

function buildEmptyCounts(definition) {
  return Object.fromEntries(definition.options.map((option) => [option.id, 0]));
}

function buildZeroCountHash(definition) {
  return Object.fromEntries(definition.options.map((option) => [option.id, "0"]));
}

export async function initialisePollModule() {
  await initialisePollSessionRepository();
}

export async function getRequiredPollDefinitionById(pollId) {
  const pollDefinition = await fetchPollById(pollId);

  if (!pollDefinition) {
    throw new AppError("Poll was not found.", {
      statusCode: 404,
      code: "POLL_NOT_FOUND"
    });
  }

  return pollDefinition;
}

async function getRequiredPollDefinitionByShareCode(shareCode) {
  const pollDefinition = await fetchPollByShareCode(shareCode);

  if (!pollDefinition) {
    throw new AppError("Poll was not found.", {
      statusCode: 404,
      code: "POLL_NOT_FOUND"
    });
  }

  return pollDefinition;
}

export async function ensureLiveSession(definition) {
  if (definition.status !== POLL_STATUS.ACTIVE) {
    return;
  }

  const metaKey = getPollMetaKey(definition.id);
  const countsKey = getPollCountsKey(definition.id);
  const expiresAtMs = new Date(definition.expiresAt).getTime();
  const ttlSeconds = getRedisTtlSeconds(expiresAtMs, POLL_SESSION_RETENTION_SECONDS);

  const [metaExists, countsExists] = await Promise.all([
    redisClient.exists(metaKey),
    redisClient.exists(countsKey)
  ]);

  if (!metaExists) {
    await redisClient.hSet(metaKey, {
      pollId: definition.id,
      ownerId: definition.ownerId,
      shareCode: definition.shareCode,
      question: definition.question,
      status: definition.status,
      expiresAtMs: String(expiresAtMs)
    });
  }

  if (!countsExists) {
    await redisClient.hSet(countsKey, buildZeroCountHash(definition));
  }

  await Promise.all([
    redisClient.expire(metaKey, ttlSeconds),
    redisClient.expire(countsKey, ttlSeconds),
    upsertPollSession({
      pollId: definition.id,
      ownerId: definition.ownerId,
      shareCode: definition.shareCode,
      question: definition.question,
      status: definition.status,
      expiresAtMs
    })
  ]);
}

async function readCountsByOptionId(definition) {
  const counts = await redisClient.hGetAll(getPollCountsKey(definition.id));

  if (!counts || Object.keys(counts).length === 0) {
    return buildEmptyCounts(definition);
  }

  return Object.fromEntries(
    definition.options.map((option) => [option.id, Number(counts[option.id] ?? 0)])
  );
}

async function readLiveSnapshot(definition, viewerUserId) {
  const countsByOptionId = await readCountsByOptionId(definition);
  const hasVoted = viewerUserId
    ? await redisClient.sIsMember(getPollVotersKey(definition.id), viewerUserId)
    : false;

  return {
    countsByOptionId,
    hasVoted
  };
}

async function syncClosedSession(definition, finalStatus) {
  const metaKey = getPollMetaKey(definition.id);
  const countsKey = getPollCountsKey(definition.id);
  const votersKey = getPollVotersKey(definition.id);

  await redisClient.hSet(metaKey, {
    pollId: definition.id,
    ownerId: definition.ownerId,
    shareCode: definition.shareCode,
    question: definition.question,
    status: finalStatus,
    expiresAtMs: String(new Date(definition.expiresAt).getTime())
  });

  await Promise.all([
    redisClient.expire(metaKey, POLL_SESSION_RETENTION_SECONDS),
    redisClient.expire(countsKey, POLL_SESSION_RETENTION_SECONDS),
    redisClient.expire(votersKey, POLL_SESSION_RETENTION_SECONDS),
    upsertPollSession({
      pollId: definition.id,
      ownerId: definition.ownerId,
      shareCode: definition.shareCode,
      question: definition.question,
      status: finalStatus,
      expiresAtMs: new Date(definition.expiresAt).getTime()
    })
  ]);
}

export async function finalisePoll({ definition, pollId, finalStatus, viewerUserId = null }) {
  const activeDefinition = definition ?? (await getRequiredPollDefinitionById(pollId));

  if (activeDefinition.status !== POLL_STATUS.ACTIVE) {
    return getPollStateById({
      pollId: activeDefinition.id,
      viewerUserId
    });
  }

  const countsByOptionId = await readCountsByOptionId(activeDefinition);
  const snapshot = buildPollResultSnapshot(activeDefinition, countsByOptionId);
  const finishedAt = new Date().toISOString();

  await Promise.all([
    updatePollStatus(activeDefinition.id, finalStatus),
    upsertPollResultSnapshot({
      pollId: activeDefinition.id,
      finalStatus,
      totalVotes: snapshot.totalVotes,
      winnerOptionId: snapshot.winnerOptionId,
      finishedAt,
      results: snapshot.results
    }),
    syncClosedSession(activeDefinition, finalStatus)
  ]);

  const updatedDefinition = {
    ...activeDefinition,
    status: finalStatus
  };

  return buildPollStateFromResult({
    definition: updatedDefinition,
    resultRow: {
      final_status: finalStatus,
      total_votes: snapshot.totalVotes,
      winner_option_id: snapshot.winnerOptionId,
      results_json: snapshot.results
    },
    viewerUserId
  });
}

async function getPollStateFromDefinition(definition, viewerUserId) {
  if (definition.status === POLL_STATUS.ACTIVE && isExpired(definition.expiresAt)) {
    return finalisePoll({
      definition,
      finalStatus: POLL_STATUS.EXPIRED,
      viewerUserId
    });
  }

  if (definition.status === POLL_STATUS.ACTIVE) {
    await ensureLiveSession(definition);
    const liveSnapshot = await readLiveSnapshot(definition, viewerUserId);

    return buildPollState({
      definition,
      countsByOptionId: liveSnapshot.countsByOptionId,
      viewerUserId,
      hasVoted: liveSnapshot.hasVoted
    });
  }

  const storedResult = await fetchPollResult(definition.id);

  if (storedResult) {
    return buildPollStateFromResult({
      definition,
      resultRow: storedResult,
      viewerUserId
    });
  }

  return buildPollState({
    definition,
    countsByOptionId: await readCountsByOptionId(definition),
    viewerUserId,
    hasVoted: false
  });
}

export async function createPoll({ ownerId, question, description, optionLabels, durationMinutes }) {
  const expiresAt = createExpiryDate(durationMinutes).toISOString();

  let pollId = null;
  let attemptCount = 0;

  while (!pollId && attemptCount < 5) {
    const shareCode = generateShareCode();

    try {
      pollId = await createPollWithOptions({
        ownerId,
        question,
        description,
        shareCode,
        expiresAt,
        optionLabels
      });
    } catch (error) {
      if (error?.code === "23505") {
        attemptCount += 1;
        continue;
      }

      throw error;
    }
  }

  if (!pollId) {
    throw new AppError("Unable to create a unique poll code. Try again.", {
      statusCode: 500,
      code: "POLL_CREATE_FAILED"
    });
  }

  const definition = await getRequiredPollDefinitionById(pollId);
  await ensureLiveSession(definition);

  return getPollStateFromDefinition(definition, ownerId);
}

export async function getPollStateById({ pollId, viewerUserId = null }) {
  const definition = await getRequiredPollDefinitionById(pollId);
  return getPollStateFromDefinition(definition, viewerUserId);
}

export async function getPollStateByShareCode({ shareCode, viewerUserId = null }) {
  const upperCaseShareCode = shareCode.toUpperCase();
  const session = await findPollSessionByShareCode(upperCaseShareCode);
  const definition = session
    ? await getRequiredPollDefinitionById(session.pollId)
    : await getRequiredPollDefinitionByShareCode(upperCaseShareCode);

  return getPollStateFromDefinition(definition, viewerUserId);
}

export async function closePoll({ pollId, requesterUserId }) {
  const definition = await getRequiredPollDefinitionById(pollId);

  if (definition.ownerId !== requesterUserId) {
    throw new AppError("Only the poll creator can close this poll.", {
      statusCode: 403,
      code: "FORBIDDEN"
    });
  }

  if (definition.status !== POLL_STATUS.ACTIVE) {
    return getPollStateFromDefinition(definition, requesterUserId);
  }

  return finalisePoll({
    definition,
    finalStatus: isExpired(definition.expiresAt) ? POLL_STATUS.EXPIRED : POLL_STATUS.CLOSED,
    viewerUserId: requesterUserId
  });
}
