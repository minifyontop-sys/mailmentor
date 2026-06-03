import "server-only";
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __mailmentorPrisma: PrismaClient | undefined;
}

export const prisma =
  global.__mailmentorPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__mailmentorPrisma = prisma;
}
