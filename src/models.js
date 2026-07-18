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
    image: "/models/jr.jpg",
    identity:
      "Preserve his recognizable face, deep brown skin tone, dense shoulder-length black curls, mustache and light beard, nose ring, adult age, tall athletic proportions, and identity.",
  },
  {
    id: "hataalii",
    code: "MODEL 002",
    name: "HATAALII",
    detail: "Shoulder-length braids · Columbus, Ohio",
    image: "/models/hataalii.jpg",
    identity:
      "Preserve his recognizable face, deep brown skin tone, shoulder-length box braids, full beard and mustache, adult age, tall broad-shouldered muscular proportions, and identity.",
  },
  {
    id: "gustavo",
    code: "MODEL 003",
    name: "GUSTAVO",
    detail: "Cornrows · Columbus, Ohio",
    image: "/models/gustavo.jpg",
    identity:
      "Preserve his recognizable face, brown skin tone, neat cornrow braids, goatee and mustache, hoop earrings, silver chain necklace and rings, adult age, lean athletic proportions, and identity.",
  },
];

// The closet is designed for three model sheets; empty slots render as
// placeholders in the studio until their sheets are uploaded.
export const MODEL_SLOTS = 3;

export const DEFAULT_MODEL_ID = "jr";

export function getModel(id) {
  return MODELS.find((model) => model.id === id) || null;
}
