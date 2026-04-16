import { clientEnv } from "./env.js";

function buildUrl(pathname) {
  const baseUrl = clientEnv.apiBaseUrl.replace(/\/+$/, "");
  const normalisedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${baseUrl}${normalisedPath}`;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json();
}

async function requestJson(pathname, { method = "GET", token, body } = {}) {
  const response = await fetch(buildUrl(pathname), {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    const error = new Error(payload?.error?.message ?? "Request failed.");
    error.code = payload?.error?.code ?? "REQUEST_FAILED";
    error.details = payload?.error?.details ?? null;
    throw error;
  }

  return payload;
}

export function createPollRequest(payload, token) {
  return requestJson("/polls", {
    method: "POST",
    token,
    body: payload
  });
}

export function getPollByIdRequest(pollId, token) {
  return requestJson(`/polls/${pollId}`, {
    token
  });
}

export function getPollByShareCodeRequest(shareCode, token) {
  return requestJson(`/polls/share/${shareCode}`, {
    token
  });
}

export function voteOnPollRequest(pollId, optionId, token) {
  return requestJson(`/polls/${pollId}/votes`, {
    method: "POST",
    token,
    body: { optionId }
  });
}

export function closePollRequest(pollId, token) {
  return requestJson(`/polls/${pollId}/close`, {
    method: "POST",
    token
  });
}

