// Zaxiradan tiklash: node --env-file=.env scripts/restore.mjs ./backups/<papka> [--wipe]
// --wipe berilsa, kolleksiya avval tozalanadi. Berilmasa, mavjud hujjatlar ustiga yoziladi.
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import mongoose from "mongoose";

const dir = process.argv[2];
const wipe = process.argv.includes("--wipe");
if (!dir) {
  console.error("Foydalanish: node --env-file=.env scripts/restore.mjs ./backups/<papka> [--wipe]");
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
await mongoose.connect(uri);

const meta = JSON.parse(await fs.readFile(path.join(dir, "_meta.json"), "utf8"));
console.log(`Zaxira: ${meta.at}  baza: ${meta.db}`);
console.log(`Tiklanadigan baza: ${mongoose.connection.name}`);
if (wipe) console.log("DIQQAT: --wipe — mavjud hujjatlar o'chiriladi!");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const answer = await rl.question("Davom etilsinmi? (ha/yo'q) ");
rl.close();
if (!["ha", "yes", "y"].includes(answer.trim().toLowerCase())) {
  console.log("Bekor qilindi.");
  process.exit(0);
}

const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".jsonl"));
let total = 0;
for (const f of files) {
  const name = f.replace(/\.jsonl$/, "");
  const raw = await fs.readFile(path.join(dir, f), "utf8");
  const docs = raw.split("\n").filter(Boolean).map((l) => JSON.parse(l, reviver));
  const col = mongoose.connection.collection(name);
  if (wipe) await col.deleteMany({});
  if (docs.length) {
    const ops = docs.map((d) => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } }));
    await col.bulkWrite(ops, { ordered: false });
  }
  total += docs.length;
  console.log(`  ${name.padEnd(22)} ${String(docs.length).padStart(6)} hujjat`);
}

console.log(`\nTiklandi: ${total} hujjat`);
await mongoose.disconnect();

// JSON ichidagi ObjectId va Date qiymatlarini qayta tiklaymiz
function reviver(key, value) {
  if (value && typeof value === "object") {
    if (value.$oid) return new mongoose.Types.ObjectId(value.$oid);
    if (value.$date) return new Date(value.$date);
  }
  if (key === "_id" && typeof value === "string" && /^[0-9a-f]{24}$/.test(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return new Date(value);
  }
  return value;
}
