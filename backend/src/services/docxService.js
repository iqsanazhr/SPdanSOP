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
} from 'docx';

function parseInlineFormatting(text) {
  const clean = text
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
          size: 22,
        });
      })
      .filter(Boolean);
  }

  const plainText = clean.replace(/<[^>]*>?/gm, '');
  return [new TextRun({ text: plainText, font: 'Arial', size: 22 })];
}

function parseHtmlToDocxParagraphs(htmlString, indentMm) {
  if (!htmlString || !htmlString.trim()) {
    return [
      new Paragraph({
        children: [new TextRun({ text: '-', font: 'Arial', size: 22 })],
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
        children: [new TextRun({ text: '-', font: 'Arial', size: 22 })],
      }),
    ];
  }

  return lines.map((line) => {
    const isBullet = line.startsWith('• ');
    const contentText = isBullet ? line.substring(2) : line;
    const runs = parseInlineFormatting(contentText);

    return new Paragraph({
      indent: leftIndentDxa > 0 ? { left: leftIndentDxa } : undefined,
      spacing: { after: 60, line: 280 },
      children: isBullet
        ? [new TextRun({ text: '•  ', bold: true, font: 'Arial', size: 22 }), ...runs]
        : runs,
    });
  });
}

export async function generateDocxBuffer(document) {
  const sigTitle =
    document.signatoryTitle ||
    'KEPALA BADAN KEPEGAWAIAN\nDAN PENGEMBANGAN SUMBER DAYA MANUSIA\nKABUPATEN BANJARNEGARA';
  const sigName = document.signatoryName || 'ESTI WIDODO';

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

  const sectionChildren = [];

  // HEADER
  sectionChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'STANDAR PELAYANAN PUBLIK',
          bold: true,
          font: 'Arial',
          size: 28,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `JENIS LAYANAN : ${document.serviceType || 'LEGALISASI'}`,
          bold: true,
          font: 'Arial',
          size: 22,
        }),
      ],
    })
  );

  // SINGLE CONTINUOUS TABLE - ALL COMPONENTS
  const tableRows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 6, type: WidthType.PERCENTAGE },
          shading: { fill: 'F2F2F2' },
          margins: { top: 120, bottom: 120, left: 120, right: 120 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'NO', bold: true, font: 'Arial', size: 21 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          shading: { fill: 'F2F2F2' },
          margins: { top: 120, bottom: 120, left: 120, right: 120 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'KOMPONEN', bold: true, font: 'Arial', size: 21 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 64, type: WidthType.PERCENTAGE },
          shading: { fill: 'F2F2F2' },
          margins: { top: 120, bottom: 120, left: 120, right: 120 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'URAIAN', bold: true, font: 'Arial', size: 21 })],
            }),
          ],
        }),
      ],
    }),
  ];

  for (const comp of document.components) {
    const uraianParagraphs = parseHtmlToDocxParagraphs(comp.uraian, comp.indentMm);
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 6, type: WidthType.PERCENTAGE },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `${comp.order}.`, bold: true, font: 'Arial', size: 22 }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: comp.name, bold: true, font: 'Arial', size: 22 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 64, type: WidthType.PERCENTAGE },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: uraianParagraphs,
          }),
        ],
      })
    );
  }

  sectionChildren.push(
    new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: defaultTableBorders,
    })
  );

  // SIGNATURE BLOCK
  const sigTitleLines = sigTitle.split('\n');
  const sigParagraphs = sigTitleLines.map(
    (line) =>
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [new TextRun({ text: line, bold: true, font: 'Arial', size: 21 })],
      })
  );

  if (document.signatureImage && document.signatureImage.startsWith('data:image')) {
    try {
      const base64Data = document.signatureImage.split(',')[1];
      const imageBuffer = Buffer.from(base64Data, 'base64');
      sigParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 140, after: 140 },
          children: [
            new ImageRun({
              data: imageBuffer,
              transformation: { width: 150, height: 75 },
              type: 'png',
            }),
          ],
        })
      );
    } catch (e) {
      console.error('Error inserting signature image into docx:', e);
      sigParagraphs.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
    }
  } else {
    sigParagraphs.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
  }

  sigParagraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: sigName, bold: true, font: 'Arial', size: 22 })],
    })
  );

  sectionChildren.push(
    new Paragraph({ spacing: { before: 400 }, children: [] }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
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
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [] })],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: sigParagraphs,
            }),
          ],
        }),
      ],
    })
  );

  // Construct Document
  const docxDocument = new Document({
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

  return await Packer.toBuffer(docxDocument);
}
