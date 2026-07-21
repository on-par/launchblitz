import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getEmailSender } from "../../../lib/email";

// Isolate the route from real email sending. Persistence uses the real
// in-memory repository (no DATABASE_URL in tests).
vi.mock("../../../lib/email", () => ({
  getEmailSender: vi.fn(),
}));

const mockedGetEmailSender = vi.mocked(getEmailSender);

// The route resolves the real in-memory waitlist repository (a globalThis
// singleton, same pattern as apps/web/lib/builds.ts), so reset it between
// tests to keep each case's email lookups isolated.
const globalStore = globalThis as typeof globalThis & {
  __launchblitzWaitlistSignupsRepo?: unknown;
};

function post(body: unknown) {
  return POST(
    new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function mockEmailSender() {
  const sendWaitlistConfirmation = vi.fn().mockResolvedValue(undefined);
  mockedGetEmailSender.mockReturnValue({ sendWaitlistConfirmation });
  return sendWaitlistConfirmation;
}

beforeEach(() => {
  mockedGetEmailSender.mockReset();
  delete globalStore.__launchblitzWaitlistSignupsRepo;
});

describe("waitlist route", () => {
  it("POST with a valid email returns 200 ok and sends the confirmation email once", async () => {
    const sendWaitlistConfirmation = mockEmailSender();

    const response = await post({ email: "founder@example.com" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(sendWaitlistConfirmation).toHaveBeenCalledTimes(1);
    expect(sendWaitlistConfirmation).toHaveBeenCalledWith("founder@example.com");
  });

  it("POST with an invalid email shape returns 400 and does not send an email", async () => {
    const sendWaitlistConfirmation = mockEmailSender();

    const response = await post({ email: "not-an-email" });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_email" });
    expect(sendWaitlistConfirmation).not.toHaveBeenCalled();
  });

  it("POST with an empty body / malformed JSON returns 400", async () => {
    mockEmailSender();

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_email" });
  });

  it("POST with an unknown field alongside a valid email returns 400", async () => {
    mockEmailSender();

    const response = await post({ email: "founder@example.com", admin: true });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_email" });
  });

  it("POST with the same email twice is idempotent — 200 both times, confirmation sent only once", async () => {
    const sendWaitlistConfirmation = mockEmailSender();

    const first = await post({ email: "repeat@example.com" });
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ status: "ok" });

    const second = await post({ email: "repeat@example.com" });
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ status: "ok" });

    expect(sendWaitlistConfirmation).toHaveBeenCalledTimes(1);
  });
});
