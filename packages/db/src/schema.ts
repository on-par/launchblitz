import { integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const builds = pgTable("builds", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  status: text("status").notNull(),
  currentStage: integer("current_stage").default(0),
  seedIdea: text("seed_idea"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const stageOutputs = pgTable("stage_outputs", {
  id: uuid("id").primaryKey().defaultRandom(),
  buildId: uuid("build_id").references(() => builds.id),
  stageIndex: integer("stage_index").notNull(),
  stageName: text("stage_name").notNull(),
  rawOutput: jsonb("raw_output"),
  editedOutput: jsonb("edited_output"),
  approvedAt: timestamp("approved_at"),
});

export const artifactRevisions = pgTable(
  "artifact_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    buildId: uuid("build_id").references(() => builds.id),
    revisionNumber: integer("revision_number").notNull(),
    editRequest: text("edit_request"),
    artifact: jsonb("artifact").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [uniqueIndex("artifact_revisions_build_revision_unique").on(t.buildId, t.revisionNumber)],
);

export const waitlistSignups = pgTable(
  "waitlist_signups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [uniqueIndex("waitlist_signups_email_unique").on(t.email)],
);

export const providerKeys = pgTable(
  "provider_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    provider: text("provider").notNull(),
    encryptedKey: text("encrypted_key").notNull(),
    keyHint: text("key_hint").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [uniqueIndex("provider_keys_user_id_provider_unique").on(t.userId, t.provider)],
);
