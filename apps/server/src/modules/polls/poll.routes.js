import { Router } from "express";

import { attachOptionalAuth, authenticate } from "../../middleware/authenticate.js";
import {
  closePollController,
  createPollController,
  getPollByIdController,
  getPollByShareCodeController
} from "./poll.controller.js";
import { submitVoteController } from "../votes/vote.controller.js";

export const pollRoutes = Router();

pollRoutes.post("/", authenticate, createPollController);
pollRoutes.get("/share/:shareCode", attachOptionalAuth, getPollByShareCodeController);
pollRoutes.get("/:pollId", attachOptionalAuth, getPollByIdController);
pollRoutes.post("/:pollId/votes", authenticate, submitVoteController);
pollRoutes.post("/:pollId/close", authenticate, closePollController);
