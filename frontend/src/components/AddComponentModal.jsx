import React, { useState } from 'react';
import { X } from 'lucide-react';

export const AddComponentModal = ({
  isOpen,
  components,
  defaultInsertAfterOrder,
  onClose,
  onConfirm,
}) => {
  const [name, setName] = useState('');
  const [insertAfter, setInsertAfter] = useState(
    defaultInsertAfterOrder !== undefined ? defaultInsertAfterOrder : components.length
  );

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm(name.trim(), insertAfter);
    setName('');
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <span>Insert Component</span>
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5f6368' }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Component Name</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="misal: Persyaratan Tambahan"
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Insert After</label>
              <select
                className="form-select"
                value={insertAfter}
                onChange={(e) => setInsertAfter(Number(e.target.value))}
              >
                <option value={0}>[ Paling Atas (Sebelum Komponen 1) ]</option>
                {components.map((c) => (
                  <option key={c.id} value={c.order}>
                    Komponen {c.order}: {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Insert
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
