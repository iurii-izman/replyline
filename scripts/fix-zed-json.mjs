import { readFileSync, writeFileSync } from "node:fs";

const files = [".zed/settings.json", ".zed/tasks.json", ".zed/keymap.json"];

for (const f of files) {
  let s = readFileSync(f, "utf8");
  // Strip trailing commas: , before } or ]
  s = s.replace(/,(\s*[}\]])/g, "$1");
  writeFileSync(f, s);
  try {
    JSON.parse(s);
    console.log(f + ": OK");
  } catch (e) {
    console.log(f + ": FAIL — " + e.message);
    process.exitCode = 1;
  }
}
