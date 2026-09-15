import { PrismaClient } from "@prisma/client";

// Next dev server hot-reloads modules; without this we leak a connection pool
// on every reload and eventually exhaust the database.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
