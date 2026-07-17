import { MODEL_IMAGE } from "../src/model.js";

export const config = { maxDuration: 300 };

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Use POST to enter the fitting room." });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return response.status(503).json({ error: "The AI fitting-room key has not been connected to this deployment yet." });
  }

  const itemIds = Array.isArray(request.body?.itemIds)
    ? [...new Set(request.body.itemIds.map(Number).filter((id) => Number.isInteger(id) && id >= 1 && id <= 342))].slice(0, 3)
    : [];
  if (!itemIds.length) return response.status(400).json({ error: "Choose at least one piece first." });

  try {
    const model = Buffer.from(MODEL_IMAGE.split(",", 2)[1], "base64");
    const itemImages = Array.isArray(request.body?.itemImages) ? request.body.itemImages.slice(0, 3) : [];
    if (itemImages.length !== itemIds.length) throw new Error("The selected merchandise images are incomplete.");
    const garmentFiles = itemImages.map((data, index) => {
      const match = typeof data === "string" && data.match(/^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/);
      if (!match) throw new Error(`Merch image ${itemIds[index]} is invalid.`);
      const file = Buffer.from(match[1], "base64");
      if (!file.length || file.length > 1_000_000) throw new Error(`Merch image ${itemIds[index]} is unavailable.`);
      return file;
    });

    const form = new FormData();
    form.set("model", process.env.OPENAI_IMAGE_MODEL || "gpt-image-2");
    form.set("quality", process.env.OPENAI_IMAGE_QUALITY || "high");
    form.set("size", "1024x1536");
    form.set("output_format", "png");
    form.set("prompt", [
      "Create a luxury full-body vertical fashion editorial photograph of the exact adult man in Image 1 wearing one cohesive outfit built from every Collective AI garment shown in the remaining images.",
      "Preserve his recognizable face, deep brown skin tone, dense shoulder-length black curls, facial hair, nose ring, adult age, tall athletic proportions, and identity.",
      "Preserve each selected garment's logos, typography, palette, materials, trim, silhouette, and distinctive construction as faithfully as possible.",
      "Coordinate the pieces naturally; if multiple tops conflict, use one as the main layer and the others as tasteful outer or carried styling.",
      "Use realistic anatomy, premium studio lighting, subtle deep-space navy architecture, full shoes visible, and an authentic high-fashion campaign finish.",
      "No invented brand text, no watermark, no extra people, no collage, no split screen.",
    ].join(" "));
    form.append("image[]", new Blob([model], { type: "image/webp" }), "jr-model.webp");
    garmentFiles.forEach((file, index) => form.append("image[]", new Blob([file], { type: "image/webp" }), `collective-piece-${index + 1}.webp`));

    const apiResponse = await fetch(`${(process.env.OPENAI_API_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "")}/images/edits`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    const result = await apiResponse.json().catch(() => ({}));
    if (apiResponse.status === 401) throw new Error("The OpenAI key was rejected — double-check OPENAI_API_KEY in this deployment's environment variables.");
    if (apiResponse.status === 429) throw new Error("The image API is rate-limited or out of credits right now. Try again in a moment.");
    if (!apiResponse.ok) throw new Error(result.error?.message || `Image generation failed (${apiResponse.status}).`);
    const encoded = result.data?.[0]?.b64_json;
    const remote = result.data?.[0]?.url;
    if (!encoded && !remote) throw new Error("The image engine returned no try-on.");
    return response.status(200).json({ image: encoded ? `data:image/png;base64,${encoded}` : remote });
  } catch (error) {
    return response.status(500).json({ error: error.message || "The fitting room could not render this look." });
  }
}
