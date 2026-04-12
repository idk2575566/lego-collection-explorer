import { chromium } from 'playwright';

const url = process.argv[2];
if (!url) throw new Error('Usage: node scripts/fetch-tfwiki-image.mjs <tfwiki-article-or-file-url>');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // Look for a File: link or the main image in the infobox
  const fileHref = await page.$eval('link[rel="canonical"]', el => el.href).catch(() => null);

  // Try to find a File: page or main image
  const filePage = await page.$eval('.mw-filepage-link a, .image a[href*="/wiki/File:"]', el => el.href).catch(async () => {
    // fallback: find an image in the infobox
    const src = await page.$eval('.infobox img, .thumbimage, .image img', el => el.src).catch(() => null);
    return src;
  });

  // If filePage is a full file page, compute Special:FilePath
  let direct = null;
  if (filePage && filePage.includes('/wiki/File:')) {
    const parts = filePage.split('/wiki/File:');
    const fileName = parts[1];
    direct = `https://tfwiki.net/wiki/Special:FilePath/${fileName}`;
  } else if (filePage && (filePage.startsWith('http') && (filePage.endsWith('.jpg') || filePage.endsWith('.png')))) {
    direct = filePage;
  }

  console.log(JSON.stringify({ url, filePage, direct }, null, 2));
  await browser.close();
})();
