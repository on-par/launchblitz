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

export const stageOutputs = pgTable(
  "stage_outputs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    buildId: uuid("build_id").references(() => builds.id),
    stageIndex: integer("stage_index").notNull(),
    stageName: text("stage_name").notNull(),
    rawOutput: jsonb("raw_output"),
    editedOutput: jsonb("edited_output"),
    approvedAt: timestamp("approved_at"),
    provider: text("provider"),
    model: text("model"),
    status: text("status").notNull(),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [uniqueIndex("stage_outputs_build_stage_idx").on(t.buildId, t.stageIndex)],
);

export const providerKeys = pgTable("provider_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(),
  encryptedKey: text("encrypted_key").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
