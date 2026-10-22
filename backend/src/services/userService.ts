import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { appConfig } from "../config/appConfig";
import { env } from "../config/env";
import { AppError } from "../middleware/errors";

const PASSWORD_HASH_ROUNDS = 12;

function createToken(user: { id: string; email: string }): string {
  const duration = appConfig.jwtExpiresIn;
  const value = Number.parseInt(duration, 10);
  const unit = duration.slice(-1);
  const seconds = value * ({ s: 1, m: 60, h: 3600, d: 86400 }[unit] ?? 0);
  return jwt.sign({ email: user.email }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: seconds
  });
}

export const userService = {
  async register(email: string, password: string) {
    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) {
      throw new AppError(409, "An account with this email already exists", "EMAIL_ALREADY_REGISTERED");
    }

    const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
    let user;
    try {
      user = await prisma.user.create({
        data: { email, passwordHash },
        select: { id: true, email: true, createdAt: true }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(409, "An account with this email already exists", "EMAIL_ALREADY_REGISTERED");
      }
      throw error;
    }
    return { user, accessToken: createToken(user) };
  },

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError(401, "Email or password is incorrect", "INVALID_CREDENTIALS");
    }

    return {
      user: { id: user.id, email: user.email, createdAt: user.createdAt },
      accessToken: createToken(user)
    };
  },

  async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, createdAt: true }
    });
    if (!user) throw new AppError(404, "User not found", "USER_NOT_FOUND");
    return user;
  },

  async syncSupabaseUser(id: string, email: string) {
    const normalizedEmail = email.toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, createdAt: true }
    });

    if (existingUser) {
      if (existingUser.email === normalizedEmail) return existingUser;
      try {
        return await prisma.user.update({
          where: { id },
          data: { email: normalizedEmail },
          select: { id: true, email: true, createdAt: true }
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new AppError(
            409,
            "This email is already associated with another account",
            "EMAIL_ALREADY_REGISTERED"
          );
        }
        throw error;
      }
    }

    try {
      return await prisma.user.create({
        data: { id, email: normalizedEmail, passwordHash: null },
        select: { id: true, email: true, createdAt: true }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const userCreatedByConcurrentRequest = await prisma.user.findUnique({
          where: { id },
          select: { id: true, email: true, createdAt: true }
        });
        if (userCreatedByConcurrentRequest?.email === normalizedEmail) {
          return userCreatedByConcurrentRequest;
        }
        throw new AppError(
          409,
          "This email is already associated with another account",
          "EMAIL_ALREADY_REGISTERED"
        );
      }
      throw error;
    }
  }
};
