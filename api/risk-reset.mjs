import { risk } from "../typescript/src/agent.mjs";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.statusCode = 405;
    response.setHeader("Allow", "POST");
    return response.end("Method Not Allowed");
  }

  risk.reset();
  response.statusCode = 200;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  return response.end(
    JSON.stringify({
      success: true,
      message: "Risk circuit breaker and market cooldowns reset successfully.",
    })
  );
}
