import assets from "../data/merch-assets.json";
import catalog from "../data/catalog.json";
import ocrText from "../data/merch-ocr.tsv?raw";

export const DIVISIONS = [
  { id: "collective-ai", name: "Collective AI", number: "01", tagline: "Architecting a Humane Future", industry: "Venture Studio", accent: "#D4A843", tags: ["Parent Brand", "Founder", "Ecosystem"] },
  { id: "zenflow", name: "ZenFlow", number: "02", tagline: "The Intelligence Behind Everything", industry: "AI Research", accent: "#7657FF", tags: ["AI Core", "Agents", "Intelligence"] },
  { id: "the-collective", name: "The Collective", number: "03", tagline: "AI Strategy. Built to Last.", industry: "AI Consulting", accent: "#D4A843", tags: ["Strategy", "Operators", "Advisory"] },
  { id: "hybrid-living", name: "Hybrid Living", number: "04", tagline: "Learn What's Next", industry: "Education", accent: "#FF9F43", tags: ["Learning", "EdTech", "Future Skills"] },
  { id: "nexus-labs", name: "Nexus Labs", number: "05", tagline: "The Story of What's Coming", industry: "Media", accent: "#E84A5F", tags: ["Creators", "Storytelling", "Entertainment"] },
  { id: "kinetic-edge", name: "Kinetic Edge", number: "06", tagline: "The Edge Is Intelligence", industry: "Sports Performance", accent: "#26E56D", tags: ["Performance", "Athletics", "Recovery"] },
  { id: "quantum-ledger", name: "Quantum Ledger", number: "07", tagline: "Classical Authority. Quantum Intelligence.", industry: "Finance", accent: "#9B63FF", tags: ["Markets", "Capital", "Valuation"] },
  { id: "terra-axis", name: "Terra Axis", number: "08", tagline: "The Building Is the Computer", industry: "PropTech", accent: "#2D8CFF", tags: ["Smart City", "Property", "Infrastructure"] },
  { id: "binary-loom", name: "Binary Loom", number: "09", tagline: "The Fabric Everything Runs On", industry: "Software Infrastructure", accent: "#FFB020", tags: ["Code", "Systems", "Infrastructure"] },
  { id: "vector-shift", name: "Vector Shift", number: "10", tagline: "Everything Moves", industry: "Industrial Intelligence", accent: "#B9C5D8", tags: ["Mobility", "Industrial", "Logistics"] },
  { id: "aether-link", name: "Aether Link", number: "11", tagline: "Everyone Connected. Everything Clear.", industry: "Communications", accent: "#D2693C", tags: ["Networks", "Language", "Mesh"] },
  { id: "obsidian-arc", name: "Obsidian Arc", number: "12", tagline: "The Eye That Never Closes", industry: "Security", accent: "#E43C68", tags: ["Defense", "Cybersecurity", "Aegis"] },
  { id: "civic-core", name: "Civic Core", number: "13", tagline: "Technology for Every Community", industry: "Civic Technology", accent: "#F0B8D7", tags: ["Community", "Access", "Digital Equity"] },
  { id: "cognara-mind", name: "Cognara Mind", number: "14", tagline: "Intelligence About You", industry: "Behavioral Science", accent: "#D64F7D", tags: ["Behavior", "Cognition", "Wellbeing"] },
  { id: "vital-helix", name: "Vital Helix", number: "15", tagline: "Your Body Has Data. We Help You Read It.", industry: "HealthTech", accent: "#00B9A7", tags: ["Health", "Bio-Data", "Longevity"] },
  { id: "gaia-synthesis", name: "Gaia Synthesis", number: "16", tagline: "Where Biology Meets Intelligence", industry: "ClimateTech", accent: "#2FC467", tags: ["Regeneration", "Agriculture", "Biology"] },
  { id: "animus-prime", name: "Animus Prime", number: "17", tagline: "Built to Work Beside You", industry: "Robotics", accent: "#1FE5F2", tags: ["Robotics", "Physical AI", "Automation"] },
  { id: "juris-guard", name: "Juris Guard", number: "18", tagline: "Regulation Is a Competitive Advantage", industry: "LegalTech", accent: "#CDA84A", tags: ["Legal", "Governance", "Compliance"] },
  { id: "signal-velocity", name: "Signal Velocity", number: "19", tagline: "Turn Attention Into Revenue. At Velocity.", industry: "Growth Marketing", accent: "#FF6B4A", tags: ["Growth", "Narrative", "Conversion"] },
  { id: "nomad-nexus", name: "Nomad Nexus", number: "20", tagline: "Live Anywhere. Belong Everywhere.", industry: "Mobility", accent: "#D6A33B", tags: ["Travel", "Global Living", "Mobility"] },
  { id: "eon-core", name: "Eon Core", number: "21", tagline: "The Science of More Time", industry: "Longevity Research", accent: "#B8A4FF", tags: ["Longevity", "Frontier R&D", "Time"] },
];

const byId = Object.fromEntries(DIVISIONS.map((division) => [division.id, division]));
const ocr = Object.fromEntries(ocrText.trim().split("\n").map((line) => {
  const [id, ...rest] = line.split("\t");
  return [Number(id), rest.join(" ").trim()];
}));

const ranges = [
  [1, 15, "aether-link"], [16, 30, "obsidian-arc"], [31, 50, "collective-ai"],
  [51, 63, "civic-core"], [64, 64, "collective-ai"], [65, 82, "kinetic-edge"],
  [83, 87, "cognara-mind"], [88, 88, "hybrid-living"], [89, 99, "signal-velocity"],
  [100, 106, "nomad-nexus"], [107, 117, "eon-core"], [135, 144, "eon-core"],
  [145, 156, "juris-guard"], [157, 157, "cognara-mind"], [158, 161, "hybrid-living"],
  [162, 163, "collective-ai"], [164, 166, "kinetic-edge"], [167, 180, "nexus-labs"],
  [181, 195, "the-collective"], [196, 210, "quantum-ledger"], [211, 224, "zenflow"],
  [225, 239, "terra-axis"], [240, 253, "vital-helix"], [271, 283, "gaia-synthesis"],
  [284, 298, "vector-shift"], [299, 313, "animus-prime"], [314, 326, "hybrid-living"],
  [327, 341, "binary-loom"], [342, 342, "quantum-ledger"],
];

const special = {
  118: "obsidian-arc", 119: "vector-shift", 120: "aether-link", 121: "juris-guard",
  122: "gaia-synthesis", 123: "animus-prime", 124: "nomad-nexus", 125: "civic-core",
  126: "the-collective", 127: "zenflow", 128: "hybrid-living", 129: "nexus-labs",
  130: "terra-axis", 131: "vital-helix", 132: "binary-loom", 133: "collective-ai",
  134: "kinetic-edge", 254: "obsidian-arc", 255: "quantum-ledger", 256: "zenflow",
  257: "the-collective", 258: "juris-guard", 259: "the-collective", 260: "animus-prime",
  261: "quantum-ledger", 262: "civic-core", 263: "kinetic-edge", 264: "obsidian-arc",
  265: "hybrid-living", 266: "vital-helix", 267: "gaia-synthesis", 268: "nexus-labs",
  269: "terra-axis", 270: "gaia-synthesis",
};

function divisionFor(index) {
  if (special[index]) return special[index];
  return ranges.find(([start, end]) => index >= start && index <= end)?.[2] || "collective-ai";
}

const catalogByDivision = Object.fromEntries(DIVISIONS.map((division) => {
  const normalized = division.name.toUpperCase();
  const pieces = catalog.filter((product) =>
    product.division.replace(" NEW DIVISION", "") === normalized
    && product.category !== "ACCESSORIES"
  );
  return [division.id, pieces.length ? pieces : catalog.filter((product) => product.division.replace(" NEW DIVISION", "") === normalized)];
}));

const seenPerDivision = {};

export const MERCH = assets.map((asset) => {
  const divisionId = divisionFor(asset.index);
  const division = byId[divisionId];
  const pieces = catalogByDivision[divisionId] || [];
  const sequence = seenPerDivision[divisionId] || 0;
  seenPerDivision[divisionId] = sequence + 1;
  const product = pieces[sequence % Math.max(1, pieces.length)] || catalog[asset.index - 1] || catalog[0];
  const typeText = `${product?.style || ""} ${product?.name || ""}`.toLowerCase();
  const part = /shoe|sneaker|boot|loafer|trainer|runner|sandal|footwear|clog|espadrille/.test(typeText)
    ? "shoes"
    : /pant|trouser|jogger|short|tight/.test(typeText)
      ? "bottoms"
      : /coat|jacket|blazer|parka|bomber|vest|overshirt|trench|cardigan/.test(typeText)
        ? "layers"
        : /cap|hat|beanie|scarf|glove|bag|tote|backpack/.test(typeText)
          ? "accessories"
          : "tops";

  return {
    ...asset,
    localImage: asset.image,
    image: asset.image,
    divisionId,
    division,
    product,
    part,
    ocr: ocr[asset.index] || "",
    tags: [division.name, division.industry, product?.category, product?.style].filter(Boolean),
  };
});

export const CATALOG = catalog;
export const DIVISION_BY_ID = byId;
