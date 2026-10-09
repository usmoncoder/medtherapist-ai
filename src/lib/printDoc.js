"use client";

/** HTML'ga qo'yiladigan har qanday matn — bemor ismi, shikoyat, izoh — ekranlanadi */
export const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const SHEET = `
  @page { margin: 16mm 14mm; }
  *{box-sizing:border-box;margin:0;padding:0}
  body{
    font:13px/1.55 -apple-system,'Segoe UI',Roboto,Arial,sans-serif;
    color:#15132A;background:#fff;padding:0 2mm;
  }
  h1{font-size:19px;letter-spacing:-.3px}
  h2{font-size:13px;text-transform:uppercase;letter-spacing:.6px;color:#6C3BFF;
     margin:18px 0 8px;padding-bottom:5px;border-bottom:1px solid #E6E3F2}
  .doc-head{display:flex;justify-content:space-between;align-items:flex-start;
     gap:16px;padding-bottom:12px;border-bottom:2px solid #6C3BFF}
  .doc-head .meta{text-align:right;font-size:11px;color:#6B6880;white-space:nowrap}
  .brand{font-size:12px;font-weight:700;color:#6C3BFF;letter-spacing:.4px}
  .sub{color:#6B6880;font-size:12px;margin-top:3px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;margin-top:4px}
  .cell{border:1px solid #E6E3F2;border-radius:7px;padding:7px 10px}
  .cell span{display:block;font-size:10px;text-transform:uppercase;
     letter-spacing:.4px;color:#6B6880;margin-bottom:2px}
  .cell b{font-weight:600;font-size:12.5px}
  p.text{margin:5px 0;white-space:pre-wrap}
  table{width:100%;border-collapse:collapse;margin-top:4px;font-size:12px}
  th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #E6E3F2;vertical-align:top}
  th{font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#6B6880}
  .muted{color:#6B6880}
  .block{break-inside:avoid;page-break-inside:avoid;margin-bottom:10px}
  footer{margin-top:20px;padding-top:8px;border-top:1px solid #E6E3F2;
     font-size:10.5px;color:#6B6880;display:flex;justify-content:space-between;gap:12px}
`;

/**
 * Toza, chop etishga mo'ljallangan hujjatni yasab, brauzerning chop etish
 * oynasini ochadi. U yerdan "PDF sifatida saqlash"ni tanlash mumkin —
 * fayl nomi hujjat sarlavhasidan olinadi.
 *
 * Avval yashirin <iframe> bilan urinamiz (sahifadan chiqib ketilmaydi);
 * brauzer ruxsat bermasa, alohida oynada ochamiz.
 */
export function printDocument({ title, html }) {
  const doc = `<!doctype html><html lang="uz"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><style>${SHEET}</style></head><body>${html}</body></html>`;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  frame.srcdoc = doc;

  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    setTimeout(() => frame.remove(), 1000);
  };

  frame.onload = () => {
    const win = frame.contentWindow;
    try {
      win.focus();
      win.onafterprint = cleanup;
      win.print();
      // onafterprint'ni qo'llamaydigan brauzerlar uchun zaxira tozalash
      setTimeout(cleanup, 60_000);
    } catch {
      frame.remove();
      openInWindow(doc);
    }
  };

  document.body.appendChild(frame);
}

function openInWindow(doc) {
  const win = window.open("", "_blank");
  if (!win) return; // oyna bloklandi — foydalanuvchi oddiy "Chop etish"dan foydalanadi
  win.document.open();
  win.document.write(doc);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
}

/** Bo'lim: sarlavha + mazmun. Mazmun bo'sh bo'lsa bo'lim umuman chizilmaydi. */
export const section = (title, inner) =>
  inner ? `<section class="block"><h2>${esc(title)}</h2>${inner}</section>` : "";

/** Nom–qiymat katakchalari to'ri */
export const cells = (pairs) =>
  `<div class="grid">${pairs
    .map(([label, value]) => `<div class="cell"><span>${esc(label)}</span><b>${esc(value)}</b></div>`)
    .join("")}</div>`;
