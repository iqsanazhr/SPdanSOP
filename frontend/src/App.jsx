import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  fetchDocuments,
  fetchDocumentById,
  createDocument,
  updateDocumentMetadata,
  updateDocumentComponents,
  addDocumentComponent,
  deleteDocumentComponent,
  duplicateDocument,
  deleteDocument,
} from './api/client.js';
import { TopBar } from './components/TopBar.jsx';
import { MenuBar } from './components/MenuBar.jsx';
import { Toolbar } from './components/Toolbar.jsx';
import { DocumentOutline } from './components/DocumentOutline.jsx';
import { DocumentEditor } from './components/DocumentEditor.jsx';
import { AddComponentModal } from './components/AddComponentModal.jsx';
import { TemplateSelectorModal } from './components/TemplateSelectorModal.jsx';
import { OpenDocumentModal } from './components/OpenDocumentModal.jsx';
import { PdfPreviewModal } from './components/PdfPreviewModal.jsx';
import { DocxPreviewModal } from './components/DocxPreviewModal.jsx';
import { ShortcutsModal } from './components/ShortcutsModal.jsx';
import { ToastContainer } from './components/Toast.jsx';
import { ConfirmModal } from './components/ConfirmModal.jsx';

export const App = () => {
  const [doc, setDoc] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [zoom, setZoom] = useState(100);
  const [showOutline, setShowOutline] = useState(true);
  const [showRuler, setShowRuler] = useState(true);
  const [leftMarginMm, setLeftMarginMm] = useState(15);
  const [rightMarginMm, setRightMarginMm] = useState(15);
  const [col1WidthPercent, setCol1WidthPercent] = useState(6);
  const [col2WidthPercent, setCol2WidthPercent] = useState(30);
  const [activeEditor, setActiveEditor] = useState(null);

  // Toast Notifications State
  const [toasts, setToasts] = useState([]);

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Undo / Redo History Stacks
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Modals state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showOpenDocModal, setShowOpenDocModal] = useState(false);
  const [showAddCompModal, setShowAddCompModal] = useState(false);
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);
  const [showDocxPreviewModal, setShowDocxPreviewModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [insertAfterOrder, setInsertAfterOrder] = useState();

  const autosaveTimerRef = useRef(null);

  // Helper to trigger Google Docs style Toast
  const addToast = (message, type = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Push current document state to Undo History
  const pushToUndoHistory = (currentDoc) => {
    setUndoStack((prev) => [...prev.slice(-30), JSON.parse(JSON.stringify(currentDoc))]);
    setRedoStack([]);
  };

  // Undo Action
  const handleUndo = () => {
    if (undoStack.length === 0 || !doc) {
      if (activeEditor?.can().undo()) {
        activeEditor.chain().focus().undo().run();
      }
      return;
    }

    const previousDoc = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    setRedoStack((prev) => [...prev, JSON.parse(JSON.stringify(doc))]);
    setUndoStack(newUndoStack);
    setDoc(previousDoc);
    triggerAutosave(previousDoc);
    addToast('Perubahan dibatalkan (Undo)', 'info');
  };

  // Redo Action
  const handleRedo = () => {
    if (redoStack.length === 0 || !doc) {
      if (activeEditor?.can().redo()) {
        activeEditor.chain().focus().redo().run();
      }
      return;
    }

    const nextDoc = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    setUndoStack((prev) => [...prev, JSON.parse(JSON.stringify(doc))]);
    setRedoStack(newRedoStack);
    setDoc(nextDoc);
    triggerAutosave(nextDoc);
    addToast('Perubahan dikembalikan (Redo)', 'info');
  };

  // Load initial demo document or latest document
  const initDocument = async () => {
    try {
      const docs = await fetchDocuments();
      if (docs.length > 0) {
        const fullDoc = await fetchDocumentById(docs[0].id);
        setDoc(fullDoc);
      } else {
        const newDoc = await createDocument({ title: 'Standar Pelayanan Publik - Legalisasi' });
        setDoc(newDoc);
      }
    } catch (error) {
      console.error('Error loading initial document:', error);
      addToast('Gagal memuat dokumen', 'error');
    }
  };

  useEffect(() => {
    initDocument();
  }, []);

  // Debounced Autosave Trigger
  const triggerAutosave = useCallback((updatedDoc) => {
    setSaveStatus('saving');
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(async () => {
      try {
        await updateDocumentMetadata(updatedDoc.id, {
          title: updatedDoc.title,
          serviceType: updatedDoc.serviceType,
          signatoryTitle: updatedDoc.signatoryTitle,
          signatoryName: updatedDoc.signatoryName,
          signatureImage: updatedDoc.signatureImage,
        });

        await updateDocumentComponents(
          updatedDoc.id,
          updatedDoc.components.map((c) => ({
            id: c.id,
            name: c.name,
            uraian: c.uraian,
            order: c.order,
          }))
        );

        setSaveStatus('saved');
      } catch (err) {
        console.error('Autosave error:', err);
        setSaveStatus('error');
        addToast('Gagal menyimpan otomatis', 'error');
      }
    }, 600);
  }, []);

  // Document Mutators with History Tracking
  const handleTitleChange = (newTitle) => {
    if (!doc) return;
    pushToUndoHistory(doc);
    const updated = { ...doc, title: newTitle };
    setDoc(updated);
    triggerAutosave(updated);
  };

  const handleServiceTypeChange = (newType) => {
    if (!doc) return;
    pushToUndoHistory(doc);
    const updated = { ...doc, serviceType: newType };
    setDoc(updated);
    triggerAutosave(updated);
  };

  const handleSignatoryTitleChange = (newTitle) => {
    if (!doc) return;
    pushToUndoHistory(doc);
    const updated = { ...doc, signatoryTitle: newTitle };
    setDoc(updated);
    triggerAutosave(updated);
  };

  const handleSignatoryNameChange = (newName) => {
    if (!doc) return;
    pushToUndoHistory(doc);
    const updated = { ...doc, signatoryName: newName };
    setDoc(updated);
    triggerAutosave(updated);
  };

  const handleSignatureImageChange = (base64Image) => {
    if (!doc) return;
    pushToUndoHistory(doc);
    const updated = { ...doc, signatureImage: base64Image };
    setDoc(updated);
    triggerAutosave(updated);
    if (base64Image) {
      addToast('Cap / Tanda tangan berhasil diunggah ✓', 'success');
    } else {
      addToast('Cap / Tanda tangan telah dihapus', 'info');
    }
  };

  const handleUpdateComponentName = (id, name) => {
    if (!doc) return;
    pushToUndoHistory(doc);
    const updatedComponents = doc.components.map((c) => (c.id === id ? { ...c, name } : c));
    const updated = { ...doc, components: updatedComponents };
    setDoc(updated);
    triggerAutosave(updated);
  };

  const handleUpdateComponentUraian = (id, uraian) => {
    if (!doc) return;
    const updatedComponents = doc.components.map((c) => (c.id === id ? { ...c, uraian } : c));
    const updated = { ...doc, components: updatedComponents };
    setDoc(updated);
    triggerAutosave(updated);
  };

  const handleUpdateComponentIndent = (id, indentMm) => {
    if (!doc) return;
    const updatedComponents = doc.components.map((c) =>
      c.id === id ? { ...c, indentMm } : c
    );
    const updated = { ...doc, components: updatedComponents };
    setDoc(updated);
    triggerAutosave(updated);
  };

  const handleRulerDragEnd = () => {
    if (doc) {
      pushToUndoHistory(doc);
    }
  };

  const handleExportDocx = () => {
    if (!doc) return;
    setShowDocxPreviewModal(true);
  };

  const handleReorderComponents = (result) => {
    if (!result.destination || !doc) return;
    pushToUndoHistory(doc);
    const items = Array.from(doc.components);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const renumbered = items.map((item, index) => ({
      ...item,
      order: index + 1,
    }));

    const updated = { ...doc, components: renumbered };
    setDoc(updated);
    triggerAutosave(updated);
    addToast('Urutan komponen diperbarui ✓', 'success');
  };

  const handleMoveUp = (index) => {
    if (index === 0 || !doc) return;
    pushToUndoHistory(doc);
    const items = Array.from(doc.components);
    const temp = items[index - 1];
    items[index - 1] = items[index];
    items[index] = temp;

    const renumbered = items.map((item, i) => ({ ...item, order: i + 1 }));
    const updated = { ...doc, components: renumbered };
    setDoc(updated);
    triggerAutosave(updated);
  };

  const handleMoveDown = (index) => {
    if (!doc || index >= doc.components.length - 1) return;
    pushToUndoHistory(doc);
    const items = Array.from(doc.components);
    const temp = items[index + 1];
    items[index + 1] = items[index];
    items[index] = temp;

    const renumbered = items.map((item, i) => ({ ...item, order: i + 1 }));
    const updated = { ...doc, components: renumbered };
    setDoc(updated);
    triggerAutosave(updated);
  };

  const handleConfirmAddComponent = async (name, insertAfter) => {
    if (!doc) return;
    pushToUndoHistory(doc);
    setSaveStatus('saving');
    setShowAddCompModal(false);

    try {
      const updatedDoc = await addDocumentComponent(doc.id, {
        name,
        insertAfterOrder: insertAfter,
      });
      setDoc(updatedDoc);
      setSaveStatus('saved');
      addToast(`Komponen "${name}" ditambahkan ✓`, 'success');
    } catch (err) {
      console.error('Error adding component:', err);
      setSaveStatus('error');
      addToast('Gagal menambahkan komponen', 'error');
    }
  };

  const handleDeleteComponent = (id, name) => {
    if (!doc) return;
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Komponen Dokumen',
      message: `Apakah Anda yakin ingin menghapus komponen "${name}" dari dokumen ini?`,
      confirmText: 'Hapus Komponen',
      isDanger: true,
      onConfirm: async () => {
        pushToUndoHistory(doc);
        setSaveStatus('saving');
        try {
          const updatedDoc = await deleteDocumentComponent(doc.id, id);
          setDoc(updatedDoc);
          setSaveStatus('saved');
          addToast(`Komponen "${name}" berhasil dihapus`, 'info');
        } catch (err) {
          console.error('Error deleting component:', err);
          setSaveStatus('error');
          addToast('Gagal menghapus komponen', 'error');
        }
      },
    });
  };

  const handleSelectTemplate = async (templateId, title) => {
    setSaveStatus('saving');
    try {
      const newDoc = await createDocument({
        templateId,
        title: title || 'Standar Pelayanan Publik Baru',
      });
      setDoc(newDoc);
      setSaveStatus('saved');
      addToast('Dokumen baru berhasil dibuat ✓', 'success');
    } catch (err) {
      console.error('Error creating document:', err);
      setSaveStatus('error');
      addToast('Gagal membuat dokumen', 'error');
    }
  };

  const handleOpenDocument = async (docId) => {
    try {
      const selectedDoc = await fetchDocumentById(docId);
      setDoc(selectedDoc);
      addToast(`Membuka "${selectedDoc.title}" ✓`, 'success');
    } catch (err) {
      console.error('Error opening document:', err);
      addToast('Gagal membuka dokumen', 'error');
    }
  };

  const handleMakeCopy = async () => {
    if (!doc) return;
    setSaveStatus('saving');
    try {
      const copyDoc = await duplicateDocument(doc.id);
      setDoc(copyDoc);
      setSaveStatus('saved');
      addToast(`Dokumen berhasil diduplikasi: "${copyDoc.title}" ✓`, 'success');
    } catch (err) {
      console.error('Error duplicating document:', err);
      setSaveStatus('error');
      addToast('Gagal menduplikasi dokumen', 'error');
    }
  };

  const handleManualSave = async () => {
    if (!doc) return;
    setSaveStatus('saving');
    try {
      await updateDocumentMetadata(doc.id, {
        title: doc.title,
        serviceType: doc.serviceType,
        signatoryTitle: doc.signatoryTitle,
        signatoryName: doc.signatoryName,
        signatureImage: doc.signatureImage,
      });
      await updateDocumentComponents(
        doc.id,
        doc.components.map((c) => ({
          id: c.id,
          name: c.name,
          uraian: c.uraian,
          order: c.order,
        }))
      );
      setSaveStatus('saved');
      addToast('Seluruh perubahan berhasil disimpan ✓', 'success');
    } catch (err) {
      console.error('Error saving document:', err);
      setSaveStatus('error');
      addToast('Gagal menyimpan dokumen', 'error');
    }
  };

  const handleDeleteCurrentDoc = () => {
    if (!doc) return;
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Dokumen Permanen',
      message: `Apakah Anda yakin ingin menghapus dokumen "${doc.title}" secara permanen? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus Dokumen',
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteDocument(doc.id);
          addToast(`Dokumen "${doc.title}" telah dihapus`, 'info');
          initDocument();
        } catch (err) {
          console.error('Error deleting document:', err);
          addToast('Gagal menghapus dokumen', 'error');
        }
      },
    });
  };

  const handleShowWordCount = () => {
    if (!doc) return;
    const fullText = doc.components.map((c) => c.name + ' ' + c.uraian.replace(/<[^>]*>?/gm, '')).join(' ');
    const words = fullText.trim().split(/\s+/).filter(Boolean).length;
    const chars = fullText.length;
    addToast(`Statistik Dokumen:\n• Jumlah Komponen: ${doc.components.length}\n• Total Kata: ${words}\n• Total Karakter: ${chars}`, 'info');
  };

  const handleAuditComponents = () => {
    if (!doc) return;
    const required = [
      'Dasar Hukum',
      'Persyaratan Pelayanan',
      'Sistem, Mekanisme, dan Prosedur',
      'Jangka Waktu Pelayanan',
      'Biaya/Tarif',
      'Produk Pelayanan',
      'Sarana, Prasarana dan/atau Fasilitas',
      'Kompetensi Pelaksana',
      'Pengawasan Internal',
      'Pengelolaan Pengaduan',
      'Jumlah Pelaksana',
      'Jaminan Pelayanan',
      'Jaminan Keamanan dan Keselamatan Pelayanan',
      'Evaluasi Kinerja Pelaksana',
    ];
    const presentNames = doc.components.map((c) => c.name.trim().toLowerCase());
    const missing = required.filter((r) => !presentNames.includes(r.toLowerCase()));
    if (missing.length === 0) {
      addToast('✅ Audit Berhasil!\nDokumen ini memiliki seluruh 14 Komponen Standar Pelayanan Publik secara lengkap.', 'success');
    } else {
      addToast(`⚠️ Hasil Audit Komponen:\nBelum memiliki ${missing.length} komponen:\n` + missing.map((m, i) => `${i + 1}. ${m}`).join('\n'), 'info');
    }
  };

  const handleAddSignatureBlock = async () => {
    if (!doc) return;
    const sigEl = document.querySelector('.doc-signature-block');
    if (sigEl) {
      sigEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      addToast('Menggulir ke blok Tanda Tangan', 'info');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [doc, undoStack, redoStack]);

  return (
    <div className="app-container">
      {/* TOP BAR */}
      <TopBar
        docTitle={doc?.title ?? ''}
        onTitleChange={handleTitleChange}
        saveStatus={saveStatus}
        onExportPdf={() => setShowPdfPreviewModal(true)}
        onExportDocx={handleExportDocx}
        onLogoClick={() => setShowOpenDocModal(true)}
      />

      {/* MENU BAR */}
      <MenuBar
        onNewDoc={() => setShowTemplateModal(true)}
        onOpenDoc={() => setShowOpenDocModal(true)}
        onMakeCopy={handleMakeCopy}
        onSave={handleManualSave}
        onExportPdf={() => setShowPdfPreviewModal(true)}
        onExportDocx={handleExportDocx}
        onDeleteDoc={handleDeleteCurrentDoc}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleOutline={() => setShowOutline(!showOutline)}
        showRuler={showRuler}
        onToggleRuler={() => setShowRuler(!showRuler)}
        onAddComponent={() => {
          setInsertAfterOrder(doc?.components.length || 0);
          setShowAddCompModal(true);
        }}
        onShowShortcuts={() => setShowShortcutsModal(true)}
        editor={activeEditor}
        zoom={zoom}
        onZoomChange={(z) => setZoom(z)}
        onAddSignatureBlock={handleAddSignatureBlock}
        onShowWordCount={handleShowWordCount}
        onAuditComponents={handleAuditComponents}
      />

      {/* TOOLBAR */}
      <Toolbar
        editor={activeEditor}
        zoom={zoom}
        onZoomChange={(newZoom) => setZoom(newZoom)}
        onPrint={() => setShowPdfPreviewModal(true)}
      />

      {/* MAIN CONTENT AREA */}
      <div className="main-layout">
        {/* DOCUMENT OUTLINE SIDEBAR */}
        {doc && (
          <DocumentOutline
            components={doc.components}
            isOpen={showOutline}
            onToggle={() => setShowOutline(!showOutline)}
          />
        )}

        {/* DOCUMENT EDITOR CANVAS WITH RULER */}
        {doc ? (
          <DocumentEditor
            document={doc}
            zoom={zoom}
            showRuler={showRuler}
            leftMarginMm={leftMarginMm}
            rightMarginMm={rightMarginMm}
            col1WidthPercent={col1WidthPercent}
            col2WidthPercent={col2WidthPercent}
            onMarginChange={(left, right) => {
              setLeftMarginMm(left);
              setRightMarginMm(right);
            }}
            onColumnWidthChange={(col1, col2) => {
              setCol1WidthPercent(col1);
              setCol2WidthPercent(col2);
            }}
            onUpdateComponentIndent={handleUpdateComponentIndent}
            onRulerDragEnd={handleRulerDragEnd}
            onServiceTypeChange={handleServiceTypeChange}
            onSignatoryTitleChange={handleSignatoryTitleChange}
            onSignatoryNameChange={handleSignatoryNameChange}
            onSignatureImageChange={handleSignatureImageChange}
            onUpdateComponentName={handleUpdateComponentName}
            onUpdateComponentUraian={handleUpdateComponentUraian}
            onReorderComponents={handleReorderComponents}
            onInsertComponentAt={(order) => {
              setInsertAfterOrder(order);
              setShowAddCompModal(true);
            }}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onDeleteComponent={handleDeleteComponent}
            onFocusEditor={(editor) => setActiveEditor(editor)}
          />
        ) : (
          <div className="document-viewport">
            <div style={{ padding: 32, color: '#5f6368', fontSize: 14 }}>
              Memuat dokumen Standar Pelayanan Publik...
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      <TemplateSelectorModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      <OpenDocumentModal
        isOpen={showOpenDocModal}
        onClose={() => setShowOpenDocModal(false)}
        onSelectDocument={handleOpenDocument}
        onDeleteDocument={(deletedId) => {
          addToast('Dokumen berhasil dihapus', 'info');
          if (doc && doc.id === deletedId) {
            initDocument();
          }
        }}
      />

      <AddComponentModal
        isOpen={showAddCompModal}
        components={doc?.components || []}
        defaultInsertAfterOrder={insertAfterOrder}
        onClose={() => setShowAddCompModal(false)}
        onConfirm={handleConfirmAddComponent}
      />

      <PdfPreviewModal
        isOpen={showPdfPreviewModal}
        document={doc}
        onClose={() => setShowPdfPreviewModal(false)}
      />

      <DocxPreviewModal
        isOpen={showDocxPreviewModal}
        document={doc}
        onClose={() => setShowDocxPreviewModal(false)}
      />

      <ShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        isDanger={confirmModal.isDanger}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
