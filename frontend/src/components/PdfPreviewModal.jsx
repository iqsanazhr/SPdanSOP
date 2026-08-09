import React from 'react';
import { X, Download, Printer } from 'lucide-react';
import { downloadPdfDocument } from '../api/client.js';

function parseHtmlBlocks(html) {
  if (!html) return [];
  const div = window.document.createElement('div');
  div.innerHTML = html;
  const blocks = [];

  if (div.children.length > 0) {
    Array.from(div.children).forEach((child) => {
      const outer = child.outerHTML;
      const clean = child.textContent || '';
      blocks.push({ html: outer, cleanText: clean });
    });
  } else {
    const paragraphs = html.split(/\n+/).filter(Boolean);
    paragraphs.forEach((p) => {
      blocks.push({ html: `<p>${p}</p>`, cleanText: p });
    });
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

export const PdfPreviewModal = ({ isOpen, document: docData, onClose }) => {
  if (!isOpen || !docData) return null;

  const handleDownload = () => {
    downloadPdfDocument(docData).catch((err) => console.error(err));
  };

  const sigTitle =
    docData.signatoryTitle ||
    'KEPALA BADAN KEPEGAWAIAN\nDAN PENGEMBANGAN SUMBER DAYA MANUSIA\nKABUPATEN BANJARNEGARA';
  const sigName = docData.signatoryName || 'ESTI WIDODO';

  const paginateDocumentComponents = () => {
    const components = docData.components;
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
              return acc + Math.max(1, Math.ceil(clean.length / 55)) * 22 + 8;
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
  };

  const pageGroups = paginateDocumentComponents();

  return (
    <div className="modal-backdrop">
      <div
        className="modal-card"
        style={{ width: '225mm', maxWidth: '95vw', height: '90vh', padding: 16 }}
      >
        <div className="modal-header">
          <h2 style={{ fontSize: 16, margin: 0, color: '#202124' }}>
            Pratinjau PDF - {docData.title}
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" onClick={handleDownload} title="Unduh PDF">
              <Download size={16} />
              <span>Unduh PDF</span>
            </button>
            <button className="btn-secondary" onClick={() => window.print()} title="Cetak">
              <Printer size={16} />
              <span>Cetak</span>
            </button>
            <button className="modal-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div
          className="modal-body"
          style={{
            backgroundColor: '#525659',
            padding: '24px 16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 28,
          }}
        >
          {pageGroups.map((pageComponents, pageIndex) => {
            const isFirstPage = pageIndex === 0;
            const isLastPage = pageIndex === pageGroups.length - 1;
            const pageNum = pageIndex + 1;

            return (
              <div
                key={pageIndex}
                className="a4-paper-sheet"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                  padding: '20mm 15mm 24mm 15mm',
                  boxSizing: 'border-box',
                  position: 'relative',
                  color: '#000000',
                  fontSize: '11pt',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                {/* HEADER (PAGE 1 ONLY) */}
                {isFirstPage && (
                  <div style={{ marginBottom: 18 }}>
                    <h1
                      style={{
                        fontSize: '14pt',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        margin: '0 0 10px 0',
                        letterSpacing: '0.5px',
                      }}
                    >
                      STANDAR PELAYANAN PUBLIK
                    </h1>
                    <h2
                      style={{
                        fontSize: '11pt',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        margin: 0,
                        letterSpacing: '0.5px',
                      }}
                    >
                      JENIS LAYANAN : {docData.serviceType || 'LEGALISASI'}
                    </h2>
                  </div>
                )}

                {/* SP TABLE (CLOSED BOX BORDER ON ALL 4 SIDES) */}
                {pageComponents.length > 0 && (
                  <table
                    className="sp-table"
                    style={{ border: '1px solid #000000', borderCollapse: 'collapse' }}
                  >
                    <thead>
                      <tr>
                        <th style={{ width: '6%', border: '1px solid #000000' }}>NO</th>
                        <th style={{ width: '30%', border: '1px solid #000000' }}>KOMPONEN</th>
                        <th style={{ width: '64%', border: '1px solid #000000' }}>URAIAN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageComponents.map((item) => (
                        <tr key={item.id}>
                          <td
                            style={{
                              border: '1px solid #000000',
                              padding: '8px 10px',
                              textAlign: 'center',
                              verticalAlign: 'top',
                            }}
                          >
                            {!item.isContinuation && item.order ? `${item.order}.` : ''}
                          </td>
                          <td
                            style={{
                              border: '1px solid #000000',
                              padding: '8px 10px',
                              fontWeight: 600,
                              verticalAlign: 'top',
                            }}
                          >
                            {!item.isContinuation ? item.name : ''}
                          </td>
                          <td
                            style={{
                              border: '1px solid #000000',
                              padding: '8px 10px',
                              paddingLeft: item.indentMm ? `${item.indentMm}mm` : '10px',
                              verticalAlign: 'top',
                              overflowWrap: 'break-word',
                              wordBreak: 'break-word',
                            }}
                            dangerouslySetInnerHTML={{ __html: item.uraian || '' }}
                          />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* SIGNATURE BLOCK (LAST PAGE ONLY) */}
                {isLastPage && (
                  <div
                    style={{
                      marginTop: 36,
                      marginLeft: 'auto',
                      width: 360,
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '10.5pt',
                        fontWeight: 'bold',
                        lineHeight: 1.3,
                        textTransform: 'uppercase',
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {sigTitle}
                    </div>
                    <div
                      style={{
                        minHeight: 80,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '8px 0',
                      }}
                    >
                      {docData.signatureImage && (
                        <img
                          src={docData.signatureImage}
                          alt="Cap & Tanda Tangan"
                          style={{ maxHeight: 90, maxWidth: 280, objectFit: 'contain' }}
                        />
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '11pt',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                      }}
                    >
                      {sigName}
                    </div>
                  </div>
                )}

                {/* PAGE FOOTER */}
                <div className="page-number-footer" style={{ bottom: 12 }}>
                  Halaman {pageNum} dari {pageGroups.length}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
