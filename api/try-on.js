import { MODELS, DEFAULT_MODEL_ID, getModel } from "../src/models.js";
import { MODEL_SHEETS } from "../src/model-sheets.js";

export const config = { maxDuration: 300 };

// HTTP header values are ByteStrings (Latin1), so any character above code
// point 255 crashes the request with an opaque
// "Cannot convert argument to a ByteString…" error the moment we build the
// Authorization header. Copy-pasting a key from a doc or chat commonly turns
// its hyphens into "smart" en/em dashes and slips in zero-width characters, so
// repair those here and report anything left over instead of crashing.
function sanitizeKey(raw) {
  return String(raw || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim()
    .replace(/[\u2010-\u2015\u2212]/g, "-") // hyphen/en/em/figure/minus dashes -> "-"
    .replace(/[\u200b-\u200d\ufeff]/g, ""); // zero-width spaces + BOM
}

// True when every character fits in a byte, i.e. the value is safe to place in
// an HTTP header without throwing.
function isHeaderSafe(value) {
  return !/[^\u0000-\u00ff]/.test(value);
}

// Environment variables are case-sensitive, but the key is easy to add as
// `openai_api_key` (or with stray quotes/whitespace) in the Vercel dashboard.
// Accept any casing and clean the value instead of failing silently.
function findOpenAIKey() {
  for (const [name, value] of Object.entries(process.env)) {
    if (name.toLowerCase() !== "openai_api_key") continue;
    const cleaned = sanitizeKey(value);
    if (cleaned) return { key: cleaned, envName: name };
  }
  return { key: "", envName: "" };
}

function readEnv(name, fallback) {
  const match = Object.entries(process.env).find(([key]) => key.toLowerCase() === name.toLowerCase());
  const value = match ? String(match[1] || "").trim() : "";
  return value || fallback;
}

export default async function handler(request, response) {
  if (request.method === "GET") {
    // Connection check for the fitting room — never returns the key itself.
    const { key, envName } = findOpenAIKey();
    const keyUsable = Boolean(key) && isHeaderSafe(key);
    return response.status(200).json({
      keyDetected: keyUsable,
      keyEnvName: envName || null,
      note: !key
        ? "No OPENAI_API_KEY found in this deployment's environment variables. Add it in Vercel → Project → Settings → Environment Variables, then redeploy."
        : !keyUsable
          ? "A key was found but it contains an invalid character (often a curly quote, smart dash, or hidden character from copy-paste). Re-copy it as plain text, update OPENAI_API_KEY, and redeploy."
          : envName === "OPENAI_API_KEY"
            ? "Key connected."
            : `Key connected (found as "${envName}" — the standard name is OPENAI_API_KEY, but this deployment accepts it either way).`,
      models: MODELS.map((model) => model.id),
    });
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "GET, POST");
    return response.status(405).json({ error: "Use POST to enter the fitting room." });
  }

  const { key } = findOpenAIKey();
  if (!key) {
    return response.status(503).json({
      error: "The AI fitting-room key has not been connected to this deployment yet. Add OPENAI_API_KEY in Vercel's environment variables and redeploy.",
      offline: true,
    });
  }
  if (!isHeaderSafe(key)) {
    // Any character above U+00FF would crash the Authorization header with an
    // opaque ByteString error, so fail with an actionable message instead.
    return response.status(500).json({
      error: "The connected OpenAI key contains an invalid character (often a curly quote, smart dash, or hidden character introduced when copying). Re-copy the key as plain text, update OPENAI_API_KEY, and redeploy.",
    });
  }

  const model = getModel(typeof request.body?.modelId === "string" ? request.body.modelId : DEFAULT_MODEL_ID);
  const sheet = model && MODEL_SHEETS[model.id];
  if (!model || !sheet) return response.status(400).json({ error: "That model sheet has not been uploaded yet." });

  const itemIds = Array.isArray(request.body?.itemIds)
    ? [...new Set(request.body.itemIds.map(Number).filter((id) => Number.isInteger(id) && id >= 1 && id <= 342))].slice(0, 6)
    : [];
  if (!itemIds.length) return response.status(400).json({ error: "Choose at least one piece first." });

  try {
    const sheetMime = sheet.match(/^data:(image\/[a-z+]+);base64,/)?.[1] || "image/jpeg";
    const modelFile = Buffer.from(sheet.split(",", 2)[1], "base64");
    const itemImages = Array.isArray(request.body?.itemImages) ? request.body.itemImages.slice(0, 6) : [];
    if (itemImages.length !== itemIds.length) throw new Error("The selected merchandise images are incomplete.");
    const garmentFiles = itemImages.map((data, index) => {
      const match = typeof data === "string" && data.match(/^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/);
      if (!match) throw new Error(`Merch image ${itemIds[index]} is invalid.`);
      const file = Buffer.from(match[1], "base64");
      if (!file.length || file.length > 1_000_000) throw new Error(`Merch image ${itemIds[index]} is unavailable.`);
      return file;
    });

    const form = new FormData();
    form.set("model", readEnv("OPENAI_IMAGE_MODEL", "gpt-image-2"));
    form.set("quality", readEnv("OPENAI_IMAGE_QUALITY", "high"));
    form.set("size", "1024x1536");
    form.set("output_format", "png");
    form.set("prompt", [
      "Create a luxury full-body vertical fashion editorial photograph of the exact adult person in Image 1 wearing one cohesive outfit built from every Collective AI garment shown in the remaining images.",
      model.identity,
      "Preserve each selected garment's logos, typography, palette, materials, trim, silhouette, and distinctive construction as faithfully as possible.",
      "Coordinate the pieces naturally; if multiple tops conflict, use one as the main layer and the others as tasteful outer or carried styling.",
      "Use realistic anatomy, premium studio lighting, subtle deep-space navy architecture, full shoes visible, and an authentic high-fashion campaign finish.",
      "No invented brand text, no watermark, no extra people, no collage, no split screen.",
    ].join(" "));
    form.append("image[]", new Blob([modelFile], { type: sheetMime }), `${model.id}-model.${sheetMime.split("/")[1].replace("jpeg", "jpg")}`);
    garmentFiles.forEach((file, index) => form.append("image[]", new Blob([file], { type: "image/webp" }), `collective-piece-${index + 1}.webp`));

    const apiResponse = await fetch(`${readEnv("OPENAI_API_BASE_URL", "https://api.openai.com/v1").replace(/\/$/, "")}/images/edits`, {
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
