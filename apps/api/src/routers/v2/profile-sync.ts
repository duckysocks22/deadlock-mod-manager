import { profileSchema } from "@deadlock-mods/shared";
import { ProfileSyncRepository, db } from "@deadlock-mods/database";
import { ORPCError } from "@orpc/server";
import { logger } from "@/lib/logger";
import { generateJoinCode } from "../../lib/join-code";
import { MAX_SYNC_MEMBERS } from "../../validation/profile-sync";
import { publicProcedure } from "../../lib/orpc";
import {
  CreateSyncInputSchema,
  CreateSyncOutputSchema,
  GetSyncStateInputSchema,
  GetSyncStateOutputSchema,
  JoinSyncInputSchema,
  JoinSyncOutputSchema,
  PushRevisionInputSchema,
  PushRevisionOutputSchema,
} from "../../validation/profile-sync";

const profileSyncRepository = new ProfileSyncRepository(db);

export const profileSyncRouter = {
  createSync: publicProcedure
    .route({ method: "POST", path: "/v2/profile-sync" })
    .input(CreateSyncInputSchema)
    .output(CreateSyncOutputSchema)
    .handler(async ({ input }) => {
      const sync = await profileSyncRepository.create({
        ownerHardwareId: input.hardwareId,
        name: input.name,
        joinCode: generateJoinCode(),
        currentProfile: input.profile,
      });
      await profileSyncRepository.addMember({
        syncId: sync.id,
        hardwareId: input.hardwareId,
      });
      logger.withMetadata({ syncId: sync.id }).info("Profile sync created");
      return {
        id: sync.id,
        joinCode: sync.joinCode,
        latestRevision: sync.latestRevision,
      };
    }),

  joinSync: publicProcedure
    .route({ method: "POST", path: "/v2/profile-sync/{id}/join" })
    .input(JoinSyncInputSchema)
    .output(JoinSyncOutputSchema)
    .handler(async ({ input }) => {
      const sync = await profileSyncRepository.findByJoinCode(input.joinCode);
      if (!sync) {
        throw new ORPCError("NOT_FOUND");
      }
      if (await profileSyncRepository.isMember(sync.id, input.hardwareId)) {
        return { id: sync.id, status: "already-member" as const };
      }
      const memberCount = await profileSyncRepository.countMembers(sync.id);
      if (memberCount >= MAX_SYNC_MEMBERS) {
        throw new ORPCError("FORBIDDEN", {
          message: "This sync has reached its member limit",
        });
      }
      await profileSyncRepository.addMember({
        syncId: sync.id,
        hardwareId: input.hardwareId,
      });
      logger
        .withMetadata({ syncId: sync.id })
        .info("Member joined profile sync");
      return { id: sync.id, status: "joined" as const };
    }),

  getSyncState: publicProcedure
    .route({ method: "GET", path: "/v2/profile-sync/{id}" })
    .input(GetSyncStateInputSchema)
    .output(GetSyncStateOutputSchema)
    .handler(async ({ input }) => {
      const sync = await profileSyncRepository.findById(input.id);
      if (!sync) {
        throw new ORPCError("NOT_FOUND");
      }
      return {
        id: sync.id,
        name: sync.name,
        latestRevision: sync.latestRevision,
        updatedAt: sync.updatedAt,
        profile: sync.currentProfile
          ? profileSchema.parse(sync.currentProfile)
          : null,
      };
    }),

  pushRevision: publicProcedure
    .route({ method: "PUT", path: "/v2/profile-sync/{id}" })
    .input(PushRevisionInputSchema)
    .output(PushRevisionOutputSchema)
    .handler(async ({ input }) => {
      const sync = await profileSyncRepository.findById(input.id);
      if (!sync) {
        throw new ORPCError("NOT_FOUND");
      }
      if (sync.ownerHardwareId !== input.hardwareId) {
        throw new ORPCError("FORBIDDEN");
      }
      const updated = await profileSyncRepository.pushRevision(
        input.id,
        input.profile,
      );
      if (!updated) {
        throw new ORPCError("NOT_FOUND");
      }
      logger
        .withMetadata({ syncId: input.id, revision: updated.latestRevision })
        .info("Profile sync revision pushed");
      return { latestRevision: updated.latestRevision };
    }),
};
