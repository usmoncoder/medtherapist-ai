// Bazadan zaxira nusxa: node --env-file=.env scripts/backup.mjs [papka]
// Har bir kolleksiya alohida JSONL faylga yoziladi.
import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";

const outRoot = process.argv[2] || "./backups";
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const dir = path.join(outRoot, stamp);

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI yo'q");
  process.exit(1);
}

await mongoose.connect(uri);
await fs.mkdir(dir, { recursive: true });

const cols = await mongoose.connection.db.listCollections().toArray();
let total = 0;
const meta = { at: new Date().toISOString(), db: mongoose.connection.name, collections: {} };

for (const c of cols) {
  const docs = await mongoose.connection.collection(c.name).find({}).toArray();
  const file = path.join(dir, `${c.name}.jsonl`);
  await fs.writeFile(file, docs.map((d) => JSON.stringify(d)).join("\n") + (docs.length ? "\n" : ""));
  meta.collections[c.name] = docs.length;
  total += docs.length;
  console.log(`  ${c.name.padEnd(22)} ${String(docs.length).padStart(6)} hujjat`);
}

await fs.writeFile(path.join(dir, "_meta.json"), JSON.stringify(meta, null, 2));
console.log(`\nZaxira tayyor: ${dir}  (${total} hujjat, ${cols.length} kolleksiya)`);
console.log("Diqqat: fayllarda tibbiy ma'lumot bor — xavfsiz joyda saqlang.");
await mongoose.disconnect();
