import { AppError } from "../utils/app-error.js";

export function notFoundMiddleware(request, response, next) {
  next(
    new AppError(`Route ${request.method} ${request.originalUrl} was not found.`, {
      statusCode: 404,
      code: "ROUTE_NOT_FOUND"
    })
  );
}

