import {
  index,
  integer,
  json,
  pgTable,
  text,
  unique,
} from "drizzle-orm/pg-core";
import { generateId, typeId } from "../extensions/typeid";
import { timestamps } from "./shared/timestamps";

export type ProfileSyncPayload = {
  version: string;
  payload: unknown;
};

export const profileSync = pgTable(
  "profile_sync",
  {
    id: typeId("id", "profile_sync")
      .primaryKey()
      .$defaultFn(() => generateId("profile_sync").toString()),
    ownerHardwareId: text("owner_hardware_id").notNull(),
    joinCode: text("join_code").notNull(),
    name: text("name").notNull(),
    latestRevision: integer("latest_revision").notNull().default(0),
    currentProfile: json("current_profile").$type<ProfileSyncPayload>(),
    ...timestamps,
  },
  (table) => [
    unique("profile_sync_join_code_key").on(table.joinCode),
    index("profile_sync_owner_idx").on(table.ownerHardwareId),
  ],
);

export const profileSyncMembers = pgTable(
  "profile_sync_member",
  {
    id: typeId("id", "profile_sync_member")
      .primaryKey()
      .$defaultFn(() => generateId("profile_sync_member").toString()),
    syncId: typeId("sync_id", "profile_sync")
      .notNull()
      .references(() => profileSync.id, { onDelete: "cascade" }),
    hardwareId: text("hardware_id").notNull(),
    ...timestamps,
  },
  (table) => [
    unique("profile_sync_member_unique").on(table.syncId, table.hardwareId),
    index("profile_sync_member_hardware_idx").on(table.hardwareId),
  ],
);

export type ProfileSync = typeof profileSync.$inferSelect;
export type NewProfileSync = typeof profileSync.$inferInsert;
export type ProfileSyncMember = typeof profileSyncMembers.$inferSelect;
export type NewProfileSyncMember = typeof profileSyncMembers.$inferInsert;
