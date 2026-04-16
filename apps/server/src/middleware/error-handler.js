import { AppError } from "../utils/app-error.js";

export function errorHandler(error, request, response, next) {
  const normalisedError =
    error instanceof AppError
      ? error
      : new AppError("Unexpected server error.", {
          statusCode: 500,
          code: "INTERNAL_ERROR",
          expose: false
        });

  if (normalisedError.statusCode >= 500) {
    console.error(error);
  }

  response.status(normalisedError.statusCode).json({
    error: {
      code: normalisedError.code,
      message: normalisedError.expose ? normalisedError.message : "Unexpected server error.",
      details: normalisedError.details
    }
  });
}

