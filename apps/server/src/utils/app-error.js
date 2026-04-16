export class AppError extends Error {
  constructor(message, options = {}) {
    super(message);

    this.name = "AppError";
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? "INTERNAL_ERROR";
    this.details = options.details ?? null;
    this.expose = options.expose ?? this.statusCode < 500;
  }
}

