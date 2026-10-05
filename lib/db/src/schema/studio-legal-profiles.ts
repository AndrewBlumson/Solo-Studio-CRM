import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const studioLegalProfilesTable = pgTable("studio_legal_profiles", {
  profileKey: text("profile_key").primaryKey(),
  registeredName: text("registered_name").notNull().default(""),
  tradingName: text("trading_name").notNull().default(""),
  country: text("country").notNull().default(""),
  registeredAddress: text("registered_address").notNull().default(""),
  privacyEmail: text("privacy_email").notNull().default(""),
  website: text("website").notNull().default(""),
  ownerUserId: text("owner_user_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type StudioLegalProfile =
  typeof studioLegalProfilesTable.$inferSelect;
