/*
 * Copies the zxing reader wasm out of node_modules into public/ so QR scanning
 * is served from our own origin instead of barcode-detector's default jsDelivr
 * CDN. This app is used in the field on flaky connections (and behind a strict
 * origin), so a third-party CDN fetch is not an acceptable dependency for a
 * core feature. Run from prebuild so it always matches the installed version.
 */
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const src = resolve("node_modules/zxing-wasm/dist/reader/zxing_reader.wasm");
const dest = resolve("public/zxing_reader.wasm");

if (!existsSync(src)) {
  console.error(`[copy-zxing-wasm] Expected wasm at ${src} but it wasn't there.`);
  process.exit(1);
}

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log("[copy-zxing-wasm] public/zxing_reader.wasm updated");
