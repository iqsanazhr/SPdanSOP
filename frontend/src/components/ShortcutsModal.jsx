import React from 'react';
import { X, Keyboard } from 'lucide-react';

export const ShortcutsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + S', desc: 'Simpan Dokumen (Autosave aktif)' },
    { key: 'Ctrl + Z', desc: 'Undo teks / perubahan' },
    { key: 'Ctrl + Y', desc: 'Redo teks / perubahan' },
    { key: 'Ctrl + B', desc: 'Format Teks Tebal (Bold)' },
    { key: 'Ctrl + I', desc: 'Format Teks Miring (Italic)' },
    { key: 'Ctrl + U', desc: 'Format Teks Garis Bawah (Underline)' },
  ];

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: '#f8f9fa',
    borderRadius: 4,
    border: '1px solid #e0e0e0',
  };

  const kbdStyle = {
    background: '#ffffff',
    border: '1px solid #dadce0',
    borderRadius: 4,
    padding: '2px 8px',
    fontSize: 12,
    fontWeight: 600,
    color: '#1a73e8',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ width: 440 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Keyboard size={20} color="#1a73e8" />
            <span>Keyboard Shortcuts</span>
          </div>
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5f6368' }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shortcuts.map((sc, i) => (
              <div key={i} style={rowStyle}>
                <span style={{ fontSize: 13, color: '#3c4043' }}>{sc.desc}</span>
                <kbd style={kbdStyle}>{sc.key}</kbd>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
