import React from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export const DocumentOutline = ({
  components,
  docType,
  docData,
  isOpen,
  onToggle,
  activeComponentId,
}) => {
  const handleScrollToElement = (elementId) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // COLLAPSED STATE (Slim icon bar on left edge)
  if (!isOpen) {
    return (
      <div className="outline-sidebar collapsed">
        <button
          className="outline-toggle-btn"
          onClick={onToggle}
          title="Tampilkan Document Outline"
        >
          <PanelLeftOpen size={18} />
        </button>
      </div>
    );
  }

  const isSop = docType === 'SOP';

  // EXPANDED STATE FOR SOP
  if (isSop) {
    const sopSections = [
      { id: 'sop-sec-identitas', label: '1. Identitas & Pengesahan SOP' },
      { id: 'sop-sec-dasar-hukum', label: '2. Dasar Hukum' },
      { id: 'sop-sec-kualifikasi', label: '3. Kualifikasi Pelaksana' },
      { id: 'sop-sec-keterkaitan', label: '4. Keterkaitan' },
      { id: 'sop-sec-peralatan', label: '5. Peralatan / Perlengkapan' },
      { id: 'sop-sec-peringatan', label: '6. Peringatan' },
      { id: 'sop-sec-pencatatan', label: '7. Pencatatan & Pendataan' },
      { id: 'sop-sec-flowchart', label: '8. Bagan Alir (Flowchart)' },
      { id: 'sop-sec-ttd', label: '9. Penandatangan' },
    ];

    return (
      <div className="outline-sidebar">
        <div className="outline-header">
          <span>OUTLINE DOKUMEN SOP</span>
          <button
            className="outline-toggle-btn"
            onClick={onToggle}
            title="Sembunyikan Document Outline"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
        <ul className="outline-list">
          {sopSections.map((sec) => (
            <li
              key={sec.id}
              className="outline-item"
              onClick={() => handleScrollToElement(sec.id)}
              title={sec.label}
            >
              {sec.label}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // EXPANDED STATE FOR SP
  return (
    <div className="outline-sidebar">
      <div className="outline-header">
        <span>DOCUMENT OUTLINE</span>
        <button
          className="outline-toggle-btn"
          onClick={onToggle}
          title="Sembunyikan Document Outline"
        >
          <PanelLeftClose size={18} />
        </button>
      </div>
      <ul className="outline-list">
        {(components || []).map((comp) => (
          <li
            key={comp.id}
            className={`outline-item ${activeComponentId === comp.id ? 'active' : ''}`}
            onClick={() => handleScrollToElement(`comp-row-${comp.id}`)}
            title={`${comp.order}. ${comp.name}`}
          >
            {comp.order}. {comp.name}
          </li>
        ))}
      </ul>
    </div>
  );
};
