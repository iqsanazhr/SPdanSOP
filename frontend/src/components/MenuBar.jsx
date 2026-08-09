import React, { useState, useRef, useEffect } from 'react';
import {
  FilePlus,
  FolderOpen,
  Copy,
  Save,
  Download,
  Trash2,
  Undo,
  Redo,
  PlusSquare,
  Eye,
  HelpCircle,
  Printer,
  Search,
  Scissors,
  Clipboard,
  Maximize2,
  Minus,
  FileSignature,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  BarChart2,
  CheckCircle2,
  BookOpen,
  Info,
  ChevronRight,
  Eraser,
  Ruler,
  FileText,
} from 'lucide-react';

export const MenuBar = ({
  onNewDoc,
  onOpenDoc,
  onMakeCopy,
  onSave,
  onExportPdf,
  onExportDocx,
  onDeleteDoc,
  onUndo,
  onRedo,
  onToggleOutline,
  showRuler = true,
  onToggleRuler = () => {},
  onAddComponent,
  onShowShortcuts,
  editor,
  zoom,
  onZoomChange,
  onAddSignatureBlock,
  onAddHorizontalRule,
  onShowWordCount,
  onAuditComponents,
}) => {
  const [activeMenu, setActiveMenu] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (menuName) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const handleAction = (action) => {
    if (action) action();
    setActiveMenu(null);
  };

  const handleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
    setActiveMenu(null);
  };

  return (
    <div className="menu-bar" ref={menuRef}>
      {/* FILE MENU */}
      <div className="menu-item">
        <button
          className={`menu-button ${activeMenu === 'file' ? 'active' : ''}`}
          onClick={() => toggleMenu('file')}
        >
          File
        </button>
        {activeMenu === 'file' && (
          <div className="dropdown-menu">
            <button className="dropdown-item" onClick={() => handleAction(onNewDoc)}>
              <span className="dropdown-item-label">
                <FilePlus size={14} /> New Document
              </span>
            </button>
            <button className="dropdown-item" onClick={() => handleAction(onOpenDoc)}>
              <span className="dropdown-item-label">
                <FolderOpen size={14} /> Open...
              </span>
            </button>
            <button className="dropdown-item" onClick={() => handleAction(onMakeCopy)}>
              <span className="dropdown-item-label">
                <Copy size={14} /> Make a Copy
              </span>
            </button>
            <div className="dropdown-divider" />
            <button className="dropdown-item" onClick={() => handleAction(onSave)}>
              <span className="dropdown-item-label">
                <Save size={14} /> Save
              </span>
              <span className="dropdown-shortcut">Ctrl+S</span>
            </button>
            <button className="dropdown-item" onClick={() => handleAction(onExportDocx)}>
              <span className="dropdown-item-label">
                <FileText size={14} color="#2b579a" /> Download Word (.docx)
              </span>
            </button>
            <button className="dropdown-item" onClick={() => handleAction(onExportPdf)}>
              <span className="dropdown-item-label">
                <Download size={14} /> Download PDF
              </span>
            </button>
            <button className="dropdown-item" onClick={() => handleAction(onExportPdf)}>
              <span className="dropdown-item-label">
                <Printer size={14} /> Print / Preview
              </span>
              <span className="dropdown-shortcut">Ctrl+P</span>
            </button>
            <div className="dropdown-divider" />
            <button
              className="dropdown-item"
              onClick={() => handleAction(onDeleteDoc)}
              style={{ color: '#d93025' }}
            >
              <span className="dropdown-item-label">
                <Trash2 size={14} /> Delete Document
              </span>
            </button>
          </div>
        )}
      </div>

      {/* EDIT MENU */}
      <div className="menu-item">
        <button
          className={`menu-button ${activeMenu === 'edit' ? 'active' : ''}`}
          onClick={() => toggleMenu('edit')}
        >
          Edit
        </button>
        {activeMenu === 'edit' && (
          <div className="dropdown-menu">
            <button className="dropdown-item" onClick={() => handleAction(onUndo)}>
              <span className="dropdown-item-label">
                <Undo size={14} /> Undo
              </span>
              <span className="dropdown-shortcut">Ctrl+Z</span>
            </button>
            <button className="dropdown-item" onClick={() => handleAction(onRedo)}>
              <span className="dropdown-item-label">
                <Redo size={14} /> Redo
              </span>
              <span className="dropdown-shortcut">Ctrl+Y</span>
            </button>
            <div className="dropdown-divider" />
            <button
              className="dropdown-item"
              onClick={() => {
                document.execCommand('cut');
                setActiveMenu(null);
              }}
            >
              <span className="dropdown-item-label">
                <Scissors size={14} /> Cut
              </span>
              <span className="dropdown-shortcut">Ctrl+X</span>
            </button>
            <button
              className="dropdown-item"
              onClick={() => {
                document.execCommand('copy');
                setActiveMenu(null);
              }}
            >
              <span className="dropdown-item-label">
                <Copy size={14} /> Copy
              </span>
              <span className="dropdown-shortcut">Ctrl+C</span>
            </button>
            <button
              className="dropdown-item"
              onClick={() => {
                navigator.clipboard?.readText();
                setActiveMenu(null);
              }}
            >
              <span className="dropdown-item-label">
                <Clipboard size={14} /> Paste
              </span>
              <span className="dropdown-shortcut">Ctrl+V</span>
            </button>
            <div className="dropdown-divider" />
            <button
              className="dropdown-item"
              onClick={() => {
                onShowShortcuts();
                setActiveMenu(null);
              }}
            >
              <span className="dropdown-item-label">
                <Search size={14} /> Find & Replace
              </span>
              <span className="dropdown-shortcut">Ctrl+F</span>
            </button>
          </div>
        )}
      </div>

      {/* VIEW MENU */}
      <div className="menu-item">
        <button
          className={`menu-button ${activeMenu === 'view' ? 'active' : ''}`}
          onClick={() => toggleMenu('view')}
        >
          View
        </button>
        {activeMenu === 'view' && (
          <div className="dropdown-menu">
            <button className="dropdown-item" onClick={() => handleAction(onToggleOutline)}>
              <span className="dropdown-item-label">
                <Eye size={14} /> Toggle Document Outline
              </span>
            </button>
            <button className="dropdown-item" onClick={() => handleAction(onToggleRuler)}>
              <span className="dropdown-item-label">
                <Ruler size={14} /> Tampilkan Penggaris (Ruler)
              </span>
              {showRuler && <span>✓</span>}
            </button>
            <div className="dropdown-divider" />
            <div className="dropdown-submenu">
              <div className="dropdown-item">
                <span className="dropdown-item-label">Zoom ({zoom}%)</span>
                <ChevronRight size={12} color="#70757a" />
              </div>
              <div className="dropdown-submenu-content">
                {[50, 75, 100, 125, 150].map((z) => (
                  <button
                    key={z}
                    className="dropdown-item"
                    onClick={() => {
                      onZoomChange(z);
                      setActiveMenu(null);
                    }}
                  >
                    <span>{z}%</span>
                    {zoom === z && <span>✓</span>}
                  </button>
                ))}
              </div>
            </div>
            <div className="dropdown-divider" />
            <button className="dropdown-item" onClick={handleFullScreen}>
              <span className="dropdown-item-label">
                <Maximize2 size={14} /> Full Screen
              </span>
            </button>
          </div>
        )}
      </div>

      {/* INSERT MENU */}
      <div className="menu-item">
        <button
          className={`menu-button ${activeMenu === 'insert' ? 'active' : ''}`}
          onClick={() => toggleMenu('insert')}
        >
          Insert
        </button>
        {activeMenu === 'insert' && (
          <div className="dropdown-menu">
            <button className="dropdown-item" onClick={() => handleAction(onAddComponent)}>
              <span className="dropdown-item-label">
                <PlusSquare size={14} /> Component...
              </span>
            </button>
            <button className="dropdown-item" onClick={() => handleAction(onAddSignatureBlock)}>
              <span className="dropdown-item-label">
                <FileSignature size={14} /> Signature Block (Tanda Tangan)
              </span>
            </button>
            <button className="dropdown-item" onClick={() => handleAction(onAddHorizontalRule)}>
              <span className="dropdown-item-label">
                <Minus size={14} /> Horizontal Line
              </span>
            </button>
          </div>
        )}
      </div>

      {/* FORMAT MENU */}
      <div className="menu-item">
        <button
          className={`menu-button ${activeMenu === 'format' ? 'active' : ''}`}
          onClick={() => toggleMenu('format')}
        >
          Format
        </button>
        {activeMenu === 'format' && (
          <div className="dropdown-menu">
            <div className="dropdown-submenu">
              <div className="dropdown-item">
                <span className="dropdown-item-label">Text Format</span>
                <ChevronRight size={12} color="#70757a" />
              </div>
              <div className="dropdown-submenu-content">
                <button
                  className="dropdown-item"
                  onClick={() => {
                    editor?.chain().focus().toggleBold().run();
                    setActiveMenu(null);
                  }}
                >
                  <span className="dropdown-item-label">
                    <Bold size={14} /> Bold
                  </span>
                  <span className="dropdown-shortcut">Ctrl+B</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    editor?.chain().focus().toggleItalic().run();
                    setActiveMenu(null);
                  }}
                >
                  <span className="dropdown-item-label">
                    <Italic size={14} /> Italic
                  </span>
                  <span className="dropdown-shortcut">Ctrl+I</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    editor?.chain().focus().toggleUnderline().run();
                    setActiveMenu(null);
                  }}
                >
                  <span className="dropdown-item-label">
                    <Underline size={14} /> Underline
                  </span>
                  <span className="dropdown-shortcut">Ctrl+U</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    editor?.chain().focus().toggleStrike().run();
                    setActiveMenu(null);
                  }}
                >
                  <span className="dropdown-item-label">
                    <Strikethrough size={14} /> Strikethrough
                  </span>
                </button>
              </div>
            </div>

            <div className="dropdown-submenu">
              <div className="dropdown-item">
                <span className="dropdown-item-label">Align & Indent</span>
                <ChevronRight size={12} color="#70757a" />
              </div>
              <div className="dropdown-submenu-content">
                <button
                  className="dropdown-item"
                  onClick={() => {
                    editor?.chain().focus().setTextAlign('left').run();
                    setActiveMenu(null);
                  }}
                >
                  <span className="dropdown-item-label">
                    <AlignLeft size={14} /> Align Left
                  </span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    editor?.chain().focus().setTextAlign('center').run();
                    setActiveMenu(null);
                  }}
                >
                  <span className="dropdown-item-label">
                    <AlignCenter size={14} /> Align Center
                  </span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    editor?.chain().focus().setTextAlign('right').run();
                    setActiveMenu(null);
                  }}
                >
                  <span className="dropdown-item-label">
                    <AlignRight size={14} /> Align Right
                  </span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    editor?.chain().focus().setTextAlign('justify').run();
                    setActiveMenu(null);
                  }}
                >
                  <span className="dropdown-item-label">
                    <AlignJustify size={14} /> Justify
                  </span>
                </button>
              </div>
            </div>

            <div className="dropdown-submenu">
              <div className="dropdown-item">
                <span className="dropdown-item-label">Lists</span>
                <ChevronRight size={12} color="#70757a" />
              </div>
              <div className="dropdown-submenu-content">
                <button
                  className="dropdown-item"
                  onClick={() => {
                    editor?.chain().focus().toggleBulletList().run();
                    setActiveMenu(null);
                  }}
                >
                  <span className="dropdown-item-label">
                    <List size={14} /> Bulleted List
                  </span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    editor?.chain().focus().toggleOrderedList().run();
                    setActiveMenu(null);
                  }}
                >
                  <span className="dropdown-item-label">
                    <ListOrdered size={14} /> Numbered List
                  </span>
                </button>
              </div>
            </div>

            <div className="dropdown-divider" />
            <button
              className="dropdown-item"
              onClick={() => {
                editor?.chain().focus().unsetAllMarks().clearNodes().run();
                setActiveMenu(null);
              }}
            >
              <span className="dropdown-item-label">
                <Eraser size={14} /> Clear Formatting
              </span>
            </button>
          </div>
        )}
      </div>

      {/* TOOLS MENU */}
      <div className="menu-item">
        <button
          className={`menu-button ${activeMenu === 'tools' ? 'active' : ''}`}
          onClick={() => toggleMenu('tools')}
        >
          Tools
        </button>
        {activeMenu === 'tools' && (
          <div className="dropdown-menu">
            <button className="dropdown-item" onClick={() => handleAction(onShowWordCount)}>
              <span className="dropdown-item-label">
                <BarChart2 size={14} /> Word & Character Count
              </span>
            </button>
            <button className="dropdown-item" onClick={() => handleAction(onAuditComponents)}>
              <span className="dropdown-item-label">
                <CheckCircle2 size={14} /> Audit SP Standard (14 Komponen)
              </span>
            </button>
          </div>
        )}
      </div>

      {/* HELP MENU */}
      <div className="menu-item">
        <button
          className={`menu-button ${activeMenu === 'help' ? 'active' : ''}`}
          onClick={() => toggleMenu('help')}
        >
          Help
        </button>
        {activeMenu === 'help' && (
          <div className="dropdown-menu">
            <button className="dropdown-item" onClick={() => handleAction(onShowShortcuts)}>
              <span className="dropdown-item-label">
                <HelpCircle size={14} /> Keyboard Shortcuts
              </span>
              <span className="dropdown-shortcut">Ctrl+/</span>
            </button>
            <button
              className="dropdown-item"
              onClick={() => {
                window.open(
                  'https://www.menpan.go.id/site/berita-terkini/standar-pelayanan-publik',
                  '_blank'
                );
                setActiveMenu(null);
              }}
            >
              <span className="dropdown-item-label">
                <BookOpen size={14} /> Panduan SP KemenPANRB
              </span>
            </button>
            <div className="dropdown-divider" />
            <button
              className="dropdown-item"
              onClick={() => {
                alert('SP Generator v1.0.0\nGoogle Docs-style Standar Pelayanan Publik Editor');
                setActiveMenu(null);
              }}
            >
              <span className="dropdown-item-label">
                <Info size={14} /> About SP Generator
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
