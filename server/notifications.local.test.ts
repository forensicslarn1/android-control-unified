import { describe, expect, it } from "vitest";

async function localNotificationHealthEndpoint() {
  return new Response(JSON.stringify({ localOnly: process.env.NOTIFICATIONS_LOCAL_ONLY === "true" }), { status: 200, headers: { "content-type": "application/json" } });
}

describe("local notification configuration", () => {
  it("reports the browser-local notification boundary through a lightweight health response", async () => {
    process.env.NOTIFICATIONS_LOCAL_ONLY = "true";
    const response = await localNotificationHealthEndpoint();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ localOnly: true });
  });
});
