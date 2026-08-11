/**
 * BUG-005's missing browser trace (see `docs/agent/bugs/BUG-005-desktop-backdrop-lag.md`).
 *
 * Loads the shelf and a chapter page against a running dev server (log in as
 * the demo account, since every route past `/login` requires a session),
 * scrolls each a fixed distance, and reports long-task count and total
 * long-task time via the CDP Performance/tracing APIs. Not a general E2E
 * suite — one narrow job, meant to be diffed against itself with
 * `useParallax` restored vs. disabled.
 *
 * Requires a dev server already running at PERF_TRACE_URL (default
 * http://localhost:3000). Run with:
 *   npx tsx scripts/perf-trace.ts
 */
import { chromium } from "playwright";

const BASE_URL = process.env.PERF_TRACE_URL ?? "http://localhost:3000";
const DEMO_EMAIL = process.env.DEMO_ACCOUNT_EMAIL ?? "demo@bookofus.local";
const DEMO_PASSWORD = process.env.DEMO_ACCOUNT_PASSWORD ?? "demo123";
const SCROLL_DISTANCE = 2000;
const SCROLL_STEPS = 20;

async function login(page: import("playwright").Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill("#email", DEMO_EMAIL);
  await page.fill("#password", DEMO_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15000 });
}

async function traceScroll(page: import("playwright").Page, url: string, label: string) {
  await page.goto(url, { waitUntil: "networkidle" });
  // Let the opening/entry animations settle before measuring.
  await page.waitForTimeout(1500);

  const client = await page.context().newCDPSession(page);
  await client.send("Performance.enable");

  const longTasks: number[] = [];
  const observed = await page.evaluateHandle(() => {
    const durations: number[] = [];
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) durations.push(entry.duration);
    });
    observer.observe({ type: "longtask", buffered: true });
    (window as unknown as { __longtasks: number[] }).__longtasks = durations;
    return durations;
  });
  void observed;

  const step = SCROLL_DISTANCE / SCROLL_STEPS;
  const start = Date.now();
  for (let i = 0; i < SCROLL_STEPS; i++) {
    await page.mouse.wheel(0, step);
    await page.waitForTimeout(50);
  }
  const elapsedMs = Date.now() - start;

  const durations = await page.evaluate(
    () => (window as unknown as { __longtasks: number[] }).__longtasks,
  );
  for (const d of durations) longTasks.push(d);

  const metrics = await client.send("Performance.getMetrics");
  const taskDuration = metrics.metrics.find((m) => m.name === "TaskDuration")?.value ?? null;

  console.log(`\n--- ${label} (${url}) ---`);
  console.log(`Scroll wall-clock: ${elapsedMs}ms`);
  console.log(`Long tasks (>50ms): ${longTasks.length}`);
  console.log(`Total long-task time: ${longTasks.reduce((a, b) => a + b, 0).toFixed(1)}ms`);
  console.log(`CDP TaskDuration metric: ${taskDuration ?? "n/a"}`);

  return {
    label,
    url,
    elapsedMs,
    longTaskCount: longTasks.length,
    longTaskTotalMs: longTasks.reduce((a, b) => a + b, 0),
  };
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await login(page);

  const results = [];
  results.push(await traceScroll(page, `${BASE_URL}/`, "Shelf"));

  // First chapter link on the shelf, if any exist.
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
  const chapterHref = await page
    .locator('a[href^="/chapters/"]')
    .first()
    .getAttribute("href")
    .catch(() => null);

  if (chapterHref) {
    results.push(await traceScroll(page, `${BASE_URL}${chapterHref}`, "Chapter"));
  } else {
    console.log("\nNo chapter link found on the shelf — skipping chapter-page trace.");
  }

  await browser.close();

  console.log("\n=== Summary ===");
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
