import redisOm from "redis-om";

const { Schema, EntityId, EntityKeyName } = redisOm;

export { EntityId, EntityKeyName };

export const pollSessionSchema = new Schema(
  "pollSession",
  {
    pollId: { type: "string" },
    ownerId: { type: "string" },
    shareCode: { type: "string" },
    question: { type: "text" },
    status: { type: "string" },
    expiresAtMs: { type: "number" }
  },
  {
    dataStructure: "HASH"
  }
);
