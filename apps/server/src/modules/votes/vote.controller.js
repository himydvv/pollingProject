import { SOCKET_EVENTS } from "@polling-app/shared";

import { AppError } from "../../utils/app-error.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { emitPollState } from "../polls/poll.socket.js";
import { submitVote } from "./vote.service.js";
import { validateVoteInput } from "./vote.validation.js";

export const submitVoteController = asyncHandler(async (request, response) => {
  const { optionId } = validateVoteInput(request.body);
  const voteResult = await submitVote({
    pollId: request.params.pollId,
    optionId,
    userId: request.auth.userId
  });

  if (voteResult.status === "accepted") {
    emitPollState(
      request.app.get("io"),
      request.params.pollId,
      SOCKET_EVENTS.POLL_UPDATED,
      voteResult.state
    );

    response.status(201).json(voteResult.state);
    return;
  }

  if (voteResult.code === "POLL_EXPIRED" && voteResult.state) {
    emitPollState(
      request.app.get("io"),
      request.params.pollId,
      SOCKET_EVENTS.POLL_CLOSED,
      voteResult.state
    );
  }

  const statusCodeByError = {
    ALREADY_VOTED: 409,
    POLL_EXPIRED: 409,
    POLL_NOT_ACTIVE: 409,
    INVALID_OPTION: 400,
    VOTE_FAILED: 503
  };

  throw new AppError(voteResult.message, {
    statusCode: statusCodeByError[voteResult.code] ?? 400,
    code: voteResult.code,
    details: voteResult.state ? { state: voteResult.state } : null
  });
});
