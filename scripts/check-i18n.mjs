// Uch tildagi tarjima kalitlari to'liqligini tekshiradi.
// CI da ishlaydi: bitta tilda kalit yetishmasa build yiqiladi.
import { DICT, LANGS } from "../src/lib/i18n/dictionary.js";

const base = Object.keys(DICT.uz);
let failed = false;

console.log(`Asos (uz): ${base.length} ta kalit`);

for (const { code } of LANGS) {
  if (code === "uz") continue;
  const missing = base.filter((k) => !(k in DICT[code]));
  const extra = Object.keys(DICT[code]).filter((k) => !base.includes(k));
  const empty = base.filter((k) => DICT[code][k] === "");

  if (missing.length || extra.length || empty.length) {
    failed = true;
    console.error(`\n✗ ${code}:`);
    if (missing.length) console.error(`  yetishmaydi (${missing.length}): ${missing.slice(0, 15).join(", ")}`);
    if (extra.length) console.error(`  ortiqcha (${extra.length}): ${extra.slice(0, 15).join(", ")}`);
    if (empty.length) console.error(`  bo'sh (${empty.length}): ${empty.slice(0, 15).join(", ")}`);
  } else {
    console.log(`✓ ${code}: to'liq`);
  }
}

if (failed) {
  console.error("\nTarjima kalitlari to'liq emas.");
  process.exit(1);
}
console.log("\nBarcha tillar to'liq.");
