import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Manual .env.local loader
const envPath = resolve(__dirname, "../.env.local");
const envLines = readFileSync(envPath, "utf-8").split("\n");
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
  if (!process.env[key]) process.env[key] = val;
}

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: { isAdmin: false, credits: { lt: 20000 } },
    data: { credits: 20000 },
  });
  console.log(`✅ ${result.count} usuário(s) atualizados para 400 créditos`);

  const users = await prisma.user.findMany({
    select: { email: true, credits: true, plan: true, isAdmin: true },
    orderBy: { createdAt: "desc" },
  });
  console.log("\nUsuários:");
  users.forEach(u =>
    console.log(`  ${u.email} — ${u.credits} cr — ${u.plan}${u.isAdmin ? " (admin)" : ""}`)
  );
}

main().catch(console.error).finally(() => prisma.$disconnect());
