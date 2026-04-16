import { createClient } from "redis";

import { env } from "../config/env.js";

export const redisClient = createClient({
  url: env.redisUrl
});

let redisConnectionPromise;

redisClient.on("error", (error) => {
  console.error("Redis client error:", error);
});

export async function connectRedis() {
  if (!redisConnectionPromise) {
    redisConnectionPromise = redisClient.connect();
  }

  await redisConnectionPromise;
}

