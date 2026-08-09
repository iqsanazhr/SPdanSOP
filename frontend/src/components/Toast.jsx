import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer = ({ toasts, onDismiss }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className={`toast-item ${toast.type}`}>
      <div className="toast-icon">
        {toast.type === 'success' && <CheckCircle2 size={16} color="#81c995" />}
        {toast.type === 'error' && <AlertCircle size={16} color="#f28b82" />}
        {toast.type === 'info' && <Info size={16} color="#8ab4f8" />}
      </div>
      <div className="toast-message">{toast.message}</div>
      <button className="toast-close-btn" onClick={() => onDismiss(toast.id)}>
        <X size={14} />
      </button>
    </div>
  );
};
