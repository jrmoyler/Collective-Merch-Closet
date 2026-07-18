// Registry of fitting-room models. The frontend uses `image` for the stage and
// picker; the API uses `identity` to anchor the generated try-on to the right
// person. To add a model, run `node scripts/add-model.mjs <photo> <id> "<name>"`
// and follow its printed steps — the studio picker and the API pick the new
// model up from this list automatically.
export const MODELS = [
  {
    id: "jr",
    code: "MODEL 001",
    name: "JR MOYLER",
    detail: "6'4\" · Columbus, Ohio",
    image: "/jr-model.webp",
    identity:
      "Preserve his recognizable face, deep brown skin tone, dense shoulder-length black curls, facial hair, nose ring, adult age, tall athletic proportions, and identity.",
  },
];

// The closet is designed for three model sheets; empty slots render as
// placeholders in the studio until their sheets are uploaded.
export const MODEL_SLOTS = 3;

export const DEFAULT_MODEL_ID = MODELS[0].id;

export function getModel(id) {
  return MODELS.find((model) => model.id === id) || null;
}
