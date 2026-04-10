import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve, extname } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cwd = resolve(__dirname, "..");

const targetFiles = [
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md"
];

function getMarkdownFiles(dir) {
  let results = [];
  try {
    const list = readdirSync(dir, { withFileTypes: true });
    for (const dirent of list) {
      const fullPath = join(dir, dirent.name);
      if (dirent.isDirectory()) {
        results = results.concat(getMarkdownFiles(fullPath));
      } else if (dirent.isFile() && dirent.name.endsWith(".md")) {
        results.push(fullPath);
      }
    }
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  return results;
}

const docsDir = join(cwd, "docs");
const docsFiles = getMarkdownFiles(docsDir);
const allFiles = [...targetFiles.map(f => join(cwd, f)), ...docsFiles];

const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
const imageExts = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"]);

let brokenLinks = 0;
let totalLinks = 0;

for (const filePath of allFiles) {
  if (!existsSync(filePath)) continue;

  const content = readFileSync(filePath, "utf8");
  const relPath = filePath.replace(cwd, "").replace(/^[\\/]/, "").replace(/\\/g, "/");

  // Remove code blocks before checking for links
  const contentNoCode = content.replace(/```[\s\S]*?```/g, "");
  const lines = contentNoCode.split(/\r?\n/);

  for (let linkLine = 0; linkLine < lines.length; linkLine++) {
    const line = lines[linkLine];
    let match;
    while ((match = linkRegex.exec(line)) !== null) {
      totalLinks++;
      let target = match[2].trim();

      if (target.startsWith("http://") || target.startsWith("https://") || target.startsWith("mailto:") || target.startsWith("#")) {
        continue;
      }

      // Strip query and anchor
      const hashIndex = target.indexOf("#");
      if (hashIndex !== -1) target = target.slice(0, hashIndex);
      
      const queryIndex = target.indexOf("?");
      if (queryIndex !== -1) target = target.slice(0, queryIndex);

      if (target === "") continue;

      const ext = extname(target).toLowerCase();
      if (imageExts.has(ext)) {
        continue;
      }

      const absoluteTarget = resolve(dirname(filePath), target);
      if (!existsSync(absoluteTarget)) {
        console.error(`BROKEN: ${relPath}:${linkLine + 1} -> ${match[2]}`);
        brokenLinks++;
      }
    }
  }
}

if (brokenLinks > 0) {
  console.log(`FAILED: ${brokenLinks} broken links`);
  process.exit(1);
} else {
  console.log(`OK: ${allFiles.length} markdown files, ${totalLinks} links checked`);
  process.exit(0);
}
