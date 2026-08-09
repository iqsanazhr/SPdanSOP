import React, { useEffect, useState } from 'react';
import { X, FileText, Check } from 'lucide-react';
import { fetchTemplates } from '../api/client.js';

export const TemplateSelectorModal = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  const [templates, setTemplates] = useState([]);
  const [docTitle, setDocTitle] = useState('Standar Pelayanan Publik - Dokumen Baru');
  const [selectedTemplateId, setSelectedTemplateId] = useState();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchTemplates()
        .then((data) => {
          setTemplates(data);
          if (data.length > 0) {
            setSelectedTemplateId(data[0].id);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = () => {
    onSelectTemplate(selectedTemplateId, docTitle);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ width: 560 }}>
        <div className="modal-header">
          <span>New Document</span>
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5f6368' }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Nama Dokumen</label>
            <input
              type="text"
              className="form-input"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="Judul Dokumen..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Pilih Template Dokumen</label>
            {loading ? (
              <div style={{ padding: 12, fontSize: 13, color: '#5f6368' }}>Memuat template...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {templates.map((tpl) => {
                  const version = tpl.versions[0];
                  const isSelected = selectedTemplateId === tpl.id;
                  const itemStyle = {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 12,
                    borderRadius: 6,
                    border: `1px solid ${isSelected ? '#1a73e8' : '#dadce0'}`,
                    background: isSelected ? '#e8f0fe' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  };
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      style={itemStyle}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <FileText size={24} color="#1a73e8" />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#202124' }}>
                            {tpl.title}
                          </div>
                          <div style={{ fontSize: 12, color: '#5f6368' }}>
                            {version?.components.length || 0} components • Versi {version?.version || 1}.0
                          </div>
                        </div>
                      </div>
                      {isSelected && <Check size={18} color="#1a73e8" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn-primary" onClick={handleCreate}>
            Use Template
          </button>
        </div>
      </div>
    </div>
  );
};
