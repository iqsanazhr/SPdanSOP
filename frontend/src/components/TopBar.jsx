import React from 'react';
import { FileText, CheckCircle2, Loader2, Download, FileSpreadsheet } from 'lucide-react';
import appLogo from '../assets/app-logo.png';

export const TopBar = ({
  docTitle,
  onTitleChange,
  saveStatus,
  onExportPdf,
  onExportDocx,
  onLogoClick,
  hasDoc = true,
}) => {
  return (
    <div className="top-bar">
      <div className="top-bar-left">
        {/* APP BRANDING & LOGO */}
        <div className="app-logo" onClick={onLogoClick} title="Beranda SP & SOP Maker" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <img src={appLogo} alt="SP & SOP Maker Logo" style={{ height: 28, width: 28, objectFit: 'contain', borderRadius: 4 }} />
          <span style={{ fontWeight: 700, color: '#1a1a1a', fontSize: '15px', letterSpacing: '-0.2px' }}>SP & SOP Maker</span>
        </div>

        {/* DOCUMENT TITLE CARD CONTAINER */}
        {hasDoc && (
          <div className="doc-title-card">
            <input
              type="text"
              className="doc-title-input"
              value={docTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Judul Dokumen..."
            />
          </div>
        )}

        {hasDoc && (
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
        )}
      </div>

      <div className="top-bar-right">
        {hasDoc && (
          <>
            <button className="btn-secondary" onClick={onExportDocx} title="Download Format Word (.docx)">
              <FileSpreadsheet size={15} color="#2b579a" />
              <span>Export Word (.docx)</span>
            </button>
            <button className="btn-primary" onClick={onExportPdf} title="Download Format PDF">
              <Download size={15} />
              <span>Export PDF</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
