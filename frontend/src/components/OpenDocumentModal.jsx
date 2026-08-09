import React, { useEffect, useState } from 'react';
import { X, FileText, Trash2, Calendar } from 'lucide-react';
import { fetchDocuments, deleteDocument } from '../api/client.js';
import { ConfirmModal } from './ConfirmModal.jsx';

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return dateStr;
  }
}

export const OpenDocumentModal = ({
  isOpen,
  onClose,
  onSelectDocument,
  onDeleteDocument,
}) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    docId: '',
    title: '',
  });

  const loadDocs = () => {
    setLoading(true);
    fetchDocuments()
      .then((data) => setDocuments(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      loadDocs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePromptDelete = (e, docId, title) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteConfirm({
      isOpen: true,
      docId,
      title,
    });
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirm.docId) {
      const idToDelete = deleteConfirm.docId;
      await deleteDocument(idToDelete);
      setDeleteConfirm({ isOpen: false, docId: '', title: '' });
      if (onDeleteDocument) {
        onDeleteDocument(idToDelete);
      }
      loadDocs();
    }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ width: 580 }}>
          <div className="modal-header">
            <span>Open Document</span>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5f6368' }}
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>

          <div className="modal-body" style={{ maxHeight: 380, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 16, fontSize: 13, color: '#5f6368' }}>Memuat daftar dokumen...</div>
            ) : documents.length === 0 ? (
              <div style={{ padding: 16, fontSize: 13, color: '#5f6368', textAlign: 'center' }}>
                Belum ada dokumen tersimpan.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {documents.map((docItem) => (
                  <div
                    key={docItem.id}
                    onClick={() => {
                      onSelectDocument(docItem.id);
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      border: '1px solid #dadce0',
                      borderRadius: 6,
                      cursor: 'pointer',
                      background: '#ffffff',
                      transition: 'background 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f8f9fa';
                      e.currentTarget.style.borderColor = '#1a73e8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.borderColor = '#dadce0';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <FileText size={20} color="#1a73e8" />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#202124' }}>
                          {docItem.title}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: '#5f6368',
                            display: 'flex',
                            gap: 12,
                            marginTop: 2,
                          }}
                        >
                          <span>Layanan: {docItem.serviceType || '-'}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={12} />
                            {formatDate(docItem.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handlePromptDelete(e, docItem.id, docItem.title)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#d93025',
                        cursor: 'pointer',
                        padding: 6,
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Hapus Dokumen"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Hapus Dokumen"
        message={`Apakah Anda yakin ingin menghapus dokumen "${deleteConfirm.title}" secara permanen?`}
        confirmText="Hapus"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteConfirm({ isOpen: false, docId: '', title: '' })}
      />
    </>
  );
};
