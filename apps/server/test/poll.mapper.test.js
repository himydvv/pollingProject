import assert from "node:assert/strict";
import test from "node:test";

import { buildPollResultSnapshot, buildPollState } from "../src/modules/polls/poll.mapper.js";
import { POLL_STATUS } from "@polling-app/shared";

const baseDefinition = {
  id: "poll-1",
  ownerId: "user-1",
  question: "Which state management approach should the frontend team standardize on?",
  description: "Interview demo poll",
  shareCode: "AB12CD",
  status: POLL_STATUS.ACTIVE,
  expiresAt: "2026-04-12T12:00:00.000Z",
  createdAt: "2026-04-12T11:30:00.000Z",
  options: [
    { id: "option-1", label: "Context + reducers", position: 0 },
    { id: "option-2", label: "TanStack Query", position: 1 },
    { id: "option-3", label: "Redux Toolkit", position: 2 }
  ]
};

test("buildPollResultSnapshot computes totals, percentages, and leader", () => {
  const snapshot = buildPollResultSnapshot(baseDefinition, {
    "option-1": 2,
    "option-2": 5,
    "option-3": 3
  });

  assert.equal(snapshot.totalVotes, 10);
  assert.equal(snapshot.winnerOptionId, "option-2");
  assert.deepEqual(snapshot.results.map((result) => result.percentage), [20, 50, 30]);
});

test("buildPollState exposes owner and voted flags without mutating counts", () => {
  const pollState = buildPollState({
    definition: baseDefinition,
    countsByOptionId: {
      "option-1": 1,
      "option-2": 1,
      "option-3": 0
    },
    viewerUserId: "user-1",
    hasVoted: true
  });

  assert.equal(pollState.poll.totalVotes, 2);
  assert.equal(pollState.poll.leadingOptionId, "option-1");
  assert.equal(pollState.viewer.isOwner, true);
  assert.equal(pollState.viewer.hasVoted, true);
  assert.deepEqual(
    pollState.options.map((option) => option.voteCount),
    [1, 1, 0]
  );
});
