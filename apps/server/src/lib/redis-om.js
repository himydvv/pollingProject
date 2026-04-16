import redisOm from "redis-om";

import { env } from "../config/env.js";

const { Client } = redisOm;

export const redisOmClient = new Client();

let redisOmConnectionPromise;

export async function connectRedisOm() {
  if (!redisOmConnectionPromise) {
    redisOmConnectionPromise = redisOmClient.open(env.redisUrl);
  }

  await redisOmConnectionPromise;
}
