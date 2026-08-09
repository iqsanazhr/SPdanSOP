import React from 'react';
import { X, Download, FileSpreadsheet } from 'lucide-react';
import { downloadDocxDocument } from '../api/client.js';

export const DocxPreviewModal = ({ isOpen, document: docData, onClose }) => {
  if (!isOpen || !docData) return null;

  const handleDownload = () => {
    downloadDocxDocument(docData).catch((err) => console.error(err));
  };

  const sigTitle =
    docData.signatoryTitle ||
    'KEPALA BADAN KEPEGAWAIAN\nDAN PENGEMBANGAN SUMBER DAYA MANUSIA\nKABUPATEN BANJARNEGARA';
  const sigName = docData.signatoryName || 'ESTI WIDODO';

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 12000 }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '225mm',
          maxWidth: '95vw',
          height: '90vh',
          padding: 16,
          zIndex: 12001,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileSpreadsheet size={20} color="#2b579a" />
            <span style={{ fontSize: 16, fontWeight: 600 }}>Pratinjau Dokumen Word (.docx)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="btn-primary"
              onClick={handleDownload}
              style={{ background: '#2b579a', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Download size={15} />
              <span>Download Word (.docx)</span>
            </button>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5f6368' }}
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* CONTINUOUS FLOW PREVIEW - MATCHES EDITOR & WORD */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            background: '#525659',
            padding: '24px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 6,
          }}
        >
          <div
            style={{
              width: '210mm',
              minHeight: '297mm',
              background: '#ffffff',
              padding: '20mm 15mm 24mm 15mm',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              fontFamily: 'Arial, sans-serif',
              fontSize: '11pt',
              lineHeight: 1.5,
              color: '#000000',
              boxSizing: 'border-box',
              marginBottom: 24,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* HEADER */}
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: '14pt',
                  fontWeight: 'bold',
                  marginBottom: 10,
                  textAlign: 'center',
                }}
              >
                STANDAR PELAYANAN PUBLIK
              </div>
              <div style={{ fontSize: '11pt', fontWeight: 'bold', textAlign: 'left' }}>
                JENIS LAYANAN : {docData.serviceType || 'LEGALISASI'}
              </div>
            </div>

            {/* SINGLE CONTINUOUS TABLE - ALL COMPONENTS */}
            {docData.components.length > 0 && (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '10.5pt',
                  tableLayout: 'fixed',
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        border: '1px solid #000',
                        padding: 8,
                        backgroundColor: '#f2f2f2',
                        width: '6%',
                        textAlign: 'center',
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word',
                      }}
                    >
                      NO
                    </th>
                    <th
                      style={{
                        border: '1px solid #000',
                        padding: 8,
                        backgroundColor: '#f2f2f2',
                        width: '32%',
                        textAlign: 'center',
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word',
                      }}
                    >
                      KOMPONEN
                    </th>
                    <th
                      style={{
                        border: '1px solid #000',
                        padding: 8,
                        backgroundColor: '#f2f2f2',
                        width: '62%',
                        textAlign: 'center',
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word',
                      }}
                    >
                      URAIAN
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {docData.components.map((comp) => (
                    <tr key={comp.id}>
                      <td
                        style={{
                          border: '1px solid #000',
                          padding: 8,
                          textAlign: 'center',
                          verticalAlign: 'top',
                          overflowWrap: 'break-word',
                          wordBreak: 'break-word',
                        }}
                      >
                        {comp.order}.
                      </td>
                      <td
                        style={{
                          border: '1px solid #000',
                          padding: 8,
                          fontWeight: 'bold',
                          verticalAlign: 'top',
                          overflowWrap: 'break-word',
                          wordBreak: 'break-word',
                        }}
                      >
                        {comp.name}
                      </td>
                      <td
                        style={{
                          border: '1px solid #000',
                          padding: 8,
                          verticalAlign: 'top',
                          paddingLeft: comp.indentMm ? `${comp.indentMm}mm` : '8px',
                          overflowWrap: 'break-word',
                          wordBreak: 'break-word',
                        }}
                        dangerouslySetInnerHTML={{ __html: comp.uraian || '' }}
                      />
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* SIGNATURE BLOCK */}
            <div
              style={{
                marginTop: 36,
                marginLeft: 'auto',
                width: 360,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '10.5pt',
                  fontWeight: 'bold',
                  lineHeight: 1.3,
                  textTransform: 'uppercase',
                  whiteSpace: 'pre-line',
                }}
              >
                {sigTitle}
              </div>
              <div
                style={{
                  minHeight: 80,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '8px 0',
                }}
              >
                {docData.signatureImage && (
                  <img
                    src={docData.signatureImage}
                    alt="Cap & Tanda Tangan"
                    style={{ maxHeight: 90, maxWidth: 280, objectFit: 'contain' }}
                  />
                )}
              </div>
              <div
                style={{
                  fontSize: '11pt',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                }}
              >
                {sigName}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
