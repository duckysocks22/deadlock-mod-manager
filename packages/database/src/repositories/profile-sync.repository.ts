import { and, count, eq } from "@deadlock-mods/database";
import type { Database } from "../client";
import type {
  NewProfileSync,
  NewProfileSyncMember,
  ProfileSync,
  ProfileSyncMember,
} from "../schema/profile-sync";
import { profileSync, profileSyncMembers } from "../schema/profile-sync";

export class ProfileSyncRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<ProfileSync | null> {
    const result = await this.db
      .select()
      .from(profileSync)
      .where(eq(profileSync.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async findByJoinCode(joinCode: string): Promise<ProfileSync | null> {
    const result = await this.db
      .select()
      .from(profileSync)
      .where(eq(profileSync.joinCode, joinCode))
      .limit(1);
    return result[0] ?? null;
  }

  async findByOwner(ownerHardwareId: string): Promise<ProfileSync[]> {
    return await this.db
      .select()
      .from(profileSync)
      .where(eq(profileSync.ownerHardwareId, ownerHardwareId));
  }

  async create(sync: NewProfileSync): Promise<ProfileSync> {
    const result = await this.db.insert(profileSync).values(sync).returning();
    return result[0];
  }

  async pushRevision(
    id: string,
    profile: { version: string; payload: unknown },
  ): Promise<ProfileSync | null> {
    const current = await this.findById(id);
    if (!current) return null;
    const result = await this.db
      .update(profileSync)
      .set({
        currentProfile: profile,
        latestRevision: current.latestRevision + 1,
        updatedAt: new Date(),
      })
      .where(eq(profileSync.id, id))
      .returning();
    return result[0];
  }

  async addMember(member: NewProfileSyncMember): Promise<ProfileSyncMember> {
    const result = await this.db
      .insert(profileSyncMembers)
      .values(member)
      .returning();
    return result[0];
  }

  async countMembers(syncId: string): Promise<number> {
    const result = await this.db
      .select({ value: count() })
      .from(profileSyncMembers)
      .where(eq(profileSyncMembers.syncId, syncId));
    return result[0]?.value ?? 0;
  }

  async isMember(syncId: string, hardwareId: string): Promise<boolean> {
    const result = await this.db
      .select({ id: profileSyncMembers.id })
      .from(profileSyncMembers)
      .where(
        and(
          eq(profileSyncMembers.syncId, syncId),
          eq(profileSyncMembers.hardwareId, hardwareId),
        ),
      )
      .limit(1);
    return result.length > 0;
  }
}
