/**
 * Idle + menu-open trace for the ambient backdrop — the harness behind
 * BUG-014's numbers, and the companion to `perf-trace.ts` (which measures
 * scroll; this one measures what the page costs while *doing nothing*, which
 * is what heats a phone).
 *
 * Emulates a phone (390x844 @3x, touch → `pointer: coarse`) and a desktop
 * (1440x900 @2x, fine pointer), throttles CPU 4x, and for each scenario
 * measures:
 *   - idle: 6s of rAF frame intervals (avg FPS, % frames > 34ms) + CDP
 *     TaskDuration delta (main-thread seconds burned while "doing nothing")
 *   - menu: taps the hamburger and samples frames for 800ms (mobile only —
 *     the button doesn't exist above `sm`)
 *
 * Scenarios freeze one suspect at a time via injected CSS so the deltas
 * attribute the cost. Add a scenario when hunting a new offender; keep runs
 * sequential and the machine otherwise quiet — concurrent load pollutes the
 * numbers (learned twice on 2026-08-15).
 *
 * Requires a dev server already running at PERF_TRACE_URL (default
 * http://localhost:3000). Run with:
 *   npx tsx scripts/idle-trace.ts
 */
import { chromium } from "playwright";

const BASE_URL = process.env.PERF_TRACE_URL ?? "http://localhost:3000";
const DEMO_EMAIL = process.env.DEMO_ACCOUNT_EMAIL ?? "demo@bookofus.local";
const DEMO_PASSWORD = process.env.DEMO_ACCOUNT_PASSWORD ?? "demo123";

const SCENARIOS: { label: string; css: string }[] = [
  { label: "baseline", css: "" },
  {
    label: "all ambient animations frozen",
    css: `[class*="ambient-"] { animation: none !important; }`,
  },
  {
    label: "clouds frozen",
    css: `.ambient-cloud { animation: none !important; }`,
  },
  {
    label: "near tufts frozen",
    css: `.ambient-tuft { animation: none !important; }`,
  },
  {
    label: "petals+motes hidden",
    css: `.ambient-petal, .ambient-mote { display: none !important; }`,
  },
];

type Idle = { fps: number; longPct: number; taskDelta: number };

async function sampleFrames(page: import("playwright").Page, ms: number) {
  return page.evaluate(async (duration) => {
    const intervals: number[] = [];
    let last = performance.now();
    let raf = 0;
    await new Promise<void>((resolve) => {
      const end = performance.now() + duration;
      const tick = (t: number) => {
        intervals.push(t - last);
        last = t;
        if (t < end) raf = requestAnimationFrame(tick);
        else resolve();
      };
      raf = requestAnimationFrame(tick);
    });
    void raf;
    intervals.shift();
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const long = intervals.filter((i) => i > 34).length;
    return { fps: 1000 / avg, longPct: (100 * long) / intervals.length };
  }, ms);
}

const DEVICES = [
  {
    name: "mobile",
    options: {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      hasTouch: true,
      isMobile: true,
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36",
    },
  },
  {
    name: "desktop",
    options: {
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      hasTouch: false,
      isMobile: false,
    },
  },
];

async function runDevice(browser: import("playwright").Browser, device: (typeof DEVICES)[number]) {
  const context = await browser.newContext(device.options);
  const page = await context.newPage();
  // tsx compiles with esbuild keepNames, which injects `__name(...)` calls into
  // the function source Playwright serializes into the page — define a no-op.
  await page.addInitScript("window.__name = (fn) => fn;");

  await page.goto(`${BASE_URL}/login`);
  await page.fill("#email", DEMO_EMAIL);
  await page.fill("#password", DEMO_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });

  const results: Record<string, { idle: Idle; menu: { longPct: number; worst: number } }> = {};

  for (const scenario of SCENARIOS) {
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    if (scenario.css) await page.addStyleTag({ content: scenario.css });
    await page.waitForTimeout(2500); // let entry animations settle

    const client = await page.context().newCDPSession(page);
    await client.send("Performance.enable");
    await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });

    const before = await client.send("Performance.getMetrics");
    const t0 = before.metrics.find((m) => m.name === "TaskDuration")?.value ?? 0;
    const idleFrames = await sampleFrames(page, 6000);
    const after = await client.send("Performance.getMetrics");
    const t1 = after.metrics.find((m) => m.name === "TaskDuration")?.value ?? 0;

    // Menu open: tap the hamburger, sample the animation window.
    const menuButton = page.locator('button[aria-label="Open menu"]').first();
    let menu = { longPct: -1, worst: -1 };
    if (await menuButton.isVisible().catch(() => false)) {
      const framesPromise = page.evaluate(async () => {
        const intervals: number[] = [];
        let last = performance.now();
        await new Promise<void>((resolve) => {
          const end = performance.now() + 800;
          const tick = (t: number) => {
            intervals.push(t - last);
            last = t;
            if (t < end) requestAnimationFrame(tick);
            else resolve();
          };
          requestAnimationFrame(tick);
        });
        intervals.shift();
        return intervals;
      });
      await page.waitForTimeout(100);
      await menuButton.tap();
      const intervals = await framesPromise;
      menu = {
        longPct: (100 * intervals.filter((i) => i > 34).length) / intervals.length,
        worst: Math.max(...intervals),
      };
    }

    await client.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await client.detach();

    results[scenario.label] = {
      idle: { ...idleFrames, taskDelta: t1 - t0 },
      menu,
    };
    console.log(
      `${device.name.padEnd(8)} ${scenario.label.padEnd(36)} idle: ${idleFrames.fps.toFixed(1)}fps, ${idleFrames.longPct.toFixed(1)}% long, main-thread ${(t1 - t0).toFixed(2)}s/6s | menu: ${menu.longPct.toFixed(1)}% long, worst ${menu.worst.toFixed(0)}ms`,
    );
  }

  await context.close();
  return results;
}

async function run() {
  const browser = await chromium.launch();
  for (const device of DEVICES) {
    await runDevice(browser, device);
  }
  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
