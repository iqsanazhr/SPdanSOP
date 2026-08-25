import React from 'react';
import {
  Undo,
  Redo,
  Printer,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent,
  Outdent,
} from 'lucide-react';

export const Toolbar = ({ editor, zoom, onZoomChange, onPrint, hasDoc = true }) => {
  if (!hasDoc) {
    return (
      <div className="toolbar">
        <div style={{ fontSize: 12, color: '#70757a' }}>
          Pilih atau buat dokumen baru untuk memulai pengeditan...
        </div>
      </div>
    );
  }

  if (!editor || editor.isDestroyed) {
    return (
      <div className="toolbar">
        <div style={{ fontSize: 12, color: '#70757a' }}>
          Klik cell uraian dokumen untuk mengaktifkan toolbar pengeditan...
        </div>
      </div>
    );
  }

  const safeCanUndo = () => {
    try {
      return !!editor?.can?.()?.undo?.();
    } catch {
      return false;
    }
  };

  const safeCanRedo = () => {
    try {
      return !!editor?.can?.()?.redo?.();
    } catch {
      return false;
    }
  };

  const safeCanSink = () => {
    try {
      return !!editor?.can?.()?.sinkListItem?.('listItem');
    } catch {
      return false;
    }
  };

  const safeCanLift = () => {
    try {
      return !!editor?.can?.()?.liftListItem?.('listItem');
    } catch {
      return false;
    }
  };

  const safeIsActive = (name, opts) => {
    try {
      return !!editor?.isActive?.(name, opts);
    } catch {
      return false;
    }
  };

  return (
    <div className="toolbar">
      {/* Undo / Redo */}
      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!safeCanUndo()}
          title="Undo (Ctrl+Z)"
        >
          <Undo size={16} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!safeCanRedo()}
          title="Redo (Ctrl+Y)"
        >
          <Redo size={16} />
        </button>
        <button className="toolbar-btn" onClick={onPrint} title="Print / Download PDF">
          <Printer size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Zoom */}
      <div className="toolbar-group">
        <select
          className="toolbar-select"
          value={zoom}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          title="Zoom"
        >
          <option value={50}>50%</option>
          <option value={75}>75%</option>
          <option value={100}>100%</option>
          <option value={125}>125%</option>
          <option value={150}>150%</option>
        </select>
      </div>

      <div className="toolbar-divider" />

      {/* Font & Formatting */}
      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${safeIsActive('bold') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
        >
          <Bold size={16} />
        </button>
        <button
          className={`toolbar-btn ${safeIsActive('italic') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
        >
          <Italic size={16} />
        </button>
        <button
          className={`toolbar-btn ${safeIsActive('underline') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline (Ctrl+U)"
        >
          <Underline size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Alignment */}
      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${safeIsActive({ textAlign: 'left' }) ? 'active' : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Align Left"
        >
          <AlignLeft size={16} />
        </button>
        <button
          className={`toolbar-btn ${safeIsActive({ textAlign: 'center' }) ? 'active' : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Align Center"
        >
          <AlignCenter size={16} />
        </button>
        <button
          className={`toolbar-btn ${safeIsActive({ textAlign: 'right' }) ? 'active' : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Align Right"
        >
          <AlignRight size={16} />
        </button>
        <button
          className={`toolbar-btn ${safeIsActive({ textAlign: 'justify' }) ? 'active' : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          title="Justify"
        >
          <AlignJustify size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Lists & Poin dalam Poin (Sub-points) */}
      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${safeIsActive('bulletList') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Daftar Simbol (Bullet List)"
        >
          <List size={16} />
        </button>
        <button
          className={`toolbar-btn ${safeIsActive('orderedList') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Daftar Angka (Numbered List)"
        >
          <ListOrdered size={16} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
          disabled={!safeCanSink()}
          title="Buat Sub-Poin / Poin Dalam Poin (Tab)"
        >
          <Indent size={16} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => editor.chain().focus().liftListItem('listItem').run()}
          disabled={!safeCanLift()}
          title="Kembalikan Poin Ke Atas (Shift+Tab)"
        >
          <Outdent size={16} />
        </button>
      </div>
    </div>
  );
};
