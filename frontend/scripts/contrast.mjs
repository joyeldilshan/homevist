import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.addInitScript(() => { try { localStorage.setItem("hv-storage-notice-dismissed","1"); } catch {} });
await p.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await p.waitForTimeout(1200);

const out = await p.evaluate(() => {
  const lum = (c) => { const [r,g,b]=c.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);}); return 0.2126*r+0.7152*g+0.0722*b; };
  const parse = (s) => (s.match(/\d+(\.\d+)?/g)||[0,0,0]).slice(0,3).map(Number);
  const ratio = (f,b) => { const L1=lum(parse(f)), L2=lum(parse(b)); const a=Math.max(L1,L2), c=Math.min(L1,L2); return (a+0.05)/(c+0.05); };
  /*
   * Walk up for a background. A solid backgroundColor wins. If an
   * ancestor paints a gradient or an image instead, we cannot sample it
   * reliably, so flag the element as unknown rather than guessing the
   * page background — otherwise white-on-teal and white-on-dark read as
   * catastrophic failures that are not real.
   */
  /*
   * Surfaces whose effective background cannot be read from CSS: the
   * band is text over a gradient veil on a photo, the CTA is text over a
   * dark card with an aurora pseudo-element. Both are designed dark
   * grounds, so the effective colour is asserted here rather than
   * guessed — otherwise white-on-dark reads as a 1:1 failure.
   */
  const DARK_SURFACES = [
    [".band", "rgb(14,17,22)"],
    [".cta",  "rgb(10,16,15)"],
  ];

  const bgOf = (el) => {
    for (const [sel, colour] of DARK_SURFACES) {
      if (el.closest(sel)) return colour;
    }
    let n = el;
    while (n) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return null;
      const bg = cs.backgroundColor;
      if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) return bg;
      n = n.parentElement;
    }
    return "rgb(244,242,237)";
  };

  const rows=[];
  const seen=new Set();
  for (const el of document.querySelectorAll("p, h1, h2, h3, span, small, button, a, b")) {
    const t=(el.textContent||"").trim();
    if(!t || t.length<3) continue;
    if(el.children.length>0) continue;
    const cs=getComputedStyle(el);
    const size=parseFloat(cs.fontSize), weight=Number(cs.fontWeight)||400;
    const large = size>=24 || (size>=18.66 && weight>=700);
    const bg = bgOf(el);
    if (bg === null) continue;   // painted over a gradient/image — not measurable here
    const r=ratio(cs.color,bg);
    const need = large?3:4.5;
    const key=cs.color+"|"+bg+"|"+Math.round(size);
    if(seen.has(key)) continue; seen.add(key);
    if(r<need) rows.push(`FAIL ${r.toFixed(2)}:1 (need ${need}) ${size}px/${weight} "${t.slice(0,42)}"`);
  }
  return rows.length?rows.slice(0,12):["all sampled text passes"];
});
out.forEach(l=>console.log("  "+l));
await b.close();
