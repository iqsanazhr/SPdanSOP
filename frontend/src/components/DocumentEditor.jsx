import React, { useState, useRef, useCallback } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { Plus, Upload, Trash2 } from 'lucide-react';
import { ComponentItem } from './ComponentItem.jsx';
import { DocumentRuler } from './DocumentRuler.jsx';

function parseHtmlBlocks(html) {
  if (!html) return [];
  const div = document.createElement('div');
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

export const DocumentEditor = ({
  document: docData,
  zoom,
  showRuler = true,
  leftMarginMm = 15,
  rightMarginMm = 15,
  col1WidthPercent = 6,
  col2WidthPercent = 30,
  onMarginChange = () => {},
  onColumnWidthChange = () => {},
  onUpdateComponentIndent = () => {},
  onRulerDragEnd = () => {},
  onServiceTypeChange,
  onSignatoryTitleChange,
  onSignatoryNameChange,
  onSignatureImageChange,
  onUpdateComponentName,
  onUpdateComponentUraian,
  onReorderComponents,
  onInsertComponentAt,
  onMoveUp,
  onMoveDown,
  onDeleteComponent,
  onFocusEditor,
}) => {
  const defaultSigTitle =
    'KEPALA BADAN KEPEGAWAIAN\nDAN PENGEMBANGAN SUMBER DAYA MANUSIA\nKABUPATEN BANJARNEGARA';

  const containerRef = useRef(null);
  const [focusedComponentId, setFocusedComponentId] = useState(null);

  const activeComponent = docData.components.find((c) => c.id === focusedComponentId);
  const activeIndentMm = activeComponent?.indentMm || 0;

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onSignatureImageChange(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeBtnStyle = {
    position: 'absolute',
    top: -8,
    right: -8,
    background: '#d93025',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: 20,
    height: 20,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  // Split components & HTML blocks across physical A4 sheets with 4-sided closed table borders
  const paginateDocumentComponents = useCallback(() => {
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
          realId: comp.id,
          order: comp.order,
          name: comp.name,
          uraian: comp.uraian,
          partIndex: 0,
          otherPartHtml: '',
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
            const p1Html = p1Blocks.join('');
            const p2Html = p2Blocks.join('');

            currentPage.push({
              id: comp.id,
              realId: comp.id,
              order: comp.order,
              name: comp.name,
              uraian: p1Html,
              partIndex: 0,
              otherPartHtml: p2Html,
              indentMm: comp.indentMm,
            });
            pages.push(currentPage);

            const contItem = {
              id: `${comp.id}-cont-${pageIdx + 1}`,
              realId: comp.id,
              order: undefined,
              name: '',
              uraian: p2Html,
              partIndex: 1,
              otherPartHtml: p1Html,
              indentMm: comp.indentMm,
              isContinuation: true,
            };

            currentPage = [contItem];
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
                realId: comp.id,
                order: comp.order,
                name: comp.name,
                uraian: comp.uraian,
                partIndex: 0,
                otherPartHtml: '',
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
              realId: comp.id,
              order: comp.order,
              name: comp.name,
              uraian: comp.uraian,
              partIndex: 0,
              otherPartHtml: '',
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
  }, [docData.components]);

  const pageGroups = paginateDocumentComponents();
  const totalPages = pageGroups.length;

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    onReorderComponents(result);
  };

  const col3WidthPercent = Math.max(5, 100 - col1WidthPercent - col2WidthPercent);

  return (
    <div className="document-viewport" ref={containerRef}>
      <div
        className="document-scale-wrapper"
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top center',
          transition: 'transform 0.15s ease-out',
        }}
      >
        {/* DOCUMENT RULER BAR */}
        {showRuler && (
          <DocumentRuler
            leftMarginMm={leftMarginMm}
            rightMarginMm={rightMarginMm}
            col1WidthPercent={col1WidthPercent}
            col2WidthPercent={col2WidthPercent}
            activeColumn={focusedComponentId ? 'uraian' : 'document'}
            textIndentMm={activeIndentMm}
            onMarginChange={onMarginChange}
            onColumnWidthChange={onColumnWidthChange}
            onTextIndentChange={(indentMm) => {
              if (focusedComponentId) {
                onUpdateComponentIndent(focusedComponentId, indentMm);
              }
            }}
            onDragEnd={onRulerDragEnd}
          />
        )}

        <DragDropContext onDragEnd={handleDragEnd}>
          {pageGroups.map((pageComponents, pageIndex) => {
            const isFirstPage = pageIndex === 0;
            const isLastPage = pageIndex === totalPages - 1;
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
                  paddingTop: isFirstPage ? '20mm' : '20mm',
                  paddingBottom: '24mm',
                  paddingLeft: `${leftMarginMm}mm`,
                  paddingRight: `${rightMarginMm}mm`,
                  boxSizing: 'border-box',
                  position: 'relative',
                  color: '#000000',
                  fontSize: '11pt',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                {/* HEADER (PAGE 1 ONLY) */}
                {isFirstPage && (
                  <div className="doc-header-block" style={{ marginBottom: 18 }}>
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
                    <div
                      style={{
                        fontSize: '11pt',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span>JENIS LAYANAN :</span>
                      <input
                        type="text"
                        className="header-service-input"
                        value={docData.serviceType || ''}
                        onChange={(e) => onServiceTypeChange(e.target.value)}
                        placeholder="LEGALISASI..."
                        style={{
                          fontSize: '11pt',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          border: 'none',
                          borderBottom: '1px dashed #1a73e8',
                          outline: 'none',
                          padding: '2px 4px',
                          flex: 1,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* SP TABLE WITH CLOSED 4-SIDED BOX BORDERS */}
                <Droppable droppableId={`page-droppable-${pageIndex}`}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                      {pageComponents.length > 0 && (
                        <table
                          className="sp-table"
                          style={{ border: '1px solid #000000', borderCollapse: 'collapse' }}
                        >
                          <thead>
                            <tr>
                              <th style={{ width: `${col1WidthPercent}%`, border: '1px solid #000000' }}>
                                NO
                              </th>
                              <th style={{ width: `${col2WidthPercent}%`, border: '1px solid #000000' }}>
                                KOMPONEN
                              </th>
                              <th style={{ width: `${col3WidthPercent}%`, border: '1px solid #000000' }}>
                                URAIAN
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageComponents.map((item, itemIdx) => (
                              <ComponentItem
                                key={item.id}
                                component={item}
                                index={itemIdx}
                                onUpdateName={onUpdateComponentName}
                                onUpdateUraian={onUpdateComponentUraian}
                                onInsertAbove={(order) => onInsertComponentAt(order)}
                                onInsertBelow={(order) => onInsertComponentAt(order)}
                                onMoveUp={onMoveUp}
                                onMoveDown={onMoveDown}
                                onDelete={onDeleteComponent}
                                onFocusEditor={onFocusEditor}
                                onFocusCell={(column, id) => {
                                  if (column === 'uraian') {
                                    setFocusedComponentId(id);
                                  }
                                }}
                              />
                            ))}
                            {provided.placeholder}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </Droppable>

                {/* ADD COMPONENT FLOATING BUTTON AT BOTTOM OF TABLE (LAST PAGE ONLY) */}
                {isLastPage && (
                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
                    <button
                      className="add-component-floating-btn"
                      onClick={() => onInsertComponentAt(docData.components.length)}
                      title="Tambah Komponen Baru"
                    >
                      <Plus size={16} />
                      <span>Tambah Komponen</span>
                    </button>
                  </div>
                )}

                {/* SIGNATURE BLOCK (LAST PAGE ONLY) */}
                {isLastPage && (
                  <div
                    className="doc-signature-block"
                    style={{
                      marginTop: 36,
                      marginLeft: 'auto',
                      width: 360,
                      textAlign: 'center',
                    }}
                  >
                    <textarea
                      className="signature-title-input"
                      value={docData.signatoryTitle || defaultSigTitle}
                      onChange={(e) => onSignatoryTitleChange(e.target.value)}
                      rows={3}
                      style={{
                        width: '100%',
                        fontSize: '10.5pt',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        border: 'none',
                        resize: 'none',
                        background: 'transparent',
                        textTransform: 'uppercase',
                        fontFamily: 'inherit',
                        outline: 'none',
                      }}
                    />

                    {/* CAP & TANDA TANGAN IMAGE BOX */}
                    <div
                      className="signature-image-container"
                      style={{
                        position: 'relative',
                        minHeight: 80,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '8px 0',
                      }}
                    >
                      {docData.signatureImage ? (
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <img
                            src={docData.signatureImage}
                            alt="Cap & Tanda Tangan"
                            style={{ maxHeight: 90, maxWidth: 280, objectFit: 'contain' }}
                          />
                          <button
                            style={removeBtnStyle}
                            onClick={() => onSignatureImageChange(undefined)}
                            title="Hapus Gambar Cap/Tanda Tangan"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ) : (
                        <label
                          className="signature-upload-placeholder"
                          style={{
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            color: '#1a73e8',
                            fontSize: 12,
                            padding: '8px 12px',
                            border: '1px dashed #1a73e8',
                            borderRadius: 4,
                            background: '#e8f0fe',
                          }}
                        >
                          <Upload size={14} />
                          <span>Unggah Cap / Tanda Tangan</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                          />
                        </label>
                      )}
                    </div>

                    <input
                      type="text"
                      className="signature-name-input"
                      value={docData.signatoryName || 'ESTI WIDODO'}
                      onChange={(e) => onSignatoryNameChange(e.target.value)}
                      placeholder="NAMA PENANDATANGAN..."
                      style={{
                        fontSize: '11pt',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        border: 'none',
                        borderBottom: '1px dashed #ccc',
                        outline: 'none',
                        width: '100%',
                        padding: '2px 0',
                      }}
                    />
                  </div>
                )}

                {/* PAGE FOOTER */}
                <div className="page-number-footer" style={{ bottom: 12 }}>
                  Halaman {pageNum} dari {totalPages}
                </div>
              </div>
            );
          })}
        </DragDropContext>
      </div>
    </div>
  );
};
