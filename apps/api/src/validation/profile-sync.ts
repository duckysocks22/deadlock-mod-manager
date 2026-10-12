import { profileSchema } from "@deadlock-mods/shared";
import { z } from "zod";
import { JOIN_CODE_ALPHABET } from "../lib/join-code";

export const MAX_SYNC_MODS = 200;
export const MAX_SYNC_MEMBERS = 50;

const boundedHardwareId = z.string().min(1).max(128);
const joinCodeSchema = z
  .string()
  .length(8)
  .regex(
    new RegExp(`^[${JOIN_CODE_ALPHABET}]+$`),
    "join code must be 8 characters from the sync code alphabet",
  );

const boundedProfileSchema = profileSchema.refine(
  (profile) => profile.payload.mods.length <= MAX_SYNC_MODS,
  { message: `sync profile cannot exceed ${MAX_SYNC_MODS} mods` },
);

export const CreateSyncInputSchema = z.object({
  hardwareId: boundedHardwareId,
  name: z.string().min(1).max(100),
  profile: boundedProfileSchema,
});

export const CreateSyncOutputSchema = z.object({
  id: z.string(),
  joinCode: z.string(),
  latestRevision: z.number(),
});

export const JoinSyncInputSchema = z.object({
  joinCode: joinCodeSchema,
  hardwareId: boundedHardwareId,
});

export const JoinSyncOutputSchema = z.object({
  id: z.string(),
  status: z.enum(["joined", "already-member"]),
});

export const GetSyncStateInputSchema = z.object({
  id: z.string(),
});

export const GetSyncStateOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  latestRevision: z.number(),
  updatedAt: z.date().nullable(),
  profile: profileSchema.nullable(),
});

export const PushRevisionInputSchema = z.object({
  id: z.string(),
  hardwareId: boundedHardwareId,
  profile: boundedProfileSchema,
});

export const PushRevisionOutputSchema = z.object({
  latestRevision: z.number(),
});
