// Server-side model sheets: base64 image data keyed by model id, kept separate
// from src/models.js so the browser bundle never carries the embedded images.
// scripts/add-model.mjs generates a module per new model; wire it up here.
import { MODEL_IMAGE as JR_SHEET } from "./model-sheets/jr.js";
import { MODEL_IMAGE as HATAALII_SHEET } from "./model-sheets/hataalii.js";
import { MODEL_IMAGE as GUSTAVO_SHEET } from "./model-sheets/gustavo.js";
// [add-model:imports] — add `import { MODEL_IMAGE as <ID>_SHEET } from "./model-sheets/<id>.js";`

export const MODEL_SHEETS = {
  jr: JR_SHEET,
  hataalii: HATAALII_SHEET,
  gustavo: GUSTAVO_SHEET,
  // [add-model:sheets] — add `<id>: <ID>_SHEET,`
};
