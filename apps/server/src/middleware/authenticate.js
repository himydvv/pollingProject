import { getUserFromAccessToken } from "../lib/supabase.js";
import { AppError } from "../utils/app-error.js";

function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token.trim();
}

async function resolveAuthContext(request) {
  const accessToken = extractBearerToken(request.headers.authorization);

  if (!accessToken) {
    return null;
  }

  const user = await getUserFromAccessToken(accessToken);

  if (!user) {
    throw new AppError("Authentication failed.", {
      statusCode: 401,
      code: "UNAUTHENTICATED"
    });
  }

  return {
    accessToken,
    user,
    userId: user.id
  };
}

export async function attachOptionalAuth(request, response, next) {
  try {
    request.auth = await resolveAuthContext(request);
    next();
  } catch (error) {
    next(
      new AppError("Your session is invalid or expired. Sign in again.", {
        statusCode: 401,
        code: "UNAUTHENTICATED"
      })
    );
  }
}

export async function authenticate(request, response, next) {
  try {
    const authContext = await resolveAuthContext(request);

    if (!authContext) {
      throw new AppError("Authentication is required for this action.", {
        statusCode: 401,
        code: "UNAUTHENTICATED"
      });
    }

    request.auth = authContext;
    next();
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError("Authentication failed.", {
            statusCode: 401,
            code: "UNAUTHENTICATED"
          })
    );
  }
}

