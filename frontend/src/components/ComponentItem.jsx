import React, { useState, useRef, useEffect } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { GripVertical, MoreVertical, Plus, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { TiptapEditor } from './TiptapEditor.jsx';

function mergeSplitHtml(part1, part2) {
  if (!part1) return part2 || '';
  if (!part2) return part1 || '';

  const p1Clean = part1.trim();
  const p2Clean = part2.trim();

  // If part1 ends with </p> and part2 starts with <p>, merge them into a single unbroken paragraph
  if (p1Clean.endsWith('</p>') && p2Clean.startsWith('<p>')) {
    return p1Clean.slice(0, -4) + p2Clean.slice(3);
  }

  return p1Clean + p2Clean;
}

export const ComponentItem = ({
  component,
  index,
  onUpdateName,
  onUpdateUraian,
  onInsertAbove,
  onInsertBelow,
  onMoveUp,
  onMoveDown,
  onDelete,
  onFocusEditor,
  onFocusCell = () => {},
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cellIndent = component.indentMm || 0;
  const isContinuation = component.isContinuation || false;
  const targetId = component.realId || component.id;

  return (
    <Draggable draggableId={component.id} index={index}>
      {(provided, snapshot) => (
        <tr
          id={`comp-row-${component.id}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="component-row"
          style={{
            ...provided.draggableProps.style,
            backgroundColor: snapshot.isDragging ? '#e8f0fe' : 'transparent',
          }}
        >
          {/* NO COLUMN */}
          <td className="col-no-cell">
            {!isContinuation ? (
              <>
                <div
                  {...provided.dragHandleProps}
                  className="row-drag-handle"
                  title="Seret untuk mengubah urutan komponen"
                >
                  <GripVertical size={16} />
                </div>
                <span>{component.order}.</span>
              </>
            ) : (
              <div {...provided.dragHandleProps} style={{ display: 'none' }} />
            )}
          </td>

          {/* KOMPONEN COLUMN */}
          <td className="col-komponen-cell" style={{ position: 'relative' }}>
            {!isContinuation ? (
              <>
                <input
                  type="text"
                  className="comp-name-input"
                  value={component.name}
                  onFocus={() => onFocusCell('komponen', targetId)}
                  onChange={(e) => onUpdateName(targetId, e.target.value)}
                  placeholder="Nama Komponen..."
                />

                <button
                  className="row-action-btn"
                  onClick={() => setShowMenu(!showMenu)}
                  title="Opsi Komponen"
                >
                  <MoreVertical size={14} />
                </button>

                {showMenu && (
                  <div
                    className="dropdown-menu"
                    ref={menuRef}
                    style={{ right: 0, left: 'auto', top: 32 }}
                  >
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setShowMenu(false);
                        onInsertAbove((component.order || 1) - 1);
                      }}
                    >
                      <Plus size={14} style={{ marginRight: 8 }} /> Sisipkan di Atas
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setShowMenu(false);
                        onInsertBelow(component.order || 1);
                      }}
                    >
                      <Plus size={14} style={{ marginRight: 8 }} /> Sisipkan di Bawah
                    </button>
                    <div className="dropdown-divider" />
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setShowMenu(false);
                        onMoveUp(index);
                      }}
                    >
                      <ArrowUp size={14} style={{ marginRight: 8 }} /> Pindah ke Atas
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setShowMenu(false);
                        onMoveDown(index);
                      }}
                    >
                      <ArrowDown size={14} style={{ marginRight: 8 }} /> Pindah ke Bawah
                    </button>
                    <div className="dropdown-divider" />
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setShowMenu(false);
                        onDelete(targetId, component.name);
                      }}
                      style={{ color: '#d93025' }}
                    >
                      <Trash2 size={14} style={{ marginRight: 8 }} /> Hapus Komponen
                    </button>
                  </div>
                )}
              </>
            ) : null}
          </td>

          {/* URAIAN COLUMN (FULLY INTERACTIVE TIPTAP EDITOR ON BOTH PAGES) */}
          <td
            className="col-uraian-cell"
            style={{
              paddingLeft: cellIndent > 0 ? `${cellIndent}mm` : undefined,
              transition: 'padding-left 0.15s ease',
            }}
          >
            <TiptapEditor
              content={component.uraian}
              onChange={(html) => {
                let fullHtml = html;
                if (!isContinuation && component.otherPartHtml) {
                  fullHtml = mergeSplitHtml(html, component.otherPartHtml);
                } else if (isContinuation && component.otherPartHtml) {
                  fullHtml = mergeSplitHtml(component.otherPartHtml, html);
                }
                onUpdateUraian(targetId, fullHtml);
              }}
              onFocus={(editor) => {
                onFocusCell('uraian', targetId);
                onFocusEditor(editor);
              }}
              placeholder={!isContinuation ? `Isikan uraian untuk ${component.name || 'komponen'} di sini...` : ''}
              onBackspaceAtStart={
                isContinuation
                  ? () => {
                      const mainEl = document.getElementById(`comp-row-${targetId}`);
                      if (mainEl) {
                        mainEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        const editorEl = mainEl.querySelector('.ProseMirror');
                        if (editorEl) editorEl.focus();
                      }
                    }
                  : undefined
              }
              onArrowUpAtStart={
                isContinuation
                  ? () => {
                      const mainEl = document.getElementById(`comp-row-${targetId}`);
                      if (mainEl) {
                        mainEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        const editorEl = mainEl.querySelector('.ProseMirror');
                        if (editorEl) editorEl.focus();
                      }
                    }
                  : undefined
              }
            />
          </td>
        </tr>
      )}
    </Draggable>
  );
};
