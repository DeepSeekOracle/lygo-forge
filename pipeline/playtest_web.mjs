#!/usr/bin/env node
/**
 * Forge Web playtest probe.
 *
 * Usage:
 *   node playtest_web.mjs --url http://127.0.0.1:8796/ --out outbox/playtest \
 *     --actions '[{"type":"click","selector":"#play"},{"type":"key","key":"ArrowRight"},{"type":"wait","ms":1500}]'
 *
 * Captures: screenshot, console errors, page errors, title, viewport, a 1s FPS
 * sample, and resource failures. It does not judge fun; it proves the build
 * loads, renders and responds to the scripted input.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const pwPath = process.env.PLAYWRIGHT_PATH || '<USER>/source/LYGOapps/node_modules/playwright';
const { chromium } = require(pwPath);

function arg(name, fallback = '') {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const url = arg('url');
const out = path.resolve(arg('out', 'outbox/playtest'));
const waitMs = Number(arg('wait', '2500'));
const actions = JSON.parse(arg('actions', '[]'));
if (!url) {
  console.error('missing --url');
  process.exit(2);
}
fs.mkdirSync(out, { recursive: true });

const report = {
  started: new Date().toISOString(),
  url,
  ok: false,
  title: '',
  consoleErrors: [],
  pageErrors: [],
  requestFailures: [],
  actions: [],
  fps: null,
  screenshot: '',
  error: null,
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.on('console', (msg) => {
  if (msg.type() === 'error') report.consoleErrors.push(msg.text().slice(0, 800));
});
page.on('pageerror', (err) => report.pageErrors.push(String(err).slice(0, 1200)));
page.on('requestfailed', (req) => {
  report.requestFailures.push({ url: req.url().slice(0, 500), error: req.failure()?.errorText || 'failed' });
});

try {
  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  report.status = response?.status() ?? null;
  await page.waitForTimeout(waitMs);
  report.title = await page.title();

  for (const action of actions) {
    try {
      if (action.type === 'click') {
        await page.locator(action.selector).first().click({ timeout: action.timeout || 8000 });
      } else if (action.type === 'key') {
        await page.keyboard.press(action.key);
      } else if (action.type === 'wait') {
        await page.waitForTimeout(Number(action.ms || 500));
      } else if (action.type === 'eval') {
        await page.evaluate(action.script || '');
      }
      report.actions.push({ ...action, ok: true });
    } catch (err) {
      report.actions.push({ ...action, ok: false, error: String(err).slice(0, 800) });
    }
  }

  report.fps = await page.evaluate(async () => {
    return await new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      const tick = () => {
        frames++;
        if (performance.now() - start >= 1000) resolve(frames);
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  });

  const shot = path.join(out, 'screen.png');
  await page.screenshot({ path: shot, fullPage: false });
  report.screenshot = shot;
  report.ok = report.pageErrors.length === 0 && report.consoleErrors.length === 0 && (report.status || 0) < 400;
} catch (err) {
  report.error = String(err).slice(0, 1600);
} finally {
  await browser.close();
  report.finished = new Date().toISOString();
  const file = path.join(out, 'playtest-report.json');
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, screenshot: report.screenshot, report: file, fps: report.fps, errors: report.pageErrors.length + report.consoleErrors.length, status: report.status, error: report.error }, null, 2));
  process.exit(report.ok ? 0 : 1);
}

