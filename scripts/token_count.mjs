import fs from "fs";
import { encoding_for_model } from "tiktoken";

const model = "gpt-4o-mini"; // or whatever model you're using
const enc = encoding_for_model(model);

const code = fs.readFileSync("src/app/page.tsx", "utf8"); // pick any file
const tokens = enc.encode(code);
console.log(`File: src/app/page.tsx`);
console.log(`Characters: ${code.length}`);
console.log(`Tokens: ${tokens.length}`);
