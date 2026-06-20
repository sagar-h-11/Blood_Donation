export function sendJson(response, statusCode, payload) {
  response.status(statusCode).json(payload);
}

export function methodNotAllowed(response, allowedMethods) {
  response.setHeader("Allow", allowedMethods);
  sendJson(response, 405, { error: "Method not allowed." });
}

export async function readBody(request) {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  if (typeof request.body === "string") {
    return JSON.parse(request.body || "{}");
  }

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
}

export function handleApiError(response, error) {
  console.error(error);
  const message = error?.message === "DATABASE_URL is not configured."
    ? "Database is not configured. Add DATABASE_URL before using this API."
    : "Server error. Please try again.";
  sendJson(response, 500, { error: message });
}
