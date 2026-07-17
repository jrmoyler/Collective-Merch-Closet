import { copyFile } from "node:fs/promises";
import { resolve } from "node:path";

// The atlas ships as a static file (not embedded in the JS bundle) so the
// app shell stays small enough for mobile connections.
const input = resolve(process.argv[2] || "/tmp/collective-merch-sprite.webp");
const output = resolve("public/merch-sprite.webp");
await copyFile(input, output);
console.log(`Copied the merchandise atlas to ${output}.`);
