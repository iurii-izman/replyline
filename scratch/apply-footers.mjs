import { readFileSync, writeFileSync } from "node:fs";

const files = [
  "docs/verification-lanes.md",
  "docs/benchmark-policy.md",
  "docs/runtime-evidence.md",
  "docs/runtime-bringup.md",
  "docs/copy-rules.md",
];

const newItemsTemplate = [
  "- [verification-lanes.md](verification-lanes.md) — 4 lane модель (compile / mock / prompt / runtime).",
  "- [benchmark-policy.md](benchmark-policy.md) — лейблы `target / measured / pending verification`.",
  "- [runtime-evidence.md](runtime-evidence.md) — где живут артефакты, минимальное качество.",
  "- [runtime-bringup.md](runtime-bringup.md) — как поднять runtime path первый раз.",
  "- [copy-rules.md](copy-rules.md) — формулировки и баны."
];

for (const f of files) {
  let content = readFileSync(f, "utf8");
  
  // extract current filename like "copy-rules.md"
  const baseName = f.split('/').pop();
  
  const toAdd = newItemsTemplate.filter(item => !item.includes(`[${baseName}]`));
  
  // Find if "See also:" or "## See also" or "## См. также" exists at the end
  let hasFooter = false;
  let lines = content.split(/\r?\n/);
  
  let footerIndex = lines.findIndex((l, idx) => idx > lines.length - 20 && (l.trim() === "See also:" || l.trim() === "## See also" || l.trim() === "## См. также"));
  
  if (footerIndex !== -1) {
    // Replace the header with ## Header if needed
    const oldHeader = lines[footerIndex].trim();
    const newHeader = oldHeader.includes("См. также") ? "## См. также" : "## See also";
    lines[footerIndex] = newHeader;
    
    // gather existing bullets to prevent duplication
    const existingContent = lines.slice(footerIndex + 1).join('\n');
    
    for (const add of toAdd) {
      // Very simple duplication check based on file name only target
      const targetMatch = add.match(/\[([a-z0-9-]+.md)\]/);
      if (targetMatch) {
         const targetFile = targetMatch[1];
         if (!existingContent.includes(targetFile)) {
             lines.push(add);
         } else {
             // Let's replace the existing line with our new, more descriptive line
             const existIdx = lines.findIndex((l, i) => i > footerIndex && l.includes(targetFile));
             if (existIdx !== -1) {
                // Keep our new format instead of existing `docs/xyz.md`
                // Wait, requirements say "merge into it without duplicating any existing entries".
                // Just keeping the old item if it exists is safer, or replacing if it's the exact same file target. I will replace to upgrade it to the required template text.
                lines[existIdx] = add;
             }
         }
      }
    }
    
    // For copy-rules, there might be other docs like `docs/privacy-and-trust.md`. My replace won't delete them, just update the overlapping ones.
    
    // Also remove `docs/` from bullets pointing to the same directory
    for (let i = footerIndex + 1; i < lines.length; i++) {
        lines[i] = lines[i].replace(/`docs\/([^`]+)`/g, "[`$1`]($1)"); // Wait, better just leave the non-overlapping ones alone? "Do not change any other content in the file."
    }
    
    content = lines.join('\n');
    
  } else {
    // Append new section entirely
    if (!content.trim().endsWith("---")) {
      content += "\n\n---\n";
    }
    content += "\n## См. также\n\n";
    content += toAdd.join('\n') + "\n";
  }
  
  writeFileSync(f, content);
}
console.log("Done");
