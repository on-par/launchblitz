import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSession } from "../../../lib/auth";
import { getProviderKeysRepository } from "../../../lib/provider-keys";

vi.mock("../../../lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("../../../lib/provider-keys", () => ({
  getProviderKeysRepository: vi.fn(),
}));

const { GET, PUT } = await import("./route");

const mockedGetSession = vi.mocked(getSession);
const mockedGetProviderKeysRepository = vi.mocked(getProviderKeysRepository);
const mockedUpsert = vi.fn();
const mockedList = vi.fn();

function putRequest(body: unknown) {
  return new Request("http://localhost/api/keys", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

describe("/api/keys", () => {
  beforeEach(() => {
    process.env.PROVIDER_KEY_ENCRYPTION_KEY = "test-secret";
    mockedGetSession.mockReset();
    mockedGetProviderKeysRepository.mockReset();
    mockedUpsert.mockReset();
    mockedList.mockReset();
    mockedList.mockResolvedValue([]);
    mockedGetProviderKeysRepository.mockReturnValue({ list: mockedList, upsert: mockedUpsert });
  });

  afterEach(() => {
    delete process.env.PROVIDER_KEY_ENCRYPTION_KEY;
  });

  describe("GET", () => {
    it("returns 401 when there is no session, without calling the repository", async () => {
      mockedGetSession.mockResolvedValue(null);

      const res = await GET();

      expect(res.status).toBe(401);
      expect(mockedList).not.toHaveBeenCalled();
    });

    it("returns 200 listing anthropic with saved status and never exposes encryptedKey", async () => {
      mockedGetSession.mockResolvedValue({ userId: "user-1" });
      mockedList.mockResolvedValue([
        {
          id: "row-1",
          provider: "anthropic",
          keyHint: "…abcd",
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-02"),
        },
      ]);

      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.providers).toContainEqual(
        expect.objectContaining({ provider: "anthropic", saved: true, keyHint: "…abcd" }),
      );
      expect(JSON.stringify(body)).not.toContain("encryptedKey");
    });
  });

  describe("PUT", () => {
    it("returns 401 when there is no session, without calling upsert", async () => {
      mockedGetSession.mockResolvedValue(null);

      const res = await PUT(putRequest({ provider: "anthropic", key: "sk-ant-valid-key-123" }));

      expect(res.status).toBe(401);
      expect(mockedUpsert).not.toHaveBeenCalled();
    });

    it("saves a valid key, scoping to the session's userId and never leaking plaintext", async () => {
      mockedGetSession.mockResolvedValue({ userId: "user-1" });
      mockedUpsert.mockResolvedValue({
        id: "row-1",
        provider: "anthropic",
        keyHint: "…-123",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-02"),
      });

      const plaintext = "sk-ant-valid-key-123";
      const res = await PUT(putRequest({ provider: "anthropic", key: plaintext }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(mockedUpsert).toHaveBeenCalledTimes(1);
      const call = mockedUpsert.mock.calls[0][0];
      expect(call.userId).toBe("user-1");
      expect(call.encryptedKey).not.toBe(plaintext);
      expect(call.encryptedKey).not.toContain(plaintext);

      const stringified = JSON.stringify(body);
      expect(stringified).not.toContain(plaintext);
      expect(body.keyHint.length).toBeLessThanOrEqual(5);
    });

    it("returns 400 for an unsupported provider without echoing the key", async () => {
      mockedGetSession.mockResolvedValue({ userId: "user-1" });

      const plaintext = "sk-openai-valid-key-123";
      const res = await PUT(putRequest({ provider: "openai", key: plaintext }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).not.toContain(plaintext);
      expect(mockedUpsert).not.toHaveBeenCalled();
    });

    it("returns 400 for a key shorter than 8 characters", async () => {
      mockedGetSession.mockResolvedValue({ userId: "user-1" });

      const res = await PUT(putRequest({ provider: "anthropic", key: "short" }));

      expect(res.status).toBe(400);
      expect(mockedUpsert).not.toHaveBeenCalled();
    });

    it("returns 500 with a generic message when the encryption secret is unset", async () => {
      delete process.env.PROVIDER_KEY_ENCRYPTION_KEY;
      mockedGetSession.mockResolvedValue({ userId: "user-1" });

      const res = await PUT(putRequest({ provider: "anthropic", key: "sk-ant-valid-key-123" }));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Key vault is not configured.");
      expect(mockedUpsert).not.toHaveBeenCalled();
    });

    it("returns 400 for an invalid JSON body", async () => {
      mockedGetSession.mockResolvedValue({ userId: "user-1" });

      const res = await PUT(new Request("http://localhost/api/keys", { method: "PUT", body: "not-json" }));

      expect(res.status).toBe(400);
      expect(mockedUpsert).not.toHaveBeenCalled();
    });
  });
});
