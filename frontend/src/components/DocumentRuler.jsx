import React, { useState, useRef, useEffect } from 'react';

export const DocumentRuler = ({
  leftMarginMm,
  rightMarginMm,
  col1WidthPercent,
  col2WidthPercent,
  activeColumn = 'document',
  textIndentMm = 0,
  onMarginChange,
  onColumnWidthChange,
  onTextIndentChange = () => {},
  onDragEnd = () => {},
}) => {
  const rulerRef = useRef(null);
  const [draggingTarget, setDraggingTarget] = useState(null);

  const TOTAL_A4_MM = 210;
  const printableMm = TOTAL_A4_MM - leftMarginMm - rightMarginMm;

  let activeStartMm = leftMarginMm;
  let activeEndMm = TOTAL_A4_MM - rightMarginMm;

  if (activeColumn === 'komponen') {
    activeStartMm = leftMarginMm + (col1WidthPercent / 100) * printableMm;
    activeEndMm = leftMarginMm + ((col1WidthPercent + col2WidthPercent) / 100) * printableMm;
  } else if (activeColumn === 'uraian') {
    activeStartMm = leftMarginMm + ((col1WidthPercent + col2WidthPercent) / 100) * printableMm;
    activeEndMm = TOTAL_A4_MM - rightMarginMm;
  }

  const handleMouseDown = (target, e) => {
    e.preventDefault();
    setDraggingTarget(target);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!draggingTarget || !rulerRef.current) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const widthPx = rect.width;
      const pxPerMm = widthPx / TOTAL_A4_MM;

      const currentMm = Math.max(0, Math.min(TOTAL_A4_MM, clickX / pxPerMm));

      if (draggingTarget === 'leftMargin') {
        const newLeftMm = Math.round(Math.max(5, Math.min(60, currentMm)));
        onMarginChange(newLeftMm, rightMarginMm);
      } else if (draggingTarget === 'rightMargin') {
        const newRightMm = Math.round(Math.max(5, Math.min(60, TOTAL_A4_MM - currentMm)));
        onMarginChange(leftMarginMm, newRightMm);
      } else if (draggingTarget === 'textIndent') {
        const relativeIndentMm = Math.round(Math.max(0, Math.min(40, currentMm - activeStartMm)));
        onTextIndentChange(relativeIndentMm);
      } else {
        const relativeMm = currentMm - leftMarginMm;
        const relativePercent = Math.max(3, Math.min(90, (relativeMm / printableMm) * 100));

        if (draggingTarget === 'col1Divider') {
          const newCol1 = Math.round(relativePercent);
          const maxCol2 = 90 - newCol1;
          const newCol2 = Math.min(col2WidthPercent, maxCol2);
          onColumnWidthChange(newCol1, newCol2);
        } else if (draggingTarget === 'col2Divider') {
          const newCol2 = Math.round(relativePercent - col1WidthPercent);
          if (newCol2 > 5 && col1WidthPercent + newCol2 < 95) {
            onColumnWidthChange(col1WidthPercent, newCol2);
          }
        }
      }
    };

    const handleMouseUp = () => {
      if (draggingTarget) {
        setDraggingTarget(null);
        onDragEnd();
      }
    };

    if (draggingTarget) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    draggingTarget,
    leftMarginMm,
    rightMarginMm,
    col1WidthPercent,
    col2WidthPercent,
    activeColumn,
    activeStartMm,
    printableMm,
    onMarginChange,
    onColumnWidthChange,
    onTextIndentChange,
    onDragEnd,
  ]);

  const cmTicks = Array.from({ length: 22 }, (_, i) => i);

  const leftMarginPercent = (leftMarginMm / TOTAL_A4_MM) * 100;
  const rightMarginPercent = ((TOTAL_A4_MM - rightMarginMm) / TOTAL_A4_MM) * 100;

  const col1DividerPercent =
    leftMarginPercent +
    (col1WidthPercent / 100) * (100 - leftMarginPercent - (100 - rightMarginPercent));
  const col2DividerPercent =
    leftMarginPercent +
    ((col1WidthPercent + col2WidthPercent) / 100) *
      (100 - leftMarginPercent - (100 - rightMarginPercent));

  const activeStartPercent = (activeStartMm / TOTAL_A4_MM) * 100;
  const activeEndPercent = (activeEndMm / TOTAL_A4_MM) * 100;
  const textIndentPercent = ((activeStartMm + textIndentMm) / TOTAL_A4_MM) * 100;

  return (
    <div className="ruler-container" ref={rulerRef}>
      {/* INACTIVE NON-SELECTED CELL OVERLAYS */}
      <div
        className="ruler-margin-overlay left"
        style={{ width: `${activeStartPercent}%` }}
      />
      <div
        className="ruler-margin-overlay right"
        style={{ left: `${activeEndPercent}%`, right: 0 }}
      />

      {/* ACTIVE CELL PRINTABLE HIGHLIGHT AREA */}
      <div
        className="ruler-active-zone"
        style={{
          left: `${activeStartPercent}%`,
          width: `${activeEndPercent - activeStartPercent}%`,
        }}
      />

      {/* CM TICKS & NUMBERS */}
      <div className="ruler-ticks">
        {cmTicks.map((cm) => {
          const posPercent = (cm / 21) * 100;
          return (
            <div
              key={cm}
              className="ruler-cm-tick"
              style={{ left: `${posPercent}%` }}
            >
              <span className="ruler-cm-number">{cm}</span>
            </div>
          );
        })}
      </div>

      {/* LEFT MARGIN DRAG HANDLE */}
      <div
        className={`ruler-handle left-margin ${draggingTarget === 'leftMargin' ? 'dragging' : ''}`}
        style={{ left: `${leftMarginPercent}%` }}
        onMouseDown={(e) => handleMouseDown('leftMargin', e)}
        title={`Margin Kiri: ${leftMarginMm}mm`}
      >
        <div className="ruler-handle-icon" />
      </div>

      {/* RIGHT MARGIN DRAG HANDLE */}
      <div
        className={`ruler-handle right-margin ${draggingTarget === 'rightMargin' ? 'dragging' : ''}`}
        style={{ left: `${rightMarginPercent}%` }}
        onMouseDown={(e) => handleMouseDown('rightMargin', e)}
        title={`Margin Kanan: ${rightMarginMm}mm`}
      >
        <div className="ruler-handle-icon" />
      </div>

      {/* COLUMN 1 DIVIDER DRAG HANDLE */}
      <div
        className={`ruler-col-divider col-1 ${draggingTarget === 'col1Divider' ? 'dragging' : ''}`}
        style={{ left: `${col1DividerPercent}%` }}
        onMouseDown={(e) => handleMouseDown('col1Divider', e)}
        title={`Batas Kolom NO / KOMPONEN (${col1WidthPercent}%)`}
      />

      {/* COLUMN 2 DIVIDER DRAG HANDLE */}
      <div
        className={`ruler-col-divider col-2 ${draggingTarget === 'col2Divider' ? 'dragging' : ''}`}
        style={{ left: `${col2DividerPercent}%` }}
        onMouseDown={(e) => handleMouseDown('col2Divider', e)}
        title={`Batas Kolom KOMPONEN / URAIAN (${col2WidthPercent}%)`}
      />

      {/* DYNAMIC TEXT INDENT HANDLE FOR SELECTED ELEMENT */}
      <div
        className={`ruler-indent-handle ${draggingTarget === 'textIndent' ? 'dragging' : ''}`}
        style={{ left: `${textIndentPercent}%` }}
        onMouseDown={(e) => handleMouseDown('textIndent', e)}
        title={`Indentasi Teks Yang Di-select: ${textIndentMm}mm`}
      >
        <div className="ruler-indent-rect" />
        <div className="ruler-indent-triangle" />
      </div>
    </div>
  );
};
