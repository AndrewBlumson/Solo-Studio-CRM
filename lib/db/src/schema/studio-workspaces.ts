import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const studioWorkspacesTable = pgTable("studio_workspaces", {
  userId: text("user_id").primaryKey(),
  state: jsonb("state").$type<Record<string, unknown>>().notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type StudioWorkspace = typeof studioWorkspacesTable.$inferSelect;