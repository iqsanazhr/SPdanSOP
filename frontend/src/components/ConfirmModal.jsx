import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  isDanger = false,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{ zIndex: 50000 }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 420, zIndex: 50001 }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isDanger && <AlertTriangle size={20} color="#d93025" />}
            <span style={{ fontSize: 16, fontWeight: 600 }}>{title}</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#5f6368',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: 14, color: '#3c4043', lineHeight: 1.5 }}>{message}</p>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            {cancelText}
          </button>
          <button
            className={isDanger ? 'btn-danger' : 'btn-primary'}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
