import { trimToNull } from "@polling-app/shared";

import { AppError } from "../../utils/app-error.js";

export function validateVoteInput(body) {
  const optionId = trimToNull(body?.optionId);

  if (!optionId) {
    throw new AppError("A valid option id is required.", {
      statusCode: 400,
      code: "VALIDATION_ERROR"
    });
  }

  return { optionId };
}

