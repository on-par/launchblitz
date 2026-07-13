import { eq } from "drizzle-orm";
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
