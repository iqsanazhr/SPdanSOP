import React from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { downloadPdfDocument, exportPdfFromHtml } from '../api/client.js';
import defaultLogo from '../assets/logobanjarnegara.webp';

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

  const [isExporting, setIsExporting] = React.useState(false);
  const [exportProgress, setExportProgress] = React.useState('');

  const handleDirectPdfDownload = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportProgress('Menyiapkan dokumen PDF...');

    try {
      // Beri sedikit jeda agar DOM & kalkulasi SVG garis konektor stabil
      await new Promise((resolve) => setTimeout(resolve, 200));

      const isSopDoc = docData.type === 'SOP';
      const modalBody = window.document.querySelector('.pdf-preview-modal .modal-body');
      if (!modalBody) throw new Error('Elemen pratinjau tidak ditemukan');

      // Ambil seluruh lembar halaman pratinjau yang sedang aktif
      const sheets = isSopDoc
        ? Array.from(modalBody.querySelectorAll('.sop-print-sheet'))
        : Array.from(modalBody.querySelectorAll('.a4-paper-sheet'));

      if (sheets.length === 0) {
        throw new Error('Halaman pratinjau belum siap');
      }

      setExportProgress('Membangun dokumen PDF...');

      // Konversi semua gambar di lembar dokumen menjadi Base64 mandiri agar tidak pernah broken di Playwright
      const inlinedSheetsHtml = [];
      for (const sheet of sheets) {
        const clone = sheet.cloneNode(true);
        const images = Array.from(clone.querySelectorAll('img'));
        for (const img of images) {
          const src = img.getAttribute('src');
          if (!src || src.startsWith('data:image')) continue;

          try {
            const originalImg = sheet.querySelector(`img[src="${src}"]`) || img;
            const canvas = window.document.createElement('canvas');
            canvas.width = originalImg.naturalWidth || originalImg.width || 120;
            canvas.height = originalImg.naturalHeight || originalImg.height || 120;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(originalImg, 0, 0, canvas.width, canvas.height);
            const base64Url = canvas.toDataURL('image/png');
            img.setAttribute('src', base64Url);
          } catch (e) {
            try {
              const res = await fetch(src);
              const blob = await res.blob();
              const reader = new FileReader();
              const base64Data = await new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
              });
              img.setAttribute('src', base64Data);
            } catch (fetchErr) {
              console.error('Failed to inline image to base64:', src, fetchErr);
            }
          }
        }
        inlinedSheetsHtml.push(clone.outerHTML);
      }

      // Susun HTML lengkap dengan style cetak resmi
      const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${docData.title || 'Dokumen'}</title>
  <style>
    @page {
      size: ${isSopDoc ? '297mm 210mm' : '210mm 297mm'};
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-family: Arial, sans-serif;
      color: #000000;
    }
    .sop-print-sheet, .a4-paper-sheet, .a4-paper-sheet-landscape {
      box-shadow: none !important;
      margin: 0 auto !important;
      page-break-after: always !important;
      break-after: page !important;
    }
    .sop-print-sheet:last-child, .a4-paper-sheet:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
    }
    .no-print {
      display: none !important;
    }
    table {
      border-collapse: collapse;
    }
  </style>
</head>
<body>
  ${inlinedSheetsHtml.join('\n')}
</body>
</html>`;

      setExportProgress('Mengunduh file PDF...');
      await exportPdfFromHtml({
        html: fullHtml,
        title: docData.title,
        isLandscape: isSopDoc,
      });
    } catch (err) {
      console.error('Gagal mengekspor PDF:', err);
      alert('Terjadi kesalahan saat mengunduh PDF: ' + (err.message || err));
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  const rawSigTitle =
    docData.signatoryTitle ||
    'KEPALA BADAN KEPEGAWAIAN\nDAN PENGEMBANGAN SUMBER DAYA MANUSIA\nKABUPATEN BANJARNEGARA';
  const rawSigName = docData.signatoryName || 'ESTI WIDODO';

  const sigTitle = (rawSigTitle || '').replace(/[<>]/g, '');
  const sigName = (rawSigName || '').replace(/[<>]/g, '');

  const isSop = docData.type === 'SOP';

  const sopContent = React.useMemo(() => {
    if (!isSop) return {};
    try {
      return typeof docData.contentData === 'string' ? JSON.parse(docData.contentData || '{}') : (docData.contentData || {});
    } catch (e) {
      return {};
    }
  }, [isSop, docData.contentData]);

  const identity = sopContent.identity || {};
  const actors = (sopContent.actors && sopContent.actors.length > 0) ? sopContent.actors : ['Pelaksana 1'];
  const steps = sopContent.steps || [];
  const connections = sopContent.connections || [];

  const normalizedSteps = React.useMemo(() => {
    return steps.map(step => {
      if (!step.nodes) {
        const newNodes = {};
        if (step.pelaksanaIds) {
          step.pelaksanaIds.forEach(id => {
            newNodes[id] = [step.symbol || 'kotak'];
          });
        }
        return { ...step, nodes: newNodes };
      } else {
        const newNodes = {};
        Object.keys(step.nodes).forEach(key => {
           const val = step.nodes[key];
           newNodes[key] = Array.isArray(val) ? val : [val];
        });
        return { ...step, nodes: newNodes };
      }
    });
  }, [steps]);

  const FLOWCHART_PAGE_CAPACITY = 660;
  const FLOWCHART_HEADER_HEIGHT = 65;
  const SIGNATURE_HEIGHT = 130;

  const countTextLines = (text, charsPerLine) => {
    if (!text) return 1;
    const lines = String(text).split('\n');
    let total = 0;
    lines.forEach(l => {
      total += Math.max(1, Math.ceil((l.length || 1) / charsPerLine));
    });
    return Math.max(1, total);
  };

  const computeStepRowHeight = (step) => {
    if (step.isNoteRow) {
      const noteLines = countTextLines(step.keteranganText || '', 140);
      return Math.max(28, noteLines * 15 + 10);
    }

    const uraianLines = countTextLines(step.uraian || '', 38);
    const reqLines    = countTextLines(step.mutuBaku?.persyaratan || '', 18);
    const timeLines   = countTextLines(step.mutuBaku?.waktu || '', 10);
    const outLines    = countTextLines(step.mutuBaku?.output || '', 15);
    const ketLines    = countTextLines(step.mutuBaku?.keterangan || '', 8);
    const maxTextLines = Math.max(uraianLines, reqLines, timeLines, outLines, ketLines);

    let maxShapeH = 20;
    if (step.nodes) {
      Object.values(step.nodes).forEach(arr => {
        if (Array.isArray(arr) && arr.length > 1) {
          maxShapeH = Math.max(maxShapeH, arr.length * 20 + (arr.length - 1) * 8);
        }
      });
    }

    const textH = maxTextLines * 15 + 10;
    return Math.max(28, textH, maxShapeH + 8);
  };

  const flowchartPages = React.useMemo(() => {
    if (normalizedSteps.length === 0) return [[]];

    const pages = [];
    let currentPage = [];
    let currentH = FLOWCHART_HEADER_HEIGHT;

    for (let idx = 0; idx < normalizedSteps.length; idx++) {
      const step = normalizedSteps[idx];
      const rowH = computeStepRowHeight(step);

      if (currentH + rowH <= FLOWCHART_PAGE_CAPACITY) {
        currentPage.push({ step, originalIndex: idx, isContinuation: false });
        currentH += rowH;
      } else {
        if (currentPage.length > 0) {
          pages.push(currentPage);
        }
        currentPage = [{ step, originalIndex: idx, isContinuation: false }];
        currentH = FLOWCHART_HEADER_HEIGHT + rowH;
      }
    }

    if (currentPage.length > 0) {
      if (currentH + SIGNATURE_HEIGHT > FLOWCHART_PAGE_CAPACITY) {
        pages.push(currentPage);
        pages.push([]);
      } else {
        pages.push(currentPage);
      }
    }

    return pages;
  }, [normalizedSteps]);

  const [previewLineCoords, setPreviewLineCoords] = React.useState([]);

  const renderPreviewLinePath = (x1, y1, p1, x2, y2, p2) => {
    const r = (n) => Math.round(n * 10) / 10;
    x1 = r(x1); y1 = r(y1);
    x2 = r(x2); y2 = r(y2);
    // Garis lurus horizontal yang sudah tersambung
    if (p2 && Math.abs(y1 - y2) < 4 && ((p1 === 'right' && p2 === 'left') || (p1 === 'left' && p2 === 'right'))) {
      return `M ${x1} ${y1} L ${x2} ${y1}`;
    }

    // Garis lurus vertikal yang sudah tersambung (ditarik penuh dari node ke node)
    if (p2 && Math.abs(x1 - x2) < 4 && ((p1 === 'bottom' && p2 === 'top') || (p1 === 'top' && p2 === 'bottom'))) {
      return `M ${x1} ${y1} L ${x1} ${y2}`;
    }

    const OFFSET = 18;
    const out1 = { x: x1, y: y1 };
    if (p1 === 'top') out1.y -= OFFSET;
    if (p1 === 'bottom') out1.y += OFFSET;
    if (p1 === 'left') out1.x -= OFFSET;
    if (p1 === 'right') out1.x += OFFSET;

    const out2 = { x: x2, y: y2 };
    if (p2 === 'top') out2.y -= OFFSET;
    if (p2 === 'bottom') out2.y += OFFSET;
    if (p2 === 'left') out2.x -= OFFSET;
    if (p2 === 'right') out2.x += OFFSET;

    const isVert1 = p1 === 'top' || p1 === 'bottom';
    const isVert2 = p2 === 'top' || p2 === 'bottom';

    let path = `M ${x1} ${y1} L ${out1.x} ${out1.y}`;

    if (isVert1 && isVert2) {
      if (p1 === 'bottom' && p2 === 'bottom') {
        const midY = Math.max(out1.y, out2.y) + OFFSET;
        path += ` L ${out1.x} ${midY} L ${out2.x} ${midY}`;
      } else if (p1 === 'top' && p2 === 'top') {
        const midY = Math.min(out1.y, out2.y) - OFFSET;
        path += ` L ${out1.x} ${midY} L ${out2.x} ${midY}`;
      } else {
        if ((p1 === 'bottom' && out1.y > out2.y) || (p1 === 'top' && out1.y < out2.y)) {
          const midX = r(out1.x + (out2.x - out1.x) / 2);
          path += ` L ${out1.x} ${out1.y} L ${midX} ${out1.y} L ${midX} ${out2.y} L ${out2.x} ${out2.y}`;
        } else {
          const midY = r(out1.y + (out2.y - out1.y) / 2);
          path += ` L ${out1.x} ${midY} L ${out2.x} ${midY}`;
        }
      }
    } else if (!isVert1 && !isVert2) {
      if (p1 === 'right' && p2 === 'right') {
        const midX = Math.max(out1.x, out2.x) + OFFSET;
        path += ` L ${midX} ${out1.y} L ${midX} ${out2.y}`;
      } else if (p1 === 'left' && p2 === 'left') {
        const midX = Math.min(out1.x, out2.x) - OFFSET;
        path += ` L ${midX} ${out1.y} L ${midX} ${out2.y}`;
      } else {
        if ((p1 === 'right' && out1.x > out2.x) || (p1 === 'left' && out1.x < out2.x)) {
          const midY = r(out1.y + (out2.y - out1.y) / 2);
          path += ` L ${out1.x} ${midY} L ${out2.x} ${midY}`;
        } else {
          const midX = r(out1.x + (out2.x - out1.x) / 2);
          path += ` L ${midX} ${out1.y} L ${midX} ${out2.y}`;
        }
      }
    } else {
      if (isVert1) {
        if ((p1 === 'bottom' && out2.y > out1.y) || (p1 === 'top' && out2.y < out1.y)) {
          path += ` L ${out1.x} ${out2.y}`;
        } else {
          path += ` L ${out2.x} ${out1.y}`;
        }
      } else {
        if ((p1 === 'right' && out2.x > out1.x) || (p1 === 'left' && out1.x < out2.x)) {
          path += ` L ${out2.x} ${out1.y}`;
        } else {
          path += ` L ${out1.x} ${out2.y}`;
        }
      }
    }

    path += ` L ${out2.x} ${out2.y} L ${x2} ${y2}`;
    return path;
  };

  const renderCrossPagePath = (x1, y1, p1, x2, y2, p2, crossType) => {
    const r = (n) => Math.round(n * 10) / 10;
    x1 = r(x1); y1 = r(y1);
    x2 = r(x2); y2 = r(y2);

    if (crossType === 'exit') {
      if (Math.abs(x1 - x2) < 4) {
        return `M ${x1} ${y1} L ${x1} ${y2}`;
      }
      if (p1 === 'left' || p1 === 'right') {
        return `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2}`;
      } else {
        const turnY = r(Math.min(y2 - 12, y1 + 15));
        return `M ${x1} ${y1} L ${x1} ${turnY} L ${x2} ${turnY} L ${x2} ${y2}`;
      }
    }
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  };

  React.useEffect(() => {
    if (!isOpen || !isSop) return;
    const timer = setTimeout(() => {
      const coords = [];

      const stepToPage = {};
      flowchartPages.forEach((pageItems, pageIdx) => {
        pageItems.forEach((item) => {
          stepToPage[item.originalIndex] = pageIdx;
        });
      });

      connections.forEach((conn) => {
        const fromSub = conn.from.subIndex !== undefined ? conn.from.subIndex : 0;
        const toSub = conn.to.subIndex !== undefined ? conn.to.subIndex : 0;
        const fromEl = window.document.getElementById(`prev-symbol-${conn.from.s}-${conn.from.a}-${fromSub}`);
        const toEl = window.document.getElementById(`prev-symbol-${conn.to.s}-${conn.to.a}-${toSub}`);

        if (fromEl && toEl) {
          const fromSheet = fromEl.closest('.a4-paper-sheet-landscape');
          const toSheet   = toEl.closest('.a4-paper-sheet-landscape');

          if (fromSheet && toSheet) {
            const fromSheetRect = fromSheet.getBoundingClientRect();
            const toSheetRect   = toSheet.getBoundingClientRect();
            const shape1El = fromEl.querySelector('polygon, rect') || fromEl;
            const shape2El = toEl.querySelector('polygon, rect') || toEl;
            const r1 = shape1El.getBoundingClientRect();
            const r2 = shape2El.getBoundingClientRect();

            const scale1X = fromSheetRect.width / 1122.52;
            const scale1Y = fromSheetRect.height / 793.70;

            const el1Left = (r1.left - fromSheetRect.left) / scale1X;
            const el1Top = (r1.top - fromSheetRect.top) / scale1Y;
            const el1Width = r1.width / scale1X;
            const el1Height = r1.height / scale1Y;

            const cx1 = el1Left + el1Width / 2;
            const cy1 = el1Top + el1Height / 2;

            const scale2X = toSheetRect.width / 1122.52;
            const scale2Y = toSheetRect.height / 793.70;

            const el2Left = (r2.left - toSheetRect.left) / scale2X;
            const el2Top = (r2.top - toSheetRect.top) / scale2Y;
            const el2Width = r2.width / scale2X;
            const el2Height = r2.height / scale2Y;

            const cx2 = el2Left + el2Width / 2;
            const cy2 = el2Top + el2Height / 2;

            let p1 = conn.from.port || 'bottom';
            let p2 = conn.to.port || 'top';

            let x1 = cx1, y1 = cy1, x2 = cx2, y2 = cy2;
            if (p1 === 'top') { x1 = cx1; y1 = el1Top; }
            else if (p1 === 'bottom') { x1 = cx1; y1 = el1Top + el1Height; }
            else if (p1 === 'left') { x1 = el1Left; y1 = cy1; }
            else if (p1 === 'right') { x1 = el1Left + el1Width; y1 = cy1; }

            if (p2 === 'top') { x2 = cx2; y2 = el2Top; }
            else if (p2 === 'bottom') { x2 = cx2; y2 = el2Top + el2Height; }
            else if (p2 === 'left') { x2 = el2Left; y2 = cy2; }
            else if (p2 === 'right') { x2 = el2Left + el2Width; y2 = cy2; }

            const fromPageIdx = stepToPage[conn.from.s];
            const toPageIdx = stepToPage[conn.to.s];

            if (fromPageIdx !== undefined && fromPageIdx === toPageIdx) {
              const minS = Math.min(conn.from.s, conn.to.s);
              const maxS = Math.max(conn.from.s, conn.to.s);
              
              let firstNoteEl = null;
              let lastNoteEl = null;

              for (let sIdx = minS + 1; sIdx < maxS; sIdx++) {
                if (steps[sIdx]?.isNoteRow) {
                  const el = window.document.getElementById(`prev-noterow-${sIdx}`);
                  if (el) {
                    if (!firstNoteEl) firstNoteEl = el;
                    lastNoteEl = el;
                  }
                }
              }

              if (firstNoteEl && lastNoteEl && fromSheet) {
                const sheetRect = fromSheet.getBoundingClientRect();
                const scaleY = sheetRect.height > 0 ? sheetRect.height / 793.70 : 1;

                if (conn.from.s < conn.to.s) {
                  const firstRect = firstNoteEl.getBoundingClientRect();
                  const lastRect = lastNoteEl.getBoundingClientRect();
                  const noteTop = (firstRect.top - sheetRect.top) / scaleY;
                  const noteBottom = (lastRect.bottom - sheetRect.top) / scaleY;

                  coords.push({
                    x1, y1, p1,
                    x2, y2: noteTop, p2: 'top',
                    fromS: conn.from.s, toS: conn.to.s,
                    isCrossPage: false
                  });

                  coords.push({
                    x1: x2, y1: noteBottom, p1: 'bottom',
                    x2, y2, p2,
                    fromS: conn.from.s, toS: conn.to.s,
                    isCrossPage: false
                  });
                } else {
                  const firstRect = firstNoteEl.getBoundingClientRect();
                  const lastRect = lastNoteEl.getBoundingClientRect();
                  const noteTop = (firstRect.top - sheetRect.top) / scaleY;
                  const noteBottom = (lastRect.bottom - sheetRect.top) / scaleY;

                  coords.push({
                    x1, y1, p1,
                    x2, y2: noteBottom, p2: 'bottom',
                    fromS: conn.from.s, toS: conn.to.s,
                    isCrossPage: false
                  });

                  coords.push({
                    x1: x2, y1: noteTop, p1: 'top',
                    x2, y2, p2,
                    fromS: conn.from.s, toS: conn.to.s,
                    isCrossPage: false
                  });
                }
              } else {
                coords.push({ x1, y1, p1, x2, y2, p2, fromS: conn.from.s, toS: conn.to.s, isCrossPage: false });
              }
            } else {
              const fromTable = fromSheet.querySelector('table');
              const toTable   = toSheet.querySelector('table');
              const toTbody   = toTable ? toTable.querySelector('tbody') : null;

              const fromPageItems = flowchartPages[fromPageIdx] || [];
              let exitNoteEl = null;
              for (const item of fromPageItems) {
                if (item.originalIndex > conn.from.s && item.step.isNoteRow) {
                  const el = window.document.getElementById(`prev-noterow-${item.originalIndex}`);
                  if (el) {
                    exitNoteEl = el;
                    break;
                  }
                }
              }

              let fromTableBottom = 793.70 - 40;
              let fromP2 = 'bottom';
              if (exitNoteEl) {
                const exitNoteRect = exitNoteEl.getBoundingClientRect();
                fromTableBottom = (exitNoteRect.top - fromSheetRect.top) / scale1Y;
                fromP2 = 'top';
              } else if (fromTable) {
                fromTableBottom = (fromTable.getBoundingClientRect().bottom - fromSheetRect.top) / scale1Y;
              }

              // Exit segment on Page N
              coords.push({
                x1, y1, p1,
                x2, y2: fromTableBottom, p2: fromP2,
                fromS: conn.from.s, toS: conn.to.s,
                isCrossPage: true, crossType: 'exit'
              });

              // Check note row on destination page
              const toPageItems = flowchartPages[toPageIdx] || [];
              let entryNoteEl = null;
              for (const item of toPageItems) {
                if (item.originalIndex < conn.to.s && item.step.isNoteRow) {
                  const el = window.document.getElementById(`prev-noterow-${item.originalIndex}`);
                  if (el) {
                    entryNoteEl = el;
                    break;
                  }
                }
              }

              const toTbodyTop = toTbody 
                ? ((toTbody.getBoundingClientRect().top - toSheetRect.top) / scale2Y)
                : (toTable ? ((toTable.getBoundingClientRect().top - toSheetRect.top) / scale2Y) : 69);

              if (entryNoteEl) {
                const entryNoteRect = entryNoteEl.getBoundingClientRect();
                const entryNoteTop = (entryNoteRect.top - toSheetRect.top) / scale2Y;
                const entryNoteBottom = (entryNoteRect.bottom - toSheetRect.top) / scale2Y;

                coords.push({
                  x1: x2, y1: toTbodyTop, p1: 'top',
                  x2, y2: entryNoteTop, p2: 'top',
                  fromS: conn.from.s, toS: conn.to.s,
                  isCrossPage: true, crossType: 'entry'
                });

                coords.push({
                  x1: x2, y1: entryNoteBottom, p1: 'bottom',
                  x2, y2, p2,
                  fromS: conn.from.s, toS: conn.to.s,
                  isCrossPage: false
                });
              } else {
                coords.push({
                  x1: x2, y1: toTbodyTop, p1: 'top',
                  x2, y2, p2,
                  fromS: conn.from.s, toS: conn.to.s,
                  isCrossPage: true, crossType: 'entry'
                });
              }
            }
          }
        }
      });
      setPreviewLineCoords(coords);
    }, 150);

    return () => clearTimeout(timer);
  }, [isOpen, isSop, connections, steps, actors, flowchartPages]);

  const paginateDocumentComponents = () => {
    const components = docData.components || [];
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
    <div className="modal-backdrop pdf-preview-modal">
      <div
        className="modal-card"
        style={{ width: isSop ? '315mm' : '225mm', maxWidth: '96vw', height: '90vh', padding: 16 }}
      >
        <div className="modal-header">
          <h2 style={{ fontSize: 16, margin: 0, color: '#202124' }}>
            Pratinjau PDF - {docData.title}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="btn-primary"
              onClick={handleDirectPdfDownload}
              disabled={isExporting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                background: '#1a73e8',
                color: '#ffffff',
                border: 'none',
                borderRadius: 4,
                fontWeight: 600,
                fontSize: 13,
                cursor: isExporting ? 'not-allowed' : 'pointer',
                opacity: isExporting ? 0.8 : 1,
              }}
              title="Unduh PDF Langsung (Presisi 100% Sesuai Pratinjau)"
            >
              {isExporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>{exportProgress || 'Mengunduh...'}</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Unduh PDF</span>
                </>
              )}
            </button>
            <button className="modal-close-btn" onClick={onClose} disabled={isExporting}>
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
          {isSop ? (
            <div className="sop-preview-wrapper" style={{ width: '100%' }}>
              {/* === HALAMAN 1: IDENTITAS & KELENGKAPAN SOP (MATCHES EDITOR EXACTLY) === */}
              <div 
                className="a4-paper-sheet-landscape sop-print-sheet sop-print-page-1"
                style={{ 
                  width: '297mm', 
                  height: '210mm', 
                  background: '#ffffff', 
                  boxShadow: '0 4px 14px rgba(0,0,0,0.3)', 
                  padding: '12mm 15mm 15mm 15mm', 
                  boxSizing: 'border-box',
                  position: 'relative',
                  fontSize: '10pt',
                  fontFamily: 'Arial, sans-serif',
                  color: '#000',
                  margin: '0 auto 20px auto',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden',
                  pageBreakAfter: 'always',
                  breakAfter: 'page'
                }}
              >
                {/* HEADER DOKUMEN SOP */}
                {identity.headerText && (
                  <div style={{ position: 'absolute', top: 10, left: '15mm', right: '15mm', height: 24, display: 'flex', alignItems: 'center', borderBottom: '1px solid #000', fontSize: '8.5pt', color: '#000' }}>
                    {identity.headerText}
                  </div>
                )}

                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', margin: '0 auto' }}>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #000', width: '30%', textAlign: 'center', padding: 10 }}>
                        <div style={{ width: 80, height: 80, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img 
                            src={identity.logoImage || defaultLogo} 
                            alt="Logo Banjarnegara" 
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                          />
                        </div>
                        <div style={{ marginTop: 8, fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase' }}>
                          {identity.namaInstansi || 'PEMERINTAH KABUPATEN BANJARNEGARA'}
                        </div>
                        <div style={{ fontSize: '10pt', color: '#3c4043' }}>
                          {identity.namaOrganisasi || ''}
                        </div>
                      </td>
                      <td style={{ border: '1px solid #000', width: '45%', padding: '8px 12px', verticalAlign: 'top' }}>
                        <table style={{ width: '100%', fontSize: '9.5pt', borderCollapse: 'collapse' }}>
                          <tbody>
                            <tr><td width="38%" style={{ padding: '3px 0', verticalAlign: 'top' }}>Nomor SOP</td><td style={{ padding: '3px 0', verticalAlign: 'top' }}>:</td><td style={{ padding: '3px 0' }}>{identity.nomorSOP !== undefined ? identity.nomorSOP : 'SOP/BKPSDM/2026/001'}</td></tr>
                            <tr><td style={{ padding: '3px 0', verticalAlign: 'top' }}>Tanggal Pembuatan</td><td style={{ padding: '3px 0', verticalAlign: 'top' }}>:</td><td style={{ padding: '3px 0' }}>{identity.tanggalPembuatan !== undefined ? identity.tanggalPembuatan : '2 Januari 2026'}</td></tr>
                            <tr><td style={{ padding: '3px 0', verticalAlign: 'top' }}>Tanggal Revisi</td><td style={{ padding: '3px 0', verticalAlign: 'top' }}>:</td><td style={{ padding: '3px 0' }}>{identity.tanggalRevisi !== undefined ? identity.tanggalRevisi : '-'}</td></tr>
                            <tr><td style={{ padding: '3px 0', verticalAlign: 'top' }}>Tanggal Pengesahan</td><td style={{ padding: '3px 0', verticalAlign: 'top' }}>:</td><td style={{ padding: '3px 0' }}>{identity.tanggalPengesahan !== undefined ? identity.tanggalPengesahan : '5 Januari 2026'}</td></tr>
                            <tr><td style={{ padding: '3px 0', verticalAlign: 'top' }}>Disahkan Oleh</td><td style={{ padding: '3px 0', verticalAlign: 'top' }}>:</td><td style={{ padding: '3px 0', fontWeight: 'bold' }}>{identity.disahkanOlehJabatan !== undefined ? identity.disahkanOlehJabatan : 'Kepala Badan Kepegawaian dan Pengembangan Sumber Daya Manusia'}</td></tr>
                            <tr><td style={{ padding: '3px 0', verticalAlign: 'top' }}>Nama SOP</td><td style={{ padding: '3px 0', verticalAlign: 'top' }}>:</td><td style={{ padding: '3px 0', fontWeight: 'bold' }}>{docData.title}</td></tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: 8, verticalAlign: 'top' }}>
                        <strong>DASAR HUKUM</strong><br/>
                        <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>
                          {identity.dasarHukum !== undefined ? identity.dasarHukum : '1. Peraturan Menteri PAN & RB Nomor 35 Tahun 2012 tentang Pedoman Penyusunan SOP Administrasi Pemerintahan.\n2. Peraturan Daerah Kabupaten Banjarnegara tentang Organisasi dan Tata Kerja.'}
                        </div>
                      </td>
                      <td style={{ border: '1px solid #000', padding: 8, verticalAlign: 'top' }}>
                        <strong>KUALIFIKASI PELAKSANA</strong><br/>
                        <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>
                          {identity.kualifikasiPelaksana !== undefined ? identity.kualifikasiPelaksana : '1. Pendidikan minimal D3 / S1 Administrasi / Ilmu Komputer.\n2. Memahami prosedur dan regulasi penyusunan serta pelayanan standar.'}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: 8, verticalAlign: 'top' }}>
                        <strong>KETERKAITAN</strong><br/>
                        <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>
                          {identity.keterkaitan !== undefined ? identity.keterkaitan : '1. SOP Pelayanan Administrasi Publik.\n2. SOP Pengelolaan Surat Masuk dan Keluar.'}
                        </div>
                      </td>
                      <td style={{ border: '1px solid #000', padding: 8, verticalAlign: 'top' }}>
                        <strong>PERALATAN/PERLENGKAPAN</strong><br/>
                        <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>
                          {identity.peralatanPerlengkapan !== undefined ? identity.peralatanPerlengkapan : '1. Komputer/Laptop, Printer, Scanner, dan Jaringan Internet.\n2. Alat Tulis Kantor (ATK) & Map Berkas.'}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: 8, verticalAlign: 'top' }}>
                        <strong>PERINGATAN</strong><br/>
                        <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>
                          {identity.peringatan !== undefined ? identity.peringatan : 'Jika SOP ini tidak dilaksanakan, proses pelayanan standar tidak akan berjalan secara optimal dan tepat waktu.'}
                        </div>
                      </td>
                      <td style={{ border: '1px solid #000', padding: 8, verticalAlign: 'top' }}>
                        <strong>PENCATATAN DAN PENDATAAN</strong><br/>
                        <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>
                          {identity.pencatatan !== undefined ? identity.pencatatan : 'Disimpan dalam bentuk arsip fisik (hardcopy) pada file cabinet dan arsip digital (softcopy) dalam sistem database.'}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* PAGE FOOTER DOKUMEN SOP */}
                <div style={{ position: 'absolute', bottom: 10, left: '15mm', right: '15mm', height: 26, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: identity.footerText ? '1px solid #000' : 'none', fontSize: '8.5pt', color: '#000' }}>
                  <div>{identity.footerText || ''}</div>
                  <div style={{ marginLeft: 16, whiteSpace: 'nowrap', fontWeight: 'bold', fontSize: '9pt' }}>
                    Halaman 1 dari {1 + flowchartPages.length}
                  </div>
                </div>
              </div>

              {/* === HALAMAN FLOWCHART (A4 LANDSCAPE: 297mm x 210mm) === */}
              {flowchartPages.map((pageItems, pageIdx) => {
                const isLastFlowchartPage = pageIdx === flowchartPages.length - 1;
                const totalSopPages = 1 + flowchartPages.length;

                return (
                  <div 
                    key={pageIdx}
                    className="a4-paper-sheet-landscape sop-print-sheet sop-print-page-2"
                    style={{ 
                      width: '297mm', 
                      minHeight: '210mm', 
                      background: '#ffffff', 
                      boxShadow: '0 4px 14px rgba(0,0,0,0.3)', 
                      padding: '14mm 15mm 15mm 15mm', 
                      boxSizing: 'border-box',
                      position: 'relative',
                      fontSize: '10pt',
                      fontFamily: 'Arial, sans-serif',
                      color: '#000',
                      margin: '0 auto 20px auto',
                      pageBreakAfter: 'always',
                      breakAfter: 'page'
                    }}
                  >
                    {/* HEADER DOKUMEN SOP */}
                    {identity.headerText && (
                      <div style={{ position: 'absolute', top: 10, left: '15mm', right: '15mm', height: 24, display: 'flex', alignItems: 'center', borderBottom: '1px solid #000', fontSize: '8.5pt', color: '#000', zIndex: 15 }}>
                        {identity.headerText}
                      </div>
                    )}
                    {/* SVG CONNECTOR OVERLAY FOR PREVIEW */}
                    <svg 
                      viewBox="0 0 1122.52 793.70"
                      style={{
                        position: 'absolute', top: 0, left: 0,
                        width: '100%', height: '100%',
                        overflow: 'visible',
                        pointerEvents: 'none',
                        zIndex: 10
                      }}
                    >
                      <defs>
                        <marker id="arrow-prev" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#000" />
                        </marker>
                      </defs>
                      {(() => {
                        const stepIndices = new Set(pageItems.map(item => item.originalIndex));
                        return previewLineCoords
                          .filter(c => {
                            if (c.isCrossPage) {
                              return c.crossType === 'exit' ? stepIndices.has(c.fromS) : stepIndices.has(c.toS);
                            }
                            return stepIndices.has(c.fromS) && stepIndices.has(c.toS);
                          })
                          .map((c, i) => (
                            <path 
                              key={i} 
                              d={c.isCrossPage ? renderCrossPagePath(c.x1, c.y1, c.p1, c.x2, c.y2, c.p2, c.crossType) : renderPreviewLinePath(c.x1, c.y1, c.p1, c.x2, c.y2, c.p2)} 
                              fill="none" stroke="#000" strokeWidth="1.5" markerEnd="url(#arrow-prev)" 
                            />
                          ));
                      })()}
                    </svg>
                    <div style={{ marginBottom: 10, fontWeight: 'bold', fontSize: '11pt' }}>
                      Bagan Alir (Flowchart) {flowchartPages.length > 1 ? `- Hal ${pageIdx + 2}` : ''}
                    </div>

                    {pageItems.length > 0 && (
                      <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', border: '1px solid #000', textAlign: 'center', fontSize: '9pt', marginTop: 6 }}>
                        <thead>
                          <tr>
                            <th rowSpan="2" style={{ border: '1px solid #000', width: 30, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>No</th>
                            <th rowSpan="2" style={{ border: '1px solid #000', width: 210, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>Uraian Prosedur/Aktivitas</th>
                            <th colSpan={Math.max(1, actors.length)} style={{ border: '1px solid #000', padding: 4, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>Pelaksana</th>
                            <th colSpan="3" style={{ border: '1px solid #000', padding: 4, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>Mutu Baku</th>
                            <th rowSpan="2" style={{ border: '1px solid #000', width: 45, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>Ket</th>
                            <th rowSpan="2" style={{ border: '1px solid #000', width: 30 }}>#</th>
                          </tr>
                          <tr>
                            {actors.map((actor, aIdx) => (
                              <th key={aIdx} style={{ border: '1px solid #000', padding: '6px 4px', fontWeight: 'normal', width: 60, minWidth: 60, verticalAlign: 'top', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{actor}</th>
                            ))}
                            <th style={{ border: '1px solid #000', width: 100, fontWeight: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>Persyaratan</th>
                            <th style={{ border: '1px solid #000', width: 55, fontWeight: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>Waktu</th>
                            <th style={{ border: '1px solid #000', width: 85, fontWeight: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>Output</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageItems.map(({ step, originalIndex: idx, isContinuation }) => {
                            if (step.isNoteRow) {
                              return (
                                <tr key={idx} id={`prev-noterow-${idx}`}>
                                  <td colSpan={6 + Math.max(1, actors.length)} style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'left', verticalAlign: 'middle', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                    {step.keteranganText}
                                  </td>
                                  <td style={{ border: '1px solid #000', padding: 4, verticalAlign: 'middle' }}></td>
                                </tr>
                              );
                            }
                            return (
                              <tr key={idx}>
                                <td style={{ border: '1px solid #000', padding: 4, verticalAlign: 'middle', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{isContinuation ? '' : idx + 1}</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left', verticalAlign: 'middle', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{step.uraian}</td>
                                {actors.map((_, aIdx) => {
                                  const nodeTypes = step.nodes && step.nodes[aIdx] ? (Array.isArray(step.nodes[aIdx]) ? step.nodes[aIdx] : [step.nodes[aIdx]]) : [];
                                  return (
                                    <td key={aIdx} style={{ border: '1px solid #000', padding: '6px 4px', position: 'relative', width: 60, verticalAlign: 'middle', boxSizing: 'border-box' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '2px 0', minHeight: '100%', width: '100%' }}>
                                        {nodeTypes.map((type, symIdx) => {
                                          const symbolId = `prev-symbol-${idx}-${aIdx}-${symIdx}`;
                                          if (type === 'kapsul') {
                                            return <svg key={symIdx} id={symbolId} width="40" height="20" viewBox="0 0 40 20" style={{ display: 'block' }}><rect x="2" y="2" width="36" height="16" rx="8" ry="8" fill="#F6A04D" stroke="#000" strokeWidth="1.5" /></svg>;
                                          } else if (type === 'belah_ketupat') {
                                            return <svg key={symIdx} id={symbolId} width="40" height="20" viewBox="0 0 40 20" style={{ display: 'block' }}><polygon points="20,2 38,10 20,18 2,10" fill="#F6A04D" stroke="#000" strokeWidth="1.5" /></svg>;
                                          }
                                          return <svg key={symIdx} id={symbolId} width="40" height="20" viewBox="0 0 40 20" style={{ display: 'block' }}><rect x="2" y="2" width="36" height="16" fill="#F6A04D" stroke="#000" strokeWidth="1.5" /></svg>;
                                        })}
                                      </div>
                                    </td>
                                  );
                                })}
                                <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left', verticalAlign: 'middle', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{step.mutuBaku?.persyaratan}</td>
                                <td style={{ border: '1px solid #000', padding: '4px 2px', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{step.mutuBaku?.waktu}</td>
                                <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left', verticalAlign: 'middle', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{step.mutuBaku?.output}</td>
                                <td style={{ border: '1px solid #000', padding: '4px 2px', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{step.mutuBaku?.keterangan}</td>
                                <td style={{ border: '1px solid #000', padding: 4, verticalAlign: 'middle' }}></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}

                    {/* SIGNATURE BLOCK ON LAST FLOWCHART PAGE */}
                    {isLastFlowchartPage && (
                      <div style={{ marginTop: 24, width: 280, marginLeft: 'auto', textAlign: 'center' }}>
                        <div style={{ fontSize: '10.5pt', fontWeight: 'bold', lineHeight: 1.3, textTransform: 'uppercase', whiteSpace: 'pre-line' }}>
                          {sigTitle}
                        </div>
                        <div style={{ minHeight: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px 0' }}>
                          {docData.signatureImage && (
                            <img src={docData.signatureImage} alt="Cap & Tanda Tangan" style={{ maxHeight: 80, maxWidth: 260, objectFit: 'contain' }} />
                          )}
                        </div>
                        <div style={{ fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase', textDecoration: 'underline' }}>
                          {sigName}
                        </div>
                      </div>
                    )}

                    {/* PAGE FOOTER DOKUMEN SOP */}
                    <div style={{ position: 'absolute', bottom: 10, left: '15mm', right: '15mm', height: 26, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: identity.footerText ? '1px solid #000' : 'none', fontSize: '8.5pt', color: '#000', zIndex: 15 }}>
                      <div>{identity.footerText || ''}</div>
                      <div style={{ marginLeft: 16, whiteSpace: 'nowrap', fontWeight: 'bold', fontSize: '9pt' }}>
                        Halaman {pageIdx + 2} dari {totalSopPages}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            pageGroups.map((pageComponents, pageIndex) => {
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
              </div>
            );
          })
        )}
        </div>
      </div>
    </div>
  );
};
