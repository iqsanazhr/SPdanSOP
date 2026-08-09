import { chromium } from 'playwright';

export async function generatePdfBuffer(docData) {
  const sigTitle =
    docData.signatoryTitle ||
    'KEPALA BADAN KEPEGAWAIAN\nDAN PENGEMBANGAN SUMBER DAYA MANUSIA\nKABUPATEN BANJARNEGARA';
  const sigName = docData.signatoryName || 'ESTI WIDODO';

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Execute exact browser DOM pagination inside Chromium via page.evaluate
    const pageGroups = await page.evaluate((doc) => {
      function parseHtmlBlocks(html) {
        if (!html) return [];
        const div = document.createElement('div');
        div.innerHTML = html;
        const blocks = [];

        if (div.children.length > 0) {
          Array.from(div.children).forEach((child) => {
            const outer = child.outerHTML;
            const clean = child.textContent || '';
            if (clean.trim()) {
              blocks.push({ html: outer, cleanText: clean });
            }
          });
        }
        if (blocks.length === 0) {
          const paragraphs = html.split(/\n+/).filter(Boolean);
          paragraphs.forEach((p) => {
            const clean = p.replace(/<[^>]*>/g, '').trim();
            if (clean) {
              blocks.push({ html: p.includes('<') ? p : `<p>${p}</p>`, cleanText: clean });
            }
          });
        }
        if (blocks.length === 0 && html.trim()) {
          blocks.push({ html, cleanText: html.replace(/<[^>]*>/g, '') });
        }

        return blocks;
      }

      function splitLongBlock(blockHtml, maxChars) {
        const clean = blockHtml.replace(/<[^>]*>/g, '');
        if (clean.length <= maxChars) return [blockHtml, ''];

        let cutIdx = maxChars;
        for (let i = maxChars; i > Math.max(10, maxChars - 30); i--) {
          if (/[\s\n%&=/?#_\-.]/.test(clean[i])) {
            cutIdx = i;
            break;
          }
        }

        const p1 = clean.substring(0, cutIdx);
        const p2 = clean.substring(cutIdx);

        return [`<p>${p1}</p>`, `<p>${p2}</p>`];
      }

      const components = doc.components || [];
      if (components.length === 0) return [[]];

      const page1Capacity = 808;
      const nextPageCapacity = 918;
      const sigHeight = 190;

      const pages = [];
      let currentPage = [];
      let currentH = 0;
      let pageIdx = 0;

      for (let i = 0; i < components.length; i++) {
        const comp = components[i];
        const isLastComp = i === components.length - 1;
        const capacity = pageIdx === 0 ? page1Capacity : nextPageCapacity;
        const neededSig = isLastComp ? sigHeight : 0;

        const blocks = parseHtmlBlocks(comp.uraian || '');
        const nameLines = Math.max(1, Math.ceil((comp.name || '').length / 25));
        const nameH = nameLines * 22 + 20;

        const blockHeights = blocks.map((b) => {
          const lines = Math.max(1, Math.ceil(b.cleanText.length / 50));
          return lines * 22 + 8;
        });
        const totalBlocksH = blockHeights.reduce((a, b) => a + b, 0);
        const compFullH = Math.max(nameH, totalBlocksH);

        if (currentH + compFullH + neededSig <= capacity) {
          currentPage.push({
            id: comp.id,
            order: comp.order,
            name: comp.name,
            uraian: comp.uraian,
            indentMm: comp.indentMm,
          });
          currentH += compFullH;
        } else {
          const availH = capacity - currentH - nameH - 16;

          if (availH > 50) {
            const p1Blocks = [];
            const p2Blocks = [];
            let fitH = nameH;

            for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
              const bH = blockHeights[bIdx];
              const remCap = capacity - currentH - fitH;

              if (remCap >= bH) {
                p1Blocks.push(blocks[bIdx].html);
                fitH += bH;
              } else if (remCap > 40) {
                const maxCharsForPage1 = Math.max(30, Math.floor(((remCap - 16) / 22) * 50));
                const [p1Html, p2Html] = splitLongBlock(blocks[bIdx].html, maxCharsForPage1);
                if (p1Html) p1Blocks.push(p1Html);
                if (p2Html) p2Blocks.push(p2Html);
                for (let remainingIdx = bIdx + 1; remainingIdx < blocks.length; remainingIdx++) {
                  p2Blocks.push(blocks[remainingIdx].html);
                }
                break;
              } else {
                for (let remainingIdx = bIdx; remainingIdx < blocks.length; remainingIdx++) {
                  p2Blocks.push(blocks[remainingIdx].html);
                }
                break;
              }
            }

            if (p1Blocks.length > 0 && p2Blocks.length > 0) {
              currentPage.push({
                id: comp.id,
                order: comp.order,
                name: comp.name,
                uraian: p1Blocks.join(''),
                indentMm: comp.indentMm,
              });
              pages.push(currentPage);

              currentPage = [
                {
                  id: `${comp.id}-cont-${pageIdx + 1}`,
                  order: undefined,
                  name: '',
                  uraian: p2Blocks.join(''),
                  indentMm: comp.indentMm,
                  isContinuation: true,
                },
              ];
              currentH = p2Blocks.reduce((acc, b) => {
                const clean = b.replace(/<[^>]*>/g, '');
                return acc + Math.max(1, Math.ceil(clean.length / 50)) * 22 + 8;
              }, 30);
              pageIdx++;
            } else {
              if (currentPage.length > 0) {
                pages.push(currentPage);
                pageIdx++;
              }
              currentPage = [
                {
                  id: comp.id,
                  order: comp.order,
                  name: comp.name,
                  uraian: comp.uraian,
                  indentMm: comp.indentMm,
                },
              ];
              currentH = compFullH;
            }
          } else {
            if (currentPage.length > 0) {
              pages.push(currentPage);
              pageIdx++;
            }
            currentPage = [
              {
                id: comp.id,
                order: comp.order,
                name: comp.name,
                uraian: comp.uraian,
                indentMm: comp.indentMm,
              },
            ];
            currentH = compFullH;
          }
        }
      }

      if (currentPage.length > 0 || pages.length === 0) {
        pages.push(currentPage);
      }

      return pages;
    }, docData);

    const pagesHtml = pageGroups
      .map((pageComponents, pageIdx) => {
        const isFirstPage = pageIdx === 0;
        const isLastPage = pageIdx === pageGroups.length - 1;

        const rowsHtml = pageComponents
          .map(
            (comp) => `
            <tr>
              <td class="col-no">${!comp.isContinuation && comp.order ? `${comp.order}.` : ''}</td>
              <td class="col-komponen">${!comp.isContinuation ? escapeHtml(comp.name) : ''}</td>
              <td class="col-uraian" style="${comp.indentMm ? `padding-left: ${comp.indentMm}mm;` : ''}">${comp.uraian || ''}</td>
            </tr>
          `
          )
          .join('');

        return `
          <div class="page-sheet">
            ${
              isFirstPage
                ? `
              <div class="header">
                <h1>STANDAR PELAYANAN PUBLIK</h1>
                <h2>JENIS LAYANAN : ${escapeHtml(docData.serviceType || 'LEGALISASI')}</h2>
              </div>
            `
                : ''
            }

            <table class="sp-table">
              <thead>
                <tr>
                  <th class="col-no">NO</th>
                  <th class="col-komponen">KOMPONEN</th>
                  <th class="col-uraian">URAIAN</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            ${
              isLastPage
                ? `
              <div class="signature-block">
                <div class="sig-title">${escapeHtml(sigTitle)}</div>
                <div class="sig-stamp-container">
                  ${docData.signatureImage ? `<img src="${docData.signatureImage}" class="sig-stamp-img" alt="Cap & Tanda Tangan" />` : ''}
                </div>
                <div class="sig-name">${escapeHtml(sigName)}</div>
              </div>
            `
                : ''
            }
          </div>
        `;
      })
      .join('');

    const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(docData.title)}</title>
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
    .page-sheet {
      page-break-after: always;
      break-after: page;
    }
    .page-sheet:last-child {
      page-break-after: avoid;
      break-after: avoid;
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
      border: 1px solid #000000;
      border-collapse: collapse;
      margin-top: 10px;
      table-layout: fixed;
    }
    table.sp-table th, table.sp-table td {
      border: 1px solid #000000;
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
      width: 30%;
      font-weight: 600;
    }
    .col-uraian {
      width: 64%;
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
  ${pagesHtml}
</body>
</html>
    `;

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
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
