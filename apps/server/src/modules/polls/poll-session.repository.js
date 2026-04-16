import { redisClient } from "../../lib/redis.js";
import { getRedisTtlSeconds } from "../../utils/duration.js";
import { POLL_SESSION_RETENTION_SECONDS } from "./poll.constants.js";
import { EntityId, EntityKeyName, pollSessionSchema } from "./poll-session.entity.js";
import { redisOmClient } from "../../lib/redis-om.js";

let pollSessionRepository;

function isMissingIndexError(error) {
  const message = error?.message ?? "";

  return (
    message.includes("Unknown index name") ||
    message.includes("Unknown Index name") ||
    message.includes("no such index")
  );
}

async function createPollSessionIndexManually() {
  await Promise.all([
    redisClient.ft.create(
      pollSessionSchema.indexName,
      {
        pollId: { type: "TAG", AS: "pollId" },
        ownerId: { type: "TAG", AS: "ownerId" },
        shareCode: { type: "TAG", AS: "shareCode" },
        question: { type: "TEXT", AS: "question" },
        status: { type: "TAG", AS: "status" },
        expiresAtMs: { type: "NUMERIC", AS: "expiresAtMs" }
      },
      {
        ON: "HASH",
        PREFIX: `${pollSessionSchema.schemaName}:`
      }
    ),
    redisClient.set(pollSessionSchema.indexHashName, pollSessionSchema.indexHash)
  ]);
}

function mapEntity(entity) {
  if (!entity) {
    return null;
  }

  return {
    entityId: entity[EntityId],
    keyName: entity[EntityKeyName],
    pollId: entity.pollId,
    ownerId: entity.ownerId,
    shareCode: entity.shareCode,
    question: entity.question,
    status: entity.status,
    expiresAtMs: Number(entity.expiresAtMs)
  };
}

async function getRepository() {
  if (!pollSessionRepository) {
    pollSessionRepository = redisOmClient.fetchRepository(pollSessionSchema);
  }

  return pollSessionRepository;
}

async function expireEntity(entity, expiresAtMs) {
  const keyName = entity?.[EntityKeyName];

  if (!keyName) {
    return;
  }

  await redisClient.expire(
    keyName,
    getRedisTtlSeconds(expiresAtMs, POLL_SESSION_RETENTION_SECONDS)
  );
}

export async function initialisePollSessionRepository() {
  const repository = await getRepository();

  try {
    await repository.createIndex();
  } catch (error) {
    if (!isMissingIndexError(error)) {
      throw error;
    }

    // Redis OM 0.4.7 only ignores older "unknown index" messages.
    // Newer Redis versions can reply with "<index>: no such index" on first boot.
    await redisClient.unlink(pollSessionSchema.indexHashName);
    await createPollSessionIndexManually();
  }
}

export async function findPollSessionByPollId(pollId) {
  const repository = await getRepository();
  const entity = await repository.search().where("pollId").equals(pollId).return.first();
  return mapEntity(entity);
}

export async function findPollSessionByShareCode(shareCode) {
  const repository = await getRepository();
  const entity = await repository
    .search()
    .where("shareCode")
    .equals(shareCode)
    .return.first();

  return mapEntity(entity);
}

export async function upsertPollSession(session) {
  const repository = await getRepository();
  const existingEntity = await repository.search().where("pollId").equals(session.pollId).return.first();
  const entity = existingEntity ?? repository.createEntity();

  Object.assign(entity, session);
  await repository.save(entity);
  await expireEntity(entity, session.expiresAtMs);

  return mapEntity(entity);
}
