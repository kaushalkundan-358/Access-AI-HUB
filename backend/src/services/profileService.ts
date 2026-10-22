import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { AppError } from "../middleware/errors";

interface ProfileInput {
  name: string;
  fontSize: string;
  contrastMode: string;
  preferredLanguage: string;
  readingPreferences: Record<string, unknown>;
}

const profileSelect = {
  id: true,
  name: true,
  fontSize: true,
  contrastMode: true,
  preferredLanguage: true,
  readingPreferences: true,
  createdAt: true,
  updatedAt: true
} as const;

export const profileService = {
  list(userId: string) {
    return prisma.accessibilityProfile.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: profileSelect
    });
  },

  create(userId: string, input: Partial<ProfileInput>) {
    return prisma.accessibilityProfile.create({
      data: {
        userId,
        name: input.name ?? "Default",
        fontSize: input.fontSize ?? "medium",
        contrastMode: input.contrastMode ?? "normal",
        preferredLanguage: input.preferredLanguage ?? "en",
        readingPreferences: (input.readingPreferences ?? {}) as Prisma.InputJsonValue
      },
      select: profileSelect
    });
  },

  async update(userId: string, id: string, input: Partial<ProfileInput>) {
    const data: Prisma.AccessibilityProfileUpdateManyMutationInput = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.fontSize !== undefined ? { fontSize: input.fontSize } : {}),
      ...(input.contrastMode !== undefined ? { contrastMode: input.contrastMode } : {}),
      ...(input.preferredLanguage !== undefined
        ? { preferredLanguage: input.preferredLanguage }
        : {}),
      ...(input.readingPreferences !== undefined
        ? { readingPreferences: input.readingPreferences as Prisma.InputJsonValue }
        : {})
    };
    const result = await prisma.accessibilityProfile.updateMany({
      where: { id, userId },
      data
    });
    if (result.count === 0) {
      throw new AppError(404, "Accessibility profile not found", "PROFILE_NOT_FOUND");
    }
    return prisma.accessibilityProfile.findFirstOrThrow({
      where: { id, userId },
      select: profileSelect
    });
  },

  async remove(userId: string, id: string): Promise<void> {
    const result = await prisma.accessibilityProfile.deleteMany({ where: { id, userId } });
    if (result.count === 0) {
      throw new AppError(404, "Accessibility profile not found", "PROFILE_NOT_FOUND");
    }
  }
};
