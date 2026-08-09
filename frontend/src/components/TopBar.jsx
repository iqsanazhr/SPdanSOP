import React from 'react';
import { FileText, CheckCircle2, Loader2, Download, FileSpreadsheet } from 'lucide-react';

export const TopBar = ({
  docTitle,
  onTitleChange,
  saveStatus,
  onExportPdf,
  onExportDocx,
  onLogoClick,
}) => {
  return (
    <div className="top-bar">
      <div className="top-bar-left">
        {/* APP NAME: Documents */}
        <div className="app-logo" onClick={onLogoClick} title="Beranda Documents">
          <FileText size={24} color="#1a73e8" />
          <span>Documents</span>
        </div>

        {/* DOCUMENT TITLE CARD CONTAINER */}
        <div className="doc-title-card">
          <input
            type="text"
            className="doc-title-input"
            value={docTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Judul Dokumen..."
          />
        </div>

        <div className={`saved-status ${saveStatus}`}>
          {saveStatus === 'saving' && (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <CheckCircle2 size={14} />
              <span>Saved ✓</span>
            </>
          )}
          {saveStatus === 'unsaved' && <span>Disimpan secara lokal</span>}
          {saveStatus === 'error' && <span style={{ color: '#d93025' }}>Gagal menyimpan</span>}
        </div>
      </div>

      <div className="top-bar-right">
        <button className="btn-secondary" onClick={onExportDocx} title="Download Format Word (.docx)">
          <FileSpreadsheet size={15} color="#2b579a" />
          <span>Export Word (.docx)</span>
        </button>
        <button className="btn-primary" onClick={onExportPdf} title="Download Format PDF">
          <Download size={15} />
          <span>Export PDF</span>
        </button>
      </div>
    </div>
  );
};
