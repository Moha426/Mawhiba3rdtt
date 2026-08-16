import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/platforms', { waitUntil: 'networkidle' });
  const html = await page.content();
  console.log(html.substring(0, 1000));
  await page.screenshot({ path: 'screenshot.png' });
  await browser.close();
})();
