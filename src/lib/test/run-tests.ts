import { runAllTests } from "./suite";

async function main() {
  console.log("==================================================");
  console.log("   AI TASK-EXECUTION PLATFORM: AUTOMATED TEST SUITE");
  console.log("==================================================");

  const start = Date.now();
  const summary = await runAllTests();

  console.log("");
  for (const res of summary.results) {
    const symbol = res.passed ? "✓ PASS" : "✗ FAIL";
    const color = res.passed ? "\x1b[32m" : "\x1b[31m";
    const reset = "\x1b[0m";
    console.log(`${color}${symbol}${reset} [${res.id}] [${res.category}] ${res.name} (${res.durationMs}ms)`);
    if (res.error) {
      console.log(`      Error: ${res.error}`);
    }
  }

  console.log("--------------------------------------------------");
  console.log(`Summary: ${summary.passed}/${summary.total} tests passed in ${Date.now() - start}ms`);
  console.log("==================================================");

  if (summary.failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test runner threw an unhandled error:", err);
  process.exit(1);
});
