import { createServer } from "node:http";

import { Server as SocketServer } from "socket.io";

import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectRedis } from "./lib/redis.js";
import { connectRedisOm } from "./lib/redis-om.js";
import { initialisePollModule } from "./modules/polls/poll.service.js";
import { registerPollSocketHandlers } from "./modules/polls/poll.socket.js";

async function bootstrap() {
  await connectRedis();
  await connectRedisOm();
  await initialisePollModule();

  const app = createApp({ clientUrl: env.clientUrl });
  const httpServer = createServer(app);

  const io = new SocketServer(httpServer, {
    cors: {
      origin: env.clientUrl,
      methods: ["GET", "POST"]
    }
  });

  app.set("io", io);
  registerPollSocketHandlers(io);

  httpServer.listen(env.port, () => {
    console.log(`Server listening on http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server:", error);
  process.exitCode = 1;
});
