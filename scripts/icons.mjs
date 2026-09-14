import sharp from "sharp";
import { readFile } from "node:fs/promises";

const svg = await readFile("public/icon.svg");

const targets = [
  { file: "public/icon-192.png", size: 192 },
  { file: "public/icon-512.png", size: 512 },
  { file: "public/apple-touch-icon.png", size: 180 },
];

for (const { file, size } of targets) {
  await sharp(svg).resize(size, size).png().toFile(file);
  console.log("zapsáno", file);
}

// maskable potřebuje rezervu na okrajích, jinak si ji Android ořízne do kruhu
await sharp(svg)
  .resize(410, 410)
  .extend({ top: 51, bottom: 51, left: 51, right: 51, background: "#FFFFFF" })
  .png()
  .toFile("public/icon-maskable-512.png");
console.log("zapsáno public/icon-maskable-512.png");
