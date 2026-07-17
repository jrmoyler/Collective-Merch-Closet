import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const input = resolve(process.argv[2] || "/tmp/collective-merch-sprite.webp");
const output = resolve("src/merch-sprite.js");
const encoded = (await readFile(input)).toString("base64");
await writeFile(output, `// Generated catalog atlas: 18 columns × 19 rows × 180px\nexport default "data:image/webp;base64,${encoded}";\n`);
console.log(`Embedded the merchandise atlas in ${output}.`);
