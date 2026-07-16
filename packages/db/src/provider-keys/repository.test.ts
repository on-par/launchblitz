import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { providerKeys } from "../schema";
import type { Db } from "./repository";
import { InMemoryProviderKeysRepository, listProviderKeyMeta, upsertProviderKey } from "./repository";

const DRIZZLE_DIR = join(__dirname, "..", "..", "drizzle");

async function applyMigrations(client: PGlite) {
  const files = readdirSync(DRIZZLE_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(DRIZZLE_DIR, file), "utf8");
    const statements = sql.split("--> statement-breakpoint");
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed) {
        await client.exec(trimmed);
      }
    }
  }
}

describe("provider key repository", () => {
  let client: PGlite;
  let db: Db;

  beforeEach(async () => {
    client = new PGlite();
    await applyMigrations(client);
    db = drizzle(client);
  });

  afterEach(async () => {
    await client.close();
  });

  it("creates a row without an encryptedKey property in the return value", async () => {
    const row = await upsertProviderKey(db, {
      userId: "user-a",
      provider: "anthropic",
      encryptedKey: "v1.iv.tag.ciphertext",
      keyHint: "…abcd",
    });

    expect(row.keyHint).toBe("…abcd");
    expect(row).not.toHaveProperty("encryptedKey");
  });

  it("updates the existing row on a second upsert instead of adding one", async () => {
    await upsertProviderKey(db, {
      userId: "user-a",
      provider: "anthropic",
      encryptedKey: "v1.iv.tag.first",
      keyHint: "…aaaa",
    });

    const updated = await upsertProviderKey(db, {
      userId: "user-a",
      provider: "anthropic",
      encryptedKey: "v1.iv.tag.second",
      keyHint: "…bbbb",
    });

    expect(updated.keyHint).toBe("…bbbb");

    const rows = await db.select().from(providerKeys);
    expect(rows).toHaveLength(1);
    expect(rows[0].encryptedKey).toBe("v1.iv.tag.second");
  });

  it("scopes listProviderKeyMeta to the requesting user and never exposes encryptedKey", async () => {
    await upsertProviderKey(db, {
      userId: "user-a",
      provider: "anthropic",
      encryptedKey: "v1.iv.tag.user-a",
      keyHint: "…aaaa",
    });
    await upsertProviderKey(db, {
      userId: "user-b",
      provider: "anthropic",
      encryptedKey: "v1.iv.tag.user-b",
      keyHint: "…bbbb",
    });

    const userARows = await listProviderKeyMeta(db, "user-a");
    expect(userARows).toHaveLength(1);
    expect(userARows[0].keyHint).toBe("…aaaa");
    for (const row of userARows) {
      expect(row).not.toHaveProperty("encryptedKey");
    }

    const allRows = await db.select().from(providerKeys);
    expect(allRows).toHaveLength(2);
  });
});

describe("InMemoryProviderKeysRepository", () => {
  it("upsert inserts and returns metadata without encryptedKey", async () => {
    const repo = new InMemoryProviderKeysRepository();

    const row = await repo.upsert({
      userId: "user-a",
      provider: "anthropic",
      encryptedKey: "v1.iv.tag.first",
      keyHint: "…aaaa",
    });

    expect(row.keyHint).toBe("…aaaa");
    expect(row).not.toHaveProperty("encryptedKey");
  });

  it("upserting the same user+provider updates keyHint and bumps updatedAt instead of adding a row", async () => {
    const repo = new InMemoryProviderKeysRepository();

    const first = await repo.upsert({
      userId: "user-a",
      provider: "anthropic",
      encryptedKey: "v1.iv.tag.first",
      keyHint: "…aaaa",
    });

    const updated = await repo.upsert({
      userId: "user-a",
      provider: "anthropic",
      encryptedKey: "v1.iv.tag.second",
      keyHint: "…bbbb",
    });

    expect(updated.id).toBe(first.id);
    expect(updated.keyHint).toBe("…bbbb");
    expect(updated.updatedAt?.getTime()).toBeGreaterThanOrEqual(first.updatedAt?.getTime() ?? 0);

    const rows = await repo.list("user-a");
    expect(rows).toHaveLength(1);
    expect(rows[0].keyHint).toBe("…bbbb");
  });

  it("scopes list to the requesting user", async () => {
    const repo = new InMemoryProviderKeysRepository();

    await repo.upsert({
      userId: "user-a",
      provider: "anthropic",
      encryptedKey: "v1.iv.tag.user-a",
      keyHint: "…aaaa",
    });
    await repo.upsert({
      userId: "user-b",
      provider: "anthropic",
      encryptedKey: "v1.iv.tag.user-b",
      keyHint: "…bbbb",
    });

    const userARows = await repo.list("user-a");
    expect(userARows).toHaveLength(1);
    expect(userARows[0].keyHint).toBe("…aaaa");
    for (const row of userARows) {
      expect(row).not.toHaveProperty("encryptedKey");
    }
  });
});
