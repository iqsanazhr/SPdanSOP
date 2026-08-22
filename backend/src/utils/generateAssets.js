import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateAssets() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const assetsDir = path.resolve(__dirname, '../../assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // 1. Convert logo webp to PNG
  const logoWebpPath = path.resolve(__dirname, '../../../frontend/public/logobanjarnegara.webp');
  if (fs.existsSync(logoWebpPath)) {
    const webpBase64 = fs.readFileSync(logoWebpPath).toString('base64');
    await page.setContent(`<img id="logo" src="data:image/webp;base64,${webpBase64}" style="width:160px;height:160px;object-fit:contain;" />`);
    const logoEl = await page.$('#logo');
    await logoEl.screenshot({ path: path.join(assetsDir, 'logo_banjarnegara.png'), omitBackground: true });
    console.log('Logo converted to PNG successfully');
  }

  // 2. Generate shape kapsul
  await page.setContent('<div style="display:inline-block;padding:2px;"><svg id="kapsul" width="60" height="30" viewBox="0 0 60 30"><rect x="2" y="2" width="56" height="26" rx="13" ry="13" fill="#F6A04D" stroke="#000000" stroke-width="2" /></svg></div>');
  const kapsulEl = await page.$('#kapsul');
  await kapsulEl.screenshot({ path: path.join(assetsDir, 'shape_kapsul.png'), omitBackground: true });

  // 3. Generate shape belah ketupat
  await page.setContent('<div style="display:inline-block;padding:2px;"><svg id="rhombus" width="60" height="30" viewBox="0 0 60 30"><polygon points="30,2 58,15 30,28 2,15" fill="#F6A04D" stroke="#000000" stroke-width="2" /></svg></div>');
  const rhombusEl = await page.$('#rhombus');
  await rhombusEl.screenshot({ path: path.join(assetsDir, 'shape_belah_ketupat.png'), omitBackground: true });

  // 4. Generate shape kotak
  await page.setContent('<div style="display:inline-block;padding:2px;"><svg id="kotak" width="60" height="30" viewBox="0 0 60 30"><rect x="2" y="2" width="56" height="26" fill="#F6A04D" stroke="#000000" stroke-width="2" /></svg></div>');
  const kotakEl = await page.$('#kotak');
  await kotakEl.screenshot({ path: path.join(assetsDir, 'shape_kotak.png'), omitBackground: true });

  console.log('All shape assets generated successfully in', assetsDir);
  await browser.close();
}

generateAssets().catch(console.error);
