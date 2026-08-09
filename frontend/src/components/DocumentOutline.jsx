import React from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export const DocumentOutline = ({
  components,
  isOpen,
  onToggle,
  activeComponentId,
}) => {
  const handleScrollToComponent = (id) => {
    const el = document.getElementById(`comp-row-${id}`);
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

  // EXPANDED STATE
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
        {components.map((comp) => (
          <li
            key={comp.id}
            className={`outline-item ${activeComponentId === comp.id ? 'active' : ''}`}
            onClick={() => handleScrollToComponent(comp.id)}
            title={`${comp.order}. ${comp.name}`}
          >
            {comp.order}. {comp.name}
          </li>
        ))}
      </ul>
    </div>
  );
};
