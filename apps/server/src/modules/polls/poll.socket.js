import { SOCKET_EVENTS, getPollRoomName } from "@polling-app/shared";

import { AppError } from "../../utils/app-error.js";
import { getPollStateById } from "./poll.service.js";

function normaliseSocketError(error) {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message
    };
  }

  return {
    code: "SOCKET_ERROR",
    message: "Failed to load poll state."
  };
}

export function emitPollState(io, pollId, eventName, payload) {
  io.to(getPollRoomName(pollId)).emit(eventName, payload);
}

export function registerPollSocketHandlers(io) {
  io.on("connection", (socket) => {
    socket.on(SOCKET_EVENTS.JOIN_POLL, async (payload = {}) => {
      const pollId = typeof payload.pollId === "string" ? payload.pollId.trim() : "";

      if (!pollId) {
        socket.emit(SOCKET_EVENTS.POLL_ERROR, {
          code: "VALIDATION_ERROR",
          message: "A valid poll id is required."
        });
        return;
      }

      try {
        socket.join(getPollRoomName(pollId));
        const pollState = await getPollStateById({ pollId });
        socket.emit(SOCKET_EVENTS.POLL_STATE, pollState);
      } catch (error) {
        socket.emit(SOCKET_EVENTS.POLL_ERROR, normaliseSocketError(error));
      }
    });
  });
}

