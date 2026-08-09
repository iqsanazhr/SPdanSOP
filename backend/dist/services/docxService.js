"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDocxBuffer = generateDocxBuffer;
const docx_1 = require("docx");
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
            if (!plain)
                return null;
            return new docx_1.TextRun({
                text: plain,
                bold: idx % 2 === 1,
                font: 'Arial',
                size: 22,
            });
        })
            .filter(Boolean);
    }
    const plainText = clean.replace(/<[^>]*>?/gm, '');
    return [new docx_1.TextRun({ text: plainText, font: 'Arial', size: 22 })];
}
function parseHtmlToDocxParagraphs(htmlString, indentMm) {
    if (!htmlString || !htmlString.trim()) {
        return [
            new docx_1.Paragraph({
                children: [new docx_1.TextRun({ text: '-', font: 'Arial', size: 22 })],
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
            new docx_1.Paragraph({
                children: [new docx_1.TextRun({ text: '-', font: 'Arial', size: 22 })],
            }),
        ];
    }
    return lines.map((line) => {
        const isBullet = line.startsWith('• ');
        const contentText = isBullet ? line.substring(2) : line;
        const runs = parseInlineFormatting(contentText);
        return new docx_1.Paragraph({
            indent: leftIndentDxa > 0 ? { left: leftIndentDxa } : undefined,
            spacing: { after: 60, line: 280 },
            children: isBullet
                ? [new docx_1.TextRun({ text: '•  ', bold: true, font: 'Arial', size: 22 }), ...runs]
                : runs,
        });
    });
}
async function generateDocxBuffer(document) {
    const sigTitle = document.signatoryTitle ||
        'KEPALA BADAN KEPEGAWAIAN\nDAN PENGEMBANGAN SUMBER DAYA MANUSIA\nKABUPATEN BANJARNEGARA';
    const sigName = document.signatoryName || 'ESTI WIDODO';
    const tableBorder = {
        style: docx_1.BorderStyle.SINGLE,
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
    sectionChildren.push(new docx_1.Paragraph({
        alignment: docx_1.AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
            new docx_1.TextRun({
                text: 'STANDAR PELAYANAN PUBLIK',
                bold: true,
                font: 'Arial',
                size: 28,
            }),
        ],
    }), new docx_1.Paragraph({
        spacing: { after: 240 },
        children: [
            new docx_1.TextRun({
                text: `JENIS LAYANAN : ${document.serviceType || 'LEGALISASI'}`,
                bold: true,
                font: 'Arial',
                size: 22,
            }),
        ],
    }));
    // SINGLE CONTINUOUS TABLE - ALL COMPONENTS (Word handles page breaks naturally)
    const tableRows = [
        new docx_1.TableRow({
            tableHeader: true,
            children: [
                new docx_1.TableCell({
                    width: { size: 6, type: docx_1.WidthType.PERCENTAGE },
                    shading: { fill: 'F2F2F2' },
                    margins: { top: 120, bottom: 120, left: 120, right: 120 },
                    children: [
                        new docx_1.Paragraph({
                            alignment: docx_1.AlignmentType.CENTER,
                            children: [new docx_1.TextRun({ text: 'NO', bold: true, font: 'Arial', size: 21 })],
                        }),
                    ],
                }),
                new docx_1.TableCell({
                    width: { size: 30, type: docx_1.WidthType.PERCENTAGE },
                    shading: { fill: 'F2F2F2' },
                    margins: { top: 120, bottom: 120, left: 120, right: 120 },
                    children: [
                        new docx_1.Paragraph({
                            alignment: docx_1.AlignmentType.CENTER,
                            children: [new docx_1.TextRun({ text: 'KOMPONEN', bold: true, font: 'Arial', size: 21 })],
                        }),
                    ],
                }),
                new docx_1.TableCell({
                    width: { size: 64, type: docx_1.WidthType.PERCENTAGE },
                    shading: { fill: 'F2F2F2' },
                    margins: { top: 120, bottom: 120, left: 120, right: 120 },
                    children: [
                        new docx_1.Paragraph({
                            alignment: docx_1.AlignmentType.CENTER,
                            children: [new docx_1.TextRun({ text: 'URAIAN', bold: true, font: 'Arial', size: 21 })],
                        }),
                    ],
                }),
            ],
        }),
    ];
    for (const comp of document.components) {
        const uraianParagraphs = parseHtmlToDocxParagraphs(comp.uraian, comp.indentMm);
        tableRows.push(new docx_1.TableRow({
            children: [
                new docx_1.TableCell({
                    width: { size: 6, type: docx_1.WidthType.PERCENTAGE },
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    children: [
                        new docx_1.Paragraph({
                            alignment: docx_1.AlignmentType.CENTER,
                            children: [
                                new docx_1.TextRun({ text: `${comp.order}.`, bold: true, font: 'Arial', size: 22 }),
                            ],
                        }),
                    ],
                }),
                new docx_1.TableCell({
                    width: { size: 30, type: docx_1.WidthType.PERCENTAGE },
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    children: [
                        new docx_1.Paragraph({
                            children: [new docx_1.TextRun({ text: comp.name, bold: true, font: 'Arial', size: 22 })],
                        }),
                    ],
                }),
                new docx_1.TableCell({
                    width: { size: 64, type: docx_1.WidthType.PERCENTAGE },
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    children: uraianParagraphs,
                }),
            ],
        }));
    }
    sectionChildren.push(new docx_1.Table({
        rows: tableRows,
        width: { size: 100, type: docx_1.WidthType.PERCENTAGE },
        borders: defaultTableBorders,
    }));
    // SIGNATURE BLOCK
    const sigTitleLines = sigTitle.split('\n');
    const sigParagraphs = sigTitleLines.map((line) => new docx_1.Paragraph({
        alignment: docx_1.AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [new docx_1.TextRun({ text: line, bold: true, font: 'Arial', size: 21 })],
    }));
    if (document.signatureImage && document.signatureImage.startsWith('data:image')) {
        try {
            const base64Data = document.signatureImage.split(',')[1];
            const imageBuffer = Buffer.from(base64Data, 'base64');
            sigParagraphs.push(new docx_1.Paragraph({
                alignment: docx_1.AlignmentType.CENTER,
                spacing: { before: 140, after: 140 },
                children: [
                    new docx_1.ImageRun({
                        data: imageBuffer,
                        transformation: { width: 150, height: 75 },
                        type: 'png',
                    }),
                ],
            }));
        }
        catch (e) {
            console.error('Error inserting signature image into docx:', e);
            sigParagraphs.push(new docx_1.Paragraph({ spacing: { before: 400 }, children: [] }));
        }
    }
    else {
        sigParagraphs.push(new docx_1.Paragraph({ spacing: { before: 400 }, children: [] }));
    }
    sigParagraphs.push(new docx_1.Paragraph({
        alignment: docx_1.AlignmentType.CENTER,
        children: [
            new docx_1.TextRun({ text: sigName, bold: true, font: 'Arial', size: 22 }),
        ],
    }));
    sectionChildren.push(new docx_1.Paragraph({ spacing: { before: 400 }, children: [] }), new docx_1.Table({
        width: { size: 100, type: docx_1.WidthType.PERCENTAGE },
        borders: {
            top: { style: docx_1.BorderStyle.NONE },
            bottom: { style: docx_1.BorderStyle.NONE },
            left: { style: docx_1.BorderStyle.NONE },
            right: { style: docx_1.BorderStyle.NONE },
            insideHorizontal: { style: docx_1.BorderStyle.NONE },
            insideVertical: { style: docx_1.BorderStyle.NONE },
        },
        rows: [
            new docx_1.TableRow({
                children: [
                    new docx_1.TableCell({
                        width: { size: 50, type: docx_1.WidthType.PERCENTAGE },
                        children: [new docx_1.Paragraph({ children: [] })],
                    }),
                    new docx_1.TableCell({
                        width: { size: 50, type: docx_1.WidthType.PERCENTAGE },
                        children: sigParagraphs,
                    }),
                ],
            }),
        ],
    }));
    // Construct Document
    const docxDocument = new docx_1.Document({
        sections: [
            {
                properties: {
                    page: {
                        margin: { top: 1134, bottom: 1361, left: 850, right: 850 }, // 20mm top, 24mm bottom, 15mm sides
                    },
                },
                children: sectionChildren,
            },
        ],
    });
    return await docx_1.Packer.toBuffer(docxDocument);
}
