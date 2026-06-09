/**
 * generate-assets.mjs
 * Generates app icon and splash screen source files for @capacitor/assets.
 *
 * Source files:
 *   ../../logos/appicon.jpeg   → resources/icon.png (1024x1024)
 *   ../../logos/symbol.png     → resources/icon-foreground.png (1024x1024, padded)
 *   ../../logos/symbol.png     → composite into splash
 *   ../../logos/name.png       → composite into splash (dark)
 */

import sharp from "sharp";
import { readFileSync } from "fs";
import { mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LOGOS = join(__dirname, "..", "..", "logos");

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

ensureDir(join(ROOT, "resources"));

// ── 1. App icon: appicon.jpeg → resources/icon.png (1024x1024) ─────────────
console.log("Generating icon.png ...");
await sharp(join(LOGOS, "appicon.jpeg"))
  .resize(1024, 1024, { fit: "cover" })
  .png()
  .toFile(join(ROOT, "resources", "icon.png"));
console.log("  ✓ resources/icon.png");

// ── 2. Adaptive icon foreground: symbol.png centred on transparent 1024px ──
//    (symbol at 70% of canvas, centred, rest transparent)
console.log("Generating icon-foreground.png ...");
const ICON_SIZE = 1024;
const SYMBOL_SIZE = Math.round(ICON_SIZE * 0.65); // 665px

const symbolResized = await sharp(join(LOGOS, "symbol.png"))
  .resize(SYMBOL_SIZE, SYMBOL_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

const offset = Math.round((ICON_SIZE - SYMBOL_SIZE) / 2);
await sharp({
  create: { width: ICON_SIZE, height: ICON_SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([{ input: symbolResized, left: offset, top: offset }])
  .png()
  .toFile(join(ROOT, "resources", "icon-foreground.png"));
console.log("  ✓ resources/icon-foreground.png");

// ── 3. Adaptive icon background: dark solid color ───────────────────────────
console.log("Generating icon-background.png ...");
await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: { r: 8, g: 12, b: 21, alpha: 1 } },
})
  .png()
  .toFile(join(ROOT, "resources", "icon-background.png"));
console.log("  ✓ resources/icon-background.png");

// ── 4. Splash screen (dark): dark bg + symbol (top-center) + name (below) ───
//    Canvas: 2732x2732. Logo centred vertically in the middle third.
console.log("Generating splash.png (dark) ...");
const SPLASH = 2732;

// Symbol: 480px wide (proportional height)
const symbolMeta = await sharp(join(LOGOS, "symbol.png")).metadata();
const symRatio = symbolMeta.height / symbolMeta.width;
const SYM_W = 480;
const SYM_H = Math.round(SYM_W * symRatio);

const symbolBuf = await sharp(join(LOGOS, "symbol.png"))
  .resize(SYM_W, SYM_H, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

// Name (dark theme): 600px wide
const nameMeta = await sharp(join(LOGOS, "name.png")).metadata();
const nameRatio = nameMeta.height / nameMeta.width;
const NAME_W = 600;
const NAME_H = Math.round(NAME_W * nameRatio);

const nameBuf = await sharp(join(LOGOS, "name.png"))
  .resize(NAME_W, NAME_H, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

// Vertical layout: symbol, 48px gap, name — centred vertically
const GAP = 48;
const TOTAL_H = SYM_H + GAP + NAME_H;
const TOP = Math.round((SPLASH - TOTAL_H) / 2);

const symLeft = Math.round((SPLASH - SYM_W) / 2);
const symTop = TOP;
const nameLeft = Math.round((SPLASH - NAME_W) / 2);
const nameTop = TOP + SYM_H + GAP;

await sharp({
  create: { width: SPLASH, height: SPLASH, channels: 4, background: { r: 8, g: 12, b: 21, alpha: 1 } },
})
  .composite([
    { input: symbolBuf, left: symLeft, top: symTop },
    { input: nameBuf, left: nameLeft, top: nameTop },
  ])
  .png()
  .toFile(join(ROOT, "resources", "splash.png"));
console.log("  ✓ resources/splash.png");

// Reuse dark splash as light splash (design is dark-themed)
await sharp(join(ROOT, "resources", "splash.png"))
  .png()
  .toFile(join(ROOT, "resources", "splash-dark.png"));
console.log("  ✓ resources/splash-dark.png");

console.log("\nAll source assets generated. Run: npx @capacitor/assets generate --android");
