import fs from "node:fs";

const input = fs.readFileSync(process.argv[2], "utf8").replace(/\f/g, "\n");
const divisionMatches = [...input.matchAll(/^\s*(\d{2})\s*\/\s*21\s*$/gm)];
const products = [];

for (let sectionIndex = 0; sectionIndex < divisionMatches.length; sectionIndex += 1) {
  const marker = divisionMatches[sectionIndex];
  const start = marker.index + marker[0].length;
  const end = divisionMatches[sectionIndex + 1]?.index ?? input.length;
  const section = input.slice(start, end);
  const headingLines = section.split("\n").map((line) => line.trim()).filter(Boolean);
  const division = headingLines.find((line) =>
    !line.startsWith("COLLECTIVE AI —")
    && !line.startsWith("PAGE ")
    && !line.startsWith("—")
    && !/^\d{3}\s/.test(line)
  ) || `Division ${marker[1]}`;
  const productMatches = [...section.matchAll(/^\s*(\d{3})\s{2,}(.+?)\s{2,}\$(\d+(?:\.\d+)?)\s*$/gm)];

  for (let index = 0; index < productMatches.length; index += 1) {
    const product = productMatches[index];
    const blockStart = product.index + product[0].length;
    const blockEnd = productMatches[index + 1]?.index ?? section.length;
    const block = section.slice(blockStart, blockEnd);
    const lines = block.split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.startsWith("COLLECTIVE AI —"))
      .filter((line) => !/^PAGE \d+/.test(line))
      .filter((line) => !line.startsWith("— "));
    const typeIndex = lines.findIndex((line) => /^(APPAREL|FOOTWEAR|ACCESSORIES)\b/.test(line));
    const typeLine = typeIndex >= 0 ? lines[typeIndex] : "APPAREL";
    const [category, ...styleParts] = typeLine.split(/\s+/);
    const descriptionLines = lines.slice(typeIndex + 1);
    const promptIndex = descriptionLines.findIndex((line) => line === "NANO BANANA 2 IMAGE PROMPT");
    const description = descriptionLines
      .slice(0, promptIndex >= 0 ? promptIndex : descriptionLines.length)
      .filter((line) => !/^\d{2}\s*\/\s*21$/.test(line))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    products.push({
      id: Number(product[1]),
      sku: product[1],
      division,
      divisionNumber: Number(marker[1]),
      name: product[2].replace(/\s+/g, " ").trim(),
      price: Number(product[3]),
      category,
      style: styleParts.join(" "),
      description,
    });
  }
}

process.stdout.write(JSON.stringify(products, null, 2));
