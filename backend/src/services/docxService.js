import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun,
  PageOrientation,
  PageBreak,
  VerticalAlign,
} from 'docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetsDir = path.resolve(__dirname, '../../assets');

function getAssetBuffer(filename) {
  try {
    const fullPath = path.join(assetsDir, filename);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath);
    }
  } catch (e) {
    console.error('Error reading asset:', filename, e);
  }
  return null;
}

function parseInlineFormatting(text) {
  const clean = (text || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");

  if (/<(b|strong)>/i.test(clean)) {
    const parts = clean.split(/<\/?(?:b|strong)>/i);
    return parts
      .map((part, idx) => {
        const plain = part.replace(/<[^>]*>?/gm, '');
        if (!plain) return null;
        return new TextRun({
          text: plain,
          bold: idx % 2 === 1,
          font: 'Arial',
          size: 19,
        });
      })
      .filter(Boolean);
  }

  const plainText = clean.replace(/<[^>]*>?/gm, '');
  return [new TextRun({ text: plainText, font: 'Arial', size: 19 })];
}

function parseHtmlToDocxParagraphs(htmlString, indentMm) {
  if (!htmlString || !htmlString.trim()) {
    return [
      new Paragraph({
        children: [new TextRun({ text: '-', font: 'Arial', size: 19 })],
      }),
    ];
  }

  const leftIndentDxa = indentMm ? Math.round(indentMm * 56.7) : 0;

  let formatted = htmlString
    .replace(/<ol[^>]*>/gi, '')
    .replace(/<\/ol>/gi, '')
    .replace(/<ul[^>]*>/gi, '')
    .replace(/<\/ul>/gi, '')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/li>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n');

  const lines = formatted
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [
      new Paragraph({
        children: [new TextRun({ text: '-', font: 'Arial', size: 19 })],
      }),
    ];
  }

  return lines.map((line) => {
    const isBullet = line.startsWith('• ');
    const contentText = isBullet ? line.substring(2) : line;
    const runs = parseInlineFormatting(contentText);

    return new Paragraph({
      indent: leftIndentDxa > 0 ? { left: leftIndentDxa } : undefined,
      spacing: { after: 30, line: 240 },
      children: isBullet
        ? [new TextRun({ text: '•  ', bold: true, font: 'Arial', size: 19 }), ...runs]
        : runs,
    });
  });
}

const tableBorder = {
  style: BorderStyle.SINGLE,
  size: 6,
  color: '000000',
};

const defaultTableBorders = {
  top: tableBorder,
  bottom: tableBorder,
  left: tableBorder,
  right: tableBorder,
  insideHorizontal: tableBorder,
  insideVertical: tableBorder,
};

async function generateSpDocx(document) {
  const sigTitle =
    document.signatoryTitle ||
    'KEPALA BADAN KEPEGAWAIAN\nDAN PENGEMBANGAN SUMBER DAYA MANUSIA\nKABUPATEN BANJARNEGARA';
  const sigName = document.signatoryName || 'ESTI WIDODO';

  const sectionChildren = [];

  // HEADER
  sectionChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: 'STANDAR PELAYANAN PUBLIK',
          bold: true,
          font: 'Arial',
          size: 26,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `JENIS LAYANAN : ${document.serviceType || 'LEGALISASI'}`,
          bold: true,
          font: 'Arial',
          size: 21,
        }),
      ],
    })
  );

  const colWidths = [700, 3200, 6500]; // Total 10400 dxa for Portrait
  const tableRows = [
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: colWidths[0], type: WidthType.DXA },
          shading: { fill: 'F2F2F2' },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'NO', bold: true, font: 'Arial', size: 20 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: colWidths[1], type: WidthType.DXA },
          shading: { fill: 'F2F2F2' },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'KOMPONEN', bold: true, font: 'Arial', size: 20 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: colWidths[2], type: WidthType.DXA },
          shading: { fill: 'F2F2F2' },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'URAIAN', bold: true, font: 'Arial', size: 20 })],
            }),
          ],
        }),
      ],
    }),
  ];

  const components = document.components || [];
  for (const comp of components) {
    const uraianParagraphs = parseHtmlToDocxParagraphs(comp.uraian, comp.indentMm);
    tableRows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: colWidths[0], type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `${comp.order}.`, bold: true, font: 'Arial', size: 19 }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: colWidths[1], type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: comp.name, bold: true, font: 'Arial', size: 19 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: colWidths[2], type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            children: uraianParagraphs,
          }),
        ],
      })
    );
  }

  sectionChildren.push(
    new Table({
      columnWidths: colWidths,
      rows: tableRows,
      width: { size: 10400, type: WidthType.DXA },
      borders: defaultTableBorders,
    })
  );

  // SIGNATURE BLOCK
  const sigTitleLines = sigTitle.split('\n');
  const sigParagraphs = sigTitleLines.map(
    (line) =>
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 30 },
        children: [new TextRun({ text: line, bold: true, font: 'Arial', size: 19 })],
      })
  );

  if (document.signatureImage && document.signatureImage.startsWith('data:image')) {
    try {
      const base64Data = document.signatureImage.split(',')[1];
      const imageBuffer = Buffer.from(base64Data, 'base64');
      sigParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 80, after: 80 },
          children: [
            new ImageRun({
              data: imageBuffer,
              transformation: { width: 140, height: 70 },
              type: 'png',
            }),
          ],
        })
      );
    } catch (e) {
      sigParagraphs.push(new Paragraph({ spacing: { before: 300 }, children: [] }));
    }
  } else {
    sigParagraphs.push(new Paragraph({ spacing: { before: 300 }, children: [] }));
  }

  sigParagraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: sigName, bold: true, font: 'Arial', size: 20 })],
    })
  );

  sectionChildren.push(
    new Paragraph({ spacing: { before: 240 }, children: [] }),
    new Table({
      width: { size: 10400, type: WidthType.DXA },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 5200, type: WidthType.DXA },
              children: [new Paragraph({ children: [] })],
            }),
            new TableCell({
              width: { size: 5200, type: WidthType.DXA },
              children: sigParagraphs,
            }),
          ],
        }),
      ],
    })
  );

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1134, bottom: 1361, left: 850, right: 850 },
          },
        },
        children: sectionChildren,
      },
    ],
  });
}

function buildSopIdentityTable(document) {
  let sopContent = {};
  try {
    sopContent = typeof document.contentData === 'string'
      ? JSON.parse(document.contentData || '{}')
      : (document.contentData || {});
  } catch (e) {
    sopContent = {};
  }

  const identity = sopContent.identity || {};
  let activeLogoBuffer = null;
  if (identity.logoImage && identity.logoImage.startsWith('data:image')) {
    try {
      const base64Data = identity.logoImage.split(',')[1];
      activeLogoBuffer = Buffer.from(base64Data, 'base64');
    } catch (e) {
      activeLogoBuffer = getAssetBuffer('logo_banjarnegara.png');
    }
  } else {
    activeLogoBuffer = getAssetBuffer('logo_banjarnegara.png');
  }

  const colIdentityWidths = [5200, 10000]; // Total 15200 dxa
  const headerLeftChildren = [];

  if (activeLogoBuffer) {
    headerLeftChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [
          new ImageRun({
            data: activeLogoBuffer,
            transformation: { width: 65, height: 65 },
            type: 'png',
          }),
        ],
      })
    );
  }

  headerLeftChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: identity.namaInstansi || 'PEMERINTAH KABUPATEN BANJARNEGARA',
          bold: true,
          font: 'Arial',
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: identity.namaOrganisasi || 'BKPSDM',
          font: 'Arial',
          size: 18,
        }),
      ],
    })
  );

  const identityRows = [
    new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: colIdentityWidths[0], type: WidthType.DXA },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          verticalAlign: VerticalAlign.CENTER,
          children: headerLeftChildren,
        }),
        new TableCell({
          width: { size: colIdentityWidths[1], type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({
              spacing: { after: 30 },
              children: [
                new TextRun({ text: 'Nomor SOP: ', bold: true, font: 'Arial', size: 18 }),
                new TextRun({ text: identity.nomorSOP || '-', font: 'Arial', size: 18 }),
              ],
            }),
            new Paragraph({
              spacing: { after: 30 },
              children: [
                new TextRun({ text: 'Tanggal Pembuatan: ', bold: true, font: 'Arial', size: 18 }),
                new TextRun({ text: identity.tanggalPembuatan || '-', font: 'Arial', size: 18 }),
              ],
            }),
            new Paragraph({
              spacing: { after: 30 },
              children: [
                new TextRun({ text: 'Tanggal Revisi: ', bold: true, font: 'Arial', size: 18 }),
                new TextRun({ text: identity.tanggalRevisi || '-', font: 'Arial', size: 18 }),
              ],
            }),
            new Paragraph({
              spacing: { after: 30 },
              children: [
                new TextRun({ text: 'Tanggal Pengesahan: ', bold: true, font: 'Arial', size: 18 }),
                new TextRun({ text: identity.tanggalPengesahan || '-', font: 'Arial', size: 18 }),
              ],
            }),
            new Paragraph({
              spacing: { after: 30 },
              children: [
                new TextRun({ text: 'Disahkan Oleh: ', bold: true, font: 'Arial', size: 18 }),
                new TextRun({ text: identity.disahkanOlehJabatan || '-', bold: true, font: 'Arial', size: 18 }),
              ],
            }),
            new Paragraph({
              spacing: { after: 30 },
              children: [
                new TextRun({ text: 'Nama SOP: ', bold: true, font: 'Arial', size: 19 }),
                new TextRun({ text: document.title || '-', bold: true, font: 'Arial', size: 19 }),
              ],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: 7600, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'DASAR HUKUM:', bold: true, font: 'Arial', size: 19 })] }),
            ...parseHtmlToDocxParagraphs(identity.dasarHukum || '1. PermenPAN & RB Nomor 35 Tahun 2012'),
          ],
        }),
        new TableCell({
          width: { size: 7600, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'KUALIFIKASI PELAKSANA:', bold: true, font: 'Arial', size: 19 })] }),
            ...parseHtmlToDocxParagraphs(identity.kualifikasiPelaksana || '1. Memahami prosedur operasional standar'),
          ],
        }),
      ],
    }),
    new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: 7600, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'KETERKAITAN:', bold: true, font: 'Arial', size: 19 })] }),
            ...parseHtmlToDocxParagraphs(identity.keterkaitan || '1. SOP Pelayanan Administrasi'),
          ],
        }),
        new TableCell({
          width: { size: 7600, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'PERALATAN / PERLENGKAPAN:', bold: true, font: 'Arial', size: 19 })] }),
            ...parseHtmlToDocxParagraphs(identity.peralatanPerlengkapan || '1. Komputer / Laptop, Printer, ATK'),
          ],
        }),
      ],
    }),
    new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: 7600, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'PERINGATAN:', bold: true, font: 'Arial', size: 19 })] }),
            ...parseHtmlToDocxParagraphs(identity.peringatan || 'Jika SOP tidak dipatuhi, layanan standar dapat terhambat.'),
          ],
        }),
        new TableCell({
          width: { size: 7600, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'PENCATATAN DAN PENDATAAN:', bold: true, font: 'Arial', size: 19 })] }),
            ...parseHtmlToDocxParagraphs(identity.pencatatan || 'Disimpan dalam bentuk fisik dan database digital.'),
          ],
        }),
      ],
    }),
  ];

  return new Table({
    columnWidths: colIdentityWidths,
    rows: identityRows,
    width: { size: 15200, type: WidthType.DXA },
    borders: defaultTableBorders,
  });
}

async function captureFlowchartPages(html) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1123, height: 794 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForTimeout(100);

    const sheets = await page.$$('.sop-print-sheet, .a4-paper-sheet-landscape');
    const images = [];

    for (let i = 0; i < sheets.length; i++) {
      // Lewati lembar pertama (Identitas SOP) jika ada lebih dari 1 lembar, karena Halaman 1 dibuat sebagai Native Editable Word Table
      if (sheets.length > 1 && i === 0) continue;
      const buf = await sheets[i].screenshot({ type: 'png' });
      images.push(buf);
    }

    return images;
  } finally {
    if (browser) await browser.close();
  }
}

export async function generateDocxBuffer(document, previewHtml = null) {
  const isSop = document.type === 'SOP';

  if (!isSop) {
    const docxDoc = await generateSpDocx(document);
    return await Packer.toBuffer(docxDoc);
  }

  // UNTUK DOKUMEN SOP:
  // Halaman 1: Native Editable Word Table (Kop, Logo Banjarnegara, Dasar Hukum, Kualifikasi, dll)
  // Halaman 2+: Flowchart Image Snapshot Resolusi Tinggi (Menjamin panah, bentuk, dan ukuran kolom 100% presisi tanpa rusak)
  const identityTable = buildSopIdentityTable(document);
  const sections = [];

  // SECTION 1: IDENTITAS SOP
  sections.push({
    properties: {
      page: {
        orientation: PageOrientation.LANDSCAPE,
        size: { width: 16838, height: 11906 },
        margin: { top: 800, bottom: 800, left: 800, right: 800 },
      },
    },
    children: [identityTable],
  });

  // SECTION 2+: FLOWCHART IMAGE PAGES
  let flowchartImages = [];
  if (previewHtml) {
    try {
      flowchartImages = await captureFlowchartPages(previewHtml);
    } catch (err) {
      console.error('Error capturing flowchart pages:', err);
    }
  }

  for (const imgBuf of flowchartImages) {
    sections.push({
      properties: {
        page: {
          orientation: PageOrientation.LANDSCAPE,
          size: { width: 16838, height: 11906 },
          margin: { top: 400, bottom: 400, left: 400, right: 400 },
        },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: imgBuf,
              transformation: { width: 750, height: 530 },
              type: 'png',
            }),
          ],
        }),
      ],
    });
  }

  const docxDoc = new Document({ sections });
  return await Packer.toBuffer(docxDoc);
}
