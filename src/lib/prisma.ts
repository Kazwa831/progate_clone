import path from "node:path";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// .envの相対パス(file:../data/app.db)はPrisma CLI(migrate等)からは正しく解決されるが、
// Next.js(Turbopack)のランタイムでは実行コンテキストによって解決に失敗することがあるため、
// アプリのDB接続はprocess.cwd()基準の絶対パスを明示的に指定する。
const databaseUrl = `file:${path.join(process.cwd(), "data", "app.db")}`;

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: databaseUrl });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
