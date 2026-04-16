import { POLL_RULES, normaliseOptions, trimToNull } from "@polling-app/shared";

import { AppError } from "../../utils/app-error.js";

function assert(condition, message, details = null) {
  if (!condition) {
    throw new AppError(message, {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      details
    });
  }
}

export function validateCreatePollInput(body) {
  const question = trimToNull(body?.question);
  const description = trimToNull(body?.description);
  const optionLabels = normaliseOptions(body?.options);
  const durationMinutes = Number.parseInt(String(body?.durationMinutes ?? ""), 10);

  assert(question, "A poll question is required.");
  assert(
    question.length >= POLL_RULES.MIN_QUESTION_LENGTH,
    `Question must be at least ${POLL_RULES.MIN_QUESTION_LENGTH} characters long.`
  );
  assert(
    question.length <= POLL_RULES.MAX_QUESTION_LENGTH,
    `Question must be at most ${POLL_RULES.MAX_QUESTION_LENGTH} characters long.`
  );

  if (description) {
    assert(
      description.length <= POLL_RULES.MAX_DESCRIPTION_LENGTH,
      `Description must be at most ${POLL_RULES.MAX_DESCRIPTION_LENGTH} characters long.`
    );
  }

  assert(
    optionLabels.length >= POLL_RULES.MIN_OPTIONS,
    `At least ${POLL_RULES.MIN_OPTIONS} options are required.`
  );

  const lowerCaseOptions = new Set();

  for (const optionLabel of optionLabels) {
    assert(
      optionLabel.length <= POLL_RULES.MAX_OPTION_LENGTH,
      `Each option must be at most ${POLL_RULES.MAX_OPTION_LENGTH} characters long.`
    );

    const normalisedLabel = optionLabel.toLowerCase();
    assert(!lowerCaseOptions.has(normalisedLabel), "Poll options must be unique.");
    lowerCaseOptions.add(normalisedLabel);
  }

  assert(
    Number.isInteger(durationMinutes),
    "Poll duration must be provided in whole minutes."
  );
  assert(
    durationMinutes >= POLL_RULES.MIN_DURATION_MINUTES,
    `Poll duration must be at least ${POLL_RULES.MIN_DURATION_MINUTES} minute.`
  );
  assert(
    durationMinutes <= POLL_RULES.MAX_DURATION_MINUTES,
    `Poll duration must be at most ${POLL_RULES.MAX_DURATION_MINUTES} minutes.`
  );

  return {
    question,
    description,
    optionLabels,
    durationMinutes
  };
}

