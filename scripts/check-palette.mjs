/**
 * The dark palette is maintained in two places, and nothing used to enforce that.
 *
 * `.dark` remaps Tailwind's palette variables for the dark theme.
 * `@media print { .dark { ... } }` restores stock light values, because printing a
 * work order in dark mode would otherwise emit a black page.
 *
 * Every variable added to the first must be added to the second. Miss it and the
 * defect appears only on paper — the least likely place anyone looks. This turns
 * "remember to mirror it" into a check that runs.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "src/app/globals.css"), "utf8");

/** Body of the Nth `.dark {` block, by brace matching rather than a greedy regex. */
function darkBlock(source, index) {
  let from = -1;
  for (let i = 0; i <= index; i++) {
    from = source.indexOf(".dark {", from + 1);
    if (from === -1) return null;
  }
  const open = source.indexOf("{", from);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) return source.slice(open + 1, i);
  }
  return null;
}

const vars = (block) => new Set(block.match(/--[\w-]+(?=\s*:)/g) ?? []);

const screen = darkBlock(css, 0);
const print = darkBlock(css, 1);

if (!screen || !print) {
  console.error("check-palette: expected two `.dark` blocks in globals.css, found fewer.");
  console.error("If the stylesheet was restructured, update this check to match.");
  process.exit(1);
}

const onScreen = vars(screen);
const onPrint = vars(print);
const missingFromPrint = [...onScreen].filter((v) => !onPrint.has(v));
const missingFromScreen = [...onPrint].filter((v) => !onScreen.has(v));

if (missingFromPrint.length || missingFromScreen.length) {
  console.error("check-palette: the two `.dark` blocks declare different variables.\n");
  if (missingFromPrint.length) {
    console.error("  Remapped for dark but never restored for print:");
    console.error("  (these would print as dark ink on paper)");
    for (const v of missingFromPrint) console.error(`    ${v}`);
  }
  if (missingFromScreen.length) {
    console.error("\n  Restored for print but never remapped for dark:");
    console.error("  (harmless, but means the print block is carrying a dead line)");
    for (const v of missingFromScreen) console.error(`    ${v}`);
  }
  process.exit(1);
}

console.log(`check-palette: ${onScreen.size} variables, both blocks agree.`);
