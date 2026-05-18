import { runInterviewQuality } from "./interview-quality-core.mjs";

const report = await runInterviewQuality();

console.log("Interview Quality Report V1");
console.log(`Total: ${report.totals.total}`);
console.log(`Pass: ${report.totals.pass}`);
console.log(`Fail: ${report.totals.fail}`);
console.log("");
console.log("By questionType:");
for (const row of report.summaryByType) {
  console.log(`- ${row.questionType}: pass ${row.pass}/${row.total}, fail ${row.fail}`);
}

const reasonTotals = new Map();
for (const row of report.results.filter((r) => !r.pass)) {
  for (const reason of row.errors) {
    reasonTotals.set(reason, (reasonTotals.get(reason) ?? 0) + 1);
  }
}
if (reasonTotals.size > 0) {
  console.log("");
  console.log("Failure reasons:");
  for (const [reason, count] of [...reasonTotals.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`- ${reason}: ${count}`);
  }
}

if (report.totals.fail > 0) {
  console.log("");
  console.log("Failed scenarios:");
  for (const row of report.results.filter((r) => !r.pass)) {
    console.log(`- ${row.id} (${row.scenario})`);
    for (const error of row.errors) console.log(`  * ${error}`);
  }
  process.exit(1);
}
