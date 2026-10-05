import { createInsertSchema } from "drizzle-zod";
import { pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export type EmailProvider = "google" | "microsoft";

export const emailConnectionsTable = pgTable(
  "email_connections",
  {
    userId: text("user_id").notNull(),
    provider: text("provider").$type<EmailProvider>().notNull(),
    email: text("email").notNull(),
    encryptedRefreshToken: text("encrypted_refresh_token").notNull(),
    scopes: text("scopes").array().notNull(),
    connectedAt: timestamp("connected_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [primaryKey({ columns: [table.userId, table.provider] })],
);

export const insertEmailConnectionSchema = createInsertSchema(
  emailConnectionsTable,
).omit({ connectedAt: true, updatedAt: true });

export type EmailConnection = typeof emailConnectionsTable.$inferSelect;
export type InsertEmailConnection = z.infer<typeof insertEmailConnectionSchema>;

export const emailOAuthTransactionsTable = pgTable("email_oauth_transactions", {
  stateHash: text("state_hash").primaryKey(),
  userId: text("user_id").notNull(),
  provider: text("provider").$type<EmailProvider>().notNull(),
  codeVerifier: text("code_verifier").notNull(),
  redirectUri: text("redirect_uri").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
