import { runInterviewQuality } from "./interview-quality-core.mjs";

const report = await runInterviewQuality();

for (const row of report.summaryByType) {
  console.log(
    `[interview-quality] ${row.questionType}: pass ${row.pass}/${row.total}, fail ${row.fail}`,
  );
}

if (report.totals.fail > 0) {
  console.error(
    `[interview-quality] FAILED: ${report.totals.fail}/${report.totals.total} scenarios failed.`,
  );
  for (const row of report.results.filter((r) => !r.pass)) {
    console.error(`- ${row.id} (${row.scenario})`);
    for (const error of row.errors) console.error(`  * ${error}`);
  }
  process.exit(1);
}

console.log(
  `[interview-quality] OK: ${report.totals.pass}/${report.totals.total} scenarios passed.`,
);
