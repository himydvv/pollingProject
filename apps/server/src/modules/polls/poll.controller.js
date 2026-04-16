import { asyncHandler } from "../../utils/async-handler.js";
import { validateCreatePollInput } from "./poll.validation.js";
import {
  closePoll,
  createPoll,
  getPollStateById,
  getPollStateByShareCode
} from "./poll.service.js";
import { emitPollState } from "./poll.socket.js";
import { SOCKET_EVENTS } from "@polling-app/shared";

export const createPollController = asyncHandler(async (request, response) => {
  const input = validateCreatePollInput(request.body);
  const pollState = await createPoll({
    ownerId: request.auth.userId,
    ...input
  });

  response.status(201).json(pollState);
});

export const getPollByIdController = asyncHandler(async (request, response) => {
  const pollState = await getPollStateById({
    pollId: request.params.pollId,
    viewerUserId: request.auth?.userId ?? null
  });

  response.json(pollState);
});

export const getPollByShareCodeController = asyncHandler(async (request, response) => {
  const pollState = await getPollStateByShareCode({
    shareCode: request.params.shareCode,
    viewerUserId: request.auth?.userId ?? null
  });

  response.json(pollState);
});

export const closePollController = asyncHandler(async (request, response) => {
  const pollState = await closePoll({
    pollId: request.params.pollId,
    requesterUserId: request.auth.userId
  });

  emitPollState(request.app.get("io"), request.params.pollId, SOCKET_EVENTS.POLL_CLOSED, pollState);
  response.json(pollState);
});

