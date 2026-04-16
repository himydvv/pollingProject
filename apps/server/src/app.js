import express from "express";

import { errorHandler } from "./middleware/error-handler.js";
import { notFoundMiddleware } from "./middleware/not-found.js";
import { pollRoutes } from "./modules/polls/poll.routes.js";

export function createApp({ clientUrl }) {
  const app = express();

  app.use((request, response, next) => {
    response.header("Access-Control-Allow-Origin", clientUrl);
    response.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
    response.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

    if (request.method === "OPTIONS") {
      return response.sendStatus(204);
    }

    next();
  });

  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (request, response) => {
    response.json({
      status: "ok",
      timestamp: new Date().toISOString()
    });
  });

  app.use("/api/polls", pollRoutes);

  app.use(notFoundMiddleware);
  app.use(errorHandler);

  return app;
}

