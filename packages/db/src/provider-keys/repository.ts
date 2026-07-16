import { and, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { providerKeys } from "../schema";

// Narrow, driver-agnostic type so both node-postgres (app) and PGlite (tests)
// instances satisfy it without resorting to `any`.
export type Db = PgDatabase<PgQueryResultHKT>;

export type UpsertProviderKeyInput = {
  userId: string;
  provider: string;
  encryptedKey: string;
  keyHint: string;
};

export async function upsertProviderKey(db: Db, input: UpsertProviderKeyInput) {
  const [row] = await db
    .insert(providerKeys)
    .values(input)
    .onConflictDoUpdate({
      target: [providerKeys.userId, providerKeys.provider],
      set: {
        encryptedKey: input.encryptedKey,
        keyHint: input.keyHint,
        updatedAt: new Date(),
      },
    })
    .returning({
      id: providerKeys.id,
      provider: providerKeys.provider,
      keyHint: providerKeys.keyHint,
      createdAt: providerKeys.createdAt,
      updatedAt: providerKeys.updatedAt,
    });

  return row;
}

export async function listProviderKeyMeta(db: Db, userId: string) {
  return db
    .select({
      id: providerKeys.id,
      provider: providerKeys.provider,
      keyHint: providerKeys.keyHint,
      createdAt: providerKeys.createdAt,
      updatedAt: providerKeys.updatedAt,
    })
    .from(providerKeys)
    .where(eq(providerKeys.userId, userId));
}

/** Delete a user's key for a provider. Returns true when a row was removed. */
export async function deleteProviderKey(db: Db, userId: string, provider: string): Promise<boolean> {
  const rows = await db
    .delete(providerKeys)
    .where(and(eq(providerKeys.userId, userId), eq(providerKeys.provider, provider)))
    .returning({ id: providerKeys.id });
  return rows.length > 0;
}

/** Metadata only — never returns encryptedKey. */
export interface ProviderKeyMetaRecord {
  id: string;
  provider: string;
  keyHint: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/**
 * Persistence boundary for provider keys. Implemented by
 * {@link DrizzleProviderKeysRepository} for real Postgres and
 * {@link InMemoryProviderKeysRepository} for tests and local runs without a
 * database configured.
 */
export interface ProviderKeysRepository {
  /** Metadata only — never returns encryptedKey. */
  list(userId: string): Promise<ProviderKeyMetaRecord[]>;
  upsert(input: UpsertProviderKeyInput): Promise<ProviderKeyMetaRecord>;
  /** Revoke: removes the stored key. Returns false when nothing was saved. */
  delete(userId: string, provider: string): Promise<boolean>;
}

/** Drizzle/Postgres-backed repository used at runtime when DATABASE_URL is set. */
export class DrizzleProviderKeysRepository implements ProviderKeysRepository {
  constructor(private readonly db: Db) {}

  async list(userId: string): Promise<ProviderKeyMetaRecord[]> {
    return listProviderKeyMeta(this.db, userId);
  }

  async upsert(input: UpsertProviderKeyInput): Promise<ProviderKeyMetaRecord> {
    return upsertProviderKey(this.db, input);
  }

  async delete(userId: string, provider: string): Promise<boolean> {
    return deleteProviderKey(this.db, userId, provider);
  }
}

type ProviderKeyRow = UpsertProviderKeyInput & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * In-memory repository. Backs tests and local/e2e runs without a database.
 */
export class InMemoryProviderKeysRepository implements ProviderKeysRepository {
  private readonly rows = new Map<string, ProviderKeyRow>();

  private toMeta(row: ProviderKeyRow): ProviderKeyMetaRecord {
    return {
      id: row.id,
      provider: row.provider,
      keyHint: row.keyHint,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async list(userId: string): Promise<ProviderKeyMetaRecord[]> {
    return [...this.rows.values()]
      .filter((row) => row.userId === userId)
      .map((row) => this.toMeta(row));
  }

  async upsert(input: UpsertProviderKeyInput): Promise<ProviderKeyMetaRecord> {
    const key = `${input.userId}:${input.provider}`;
    const existing = this.rows.get(key);

    const row: ProviderKeyRow = existing
      ? {
          ...existing,
          encryptedKey: input.encryptedKey,
          keyHint: input.keyHint,
          updatedAt: new Date(),
        }
      : {
          ...input,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

    this.rows.set(key, row);
    return this.toMeta(row);
  }

  async delete(userId: string, provider: string): Promise<boolean> {
    return this.rows.delete(`${userId}:${provider}`);
  }
}
