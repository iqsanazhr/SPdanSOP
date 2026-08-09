"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePdfBuffer = generatePdfBuffer;
const playwright_1 = require("playwright");
async function generatePdfBuffer(document) {
    const sigTitle = document.signatoryTitle || 'KEPALA BADAN KEPEGAWAIAN\nDAN PENGEMBANGAN SUMBER DAYA MANUSIA\nKABUPATEN BANJARNEGARA';
    const sigName = document.signatoryName || 'ESTI WIDODO';
    const tableRowsHtml = document.components
        .map((comp) => `
      <tr>
        <td class="col-no">${comp.order}.</td>
        <td class="col-komponen">${escapeHtml(comp.name)}</td>
        <td class="col-uraian" style="${comp.indentMm ? `padding-left: ${comp.indentMm}mm;` : ''}">${comp.uraian || ''}</td>
      </tr>
    `)
        .join('');
    const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(document.title)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 20mm 15mm 24mm 15mm;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
    }
    .header {
      margin-bottom: 18px;
    }
    .header h1 {
      font-size: 14pt;
      font-weight: bold;
      margin: 0 0 10px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: center;
    }
    .header h2 {
      font-size: 11pt;
      font-weight: bold;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
    }
    table.sp-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      table-layout: fixed;
    }
    table.sp-table thead {
      display: table-header-group;
    }
    table.sp-table tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    table.sp-table th, table.sp-table td {
      border: 1px solid #000;
      padding: 8px 10px;
      vertical-align: top;
      overflow-wrap: break-word;
      word-wrap: break-word;
      word-break: break-word;
    }
    table.sp-table th {
      background-color: #f2f2f2;
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
      font-size: 10pt;
    }
    .col-no {
      width: 6%;
      text-align: center;
    }
    .col-komponen {
      width: 32%;
      font-weight: 600;
    }
    .col-uraian {
      width: 62%;
    }
    .col-uraian p {
      margin: 0 0 6px 0;
    }
    .col-uraian p:last-child {
      margin-bottom: 0;
    }
    .col-uraian ol {
      list-style-type: decimal;
      padding-left: 22px;
      margin: 4px 0;
    }
    .col-uraian ol ol {
      list-style-type: lower-alpha;
      padding-left: 22px;
      margin: 2px 0;
    }
    .col-uraian ul {
      list-style-type: disc;
      padding-left: 22px;
      margin: 4px 0;
    }
    .col-uraian ul ul {
      list-style-type: circle;
      padding-left: 22px;
      margin: 2px 0;
    }
    .signature-block {
      margin-top: 36px;
      margin-left: auto;
      width: 360px;
      text-align: center;
    }
    .sig-title {
      font-size: 10.5pt;
      font-weight: bold;
      line-height: 1.3;
      text-transform: uppercase;
      white-space: pre-line;
    }
    .sig-stamp-container {
      height: 90px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 8px 0;
    }
    .sig-stamp-img {
      max-height: 90px;
      max-width: 280px;
      object-fit: contain;
    }
    .sig-name {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>STANDAR PELAYANAN PUBLIK</h1>
    <h2>JENIS LAYANAN : ${escapeHtml(document.serviceType || 'LEGALISASI')}</h2>
  </div>

  <table class="sp-table">
    <thead>
      <tr>
        <th class="col-no">NO</th>
        <th class="col-komponen">KOMPONEN</th>
        <th class="col-uraian">URAIAN</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>

  <div class="signature-block">
    <div class="sig-title">${escapeHtml(sigTitle)}</div>
    <div class="sig-stamp-container">
      ${document.signatureImage ? `<img src="${document.signatureImage}" class="sig-stamp-img" alt="Cap & Tanda Tangan" />` : ''}
    </div>
    <div class="sig-name">${escapeHtml(sigName)}</div>
  </div>
</body>
</html>
  `;
    let browser;
    try {
        browser = await playwright_1.chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.setContent(htmlContent, { waitUntil: 'load' });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                bottom: '24mm',
                left: '15mm',
                right: '15mm',
            },
        });
        return pdfBuffer;
    }
    finally {
        if (browser) {
            await browser.close();
        }
    }
}
function escapeHtml(str) {
    if (!str)
        return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
