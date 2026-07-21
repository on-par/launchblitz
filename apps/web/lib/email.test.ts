import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn().mockResolvedValue({ data: { id: "email-1" }, error: null });

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

const globalStore = globalThis as typeof globalThis & {
  __launchblitzEmailSender?: unknown;
};

describe("isEmailConfigured", () => {
  const originalKey = process.env.RESEND_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = originalKey;
    }
  });

  it("is true when RESEND_API_KEY is set", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const { isEmailConfigured } = await import("./email");
    expect(isEmailConfigured()).toBe(true);
  });

  it("is false when RESEND_API_KEY is unset", async () => {
    delete process.env.RESEND_API_KEY;
    const { isEmailConfigured } = await import("./email");
    expect(isEmailConfigured()).toBe(false);
  });
});

describe("getEmailSender", () => {
  const originalKey = process.env.RESEND_API_KEY;

  beforeEach(() => {
    delete globalStore.__launchblitzEmailSender;
    sendMock.mockClear();
  });

  afterEach(() => {
    delete globalStore.__launchblitzEmailSender;
    if (originalKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = originalKey;
    }
  });

  it("resolves the Noop sender when unconfigured — resolves without throwing", async () => {
    delete process.env.RESEND_API_KEY;
    const { getEmailSender } = await import("./email");

    await expect(getEmailSender().sendWaitlistConfirmation("founder@example.com")).resolves.toBeUndefined();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("resolves the Resend sender when configured, calling resend.emails.send", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const { getEmailSender } = await import("./email");

    await getEmailSender().sendWaitlistConfirmation("founder@example.com");

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "founder@example.com",
        from: "LaunchBlitz <onboarding@resend.dev>",
      }),
    );
  });

  it("throws when Resend resolves with an API-level error, instead of silently succeeding", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    sendMock.mockResolvedValueOnce({
      data: null,
      error: { message: "domain not verified", statusCode: 403, name: "validation_error" },
    });
    const { getEmailSender } = await import("./email");

    await expect(getEmailSender().sendWaitlistConfirmation("founder@example.com")).rejects.toThrow(
      "domain not verified",
    );
  });
});
