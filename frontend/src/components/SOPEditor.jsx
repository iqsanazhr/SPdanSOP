import React, { useMemo, useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, X } from 'lucide-react';

const KapsulIcon = () => <svg width="24" height="14" viewBox="0 0 24 14"><rect x="1" y="1" width="22" height="12" rx="6" ry="6" fill="#F6A04D" stroke="#000" strokeWidth="1.5" /></svg>;
const KotakIcon = () => <svg width="24" height="14" viewBox="0 0 24 14"><rect x="1" y="1" width="22" height="12" fill="#F6A04D" stroke="#000" strokeWidth="1.5" /></svg>;
const BelahKetupatIcon = () => <svg width="24" height="14" viewBox="0 0 24 14"><polygon points="12,1 23,7 12,13 1,7" fill="#F6A04D" stroke="#000" strokeWidth="1.5" /></svg>;

/**
 * AutoFitInput: menampilkan teks dengan font-size yang menyesuaikan otomatis.
 * Menggunakan <div> untuk display agar teks TIDAK pernah terpotong,
 * dan <input> hanya muncul saat pengguna mengklik untuk mengedit.
 * Menggunakan useLayoutEffect agar pengukuran dilakukan setelah DOM ter-render
 * sehingga offsetWidth selalu akurat.
 */
const AutoFitInput = ({ value, onChange, baseFont = 13, minFont = 9 }) => {
  const containerRef = useRef(null);
  const spanRef = useRef(null);    // hidden span untuk mengukur lebar teks
  const inputRef = useRef(null);
  const [fontSize, setFontSize] = useState(baseFont);
  const [editing, setEditing] = useState(false);

  const fit = useCallback(() => {
    const container = containerRef.current;
    const span = spanRef.current;
    if (!container || !span) return;

    // offsetWidth hanya akurat setelah paint — useLayoutEffect memastikan ini
    const maxW = container.getBoundingClientRect().width - 2;
    if (maxW <= 0) return;

    // Mulai dari ukuran normal, kurangi sampai teks muat
    let size = baseFont;
    span.style.fontSize = size + 'px';

    while (span.scrollWidth > maxW && size > minFont) {
      size = Math.max(minFont, size - 0.5);
      span.style.fontSize = size + 'px';
    }

    setFontSize(size);
  }, [value, baseFont, minFont]);

  // useLayoutEffect: runs synchronously after DOM mutation, before browser paint
  // This ensures getBoundingClientRect returns the correct width
  useLayoutEffect(() => { fit(); }, [fit]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(fit);
    ro.observe(container);
    return () => ro.disconnect();
  }, [fit]);

  const handleDisplayClick = () => {
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleBlur = () => setEditing(false);

  return (
    // overflow:visible agar saat font belum dihitung, teks tidak terclip
    <div ref={containerRef} style={{ width: '100%', position: 'relative' }}>
      {/* Hidden span untuk mengukur lebar teks yang sebenarnya */}
      <span
        ref={spanRef}
        style={{
          position: 'absolute', top: 0, left: 0,
          visibility: 'hidden', whiteSpace: 'nowrap',
          fontFamily: 'inherit', fontWeight: 600,
          pointerEvents: 'none', zIndex: -1,
        }}
      >
        {value}
      </span>

      {editing ? (
        /* Input hanya muncul saat mengedit */
        <input
          ref={inputRef}
          value={value}
          onChange={onChange}
          onBlur={handleBlur}
          autoFocus
          style={{
            width: '100%', fontSize, textAlign: 'center',
            border: 'none', background: 'transparent',
            fontFamily: 'inherit', fontWeight: 600,
            outline: 'none', padding: 0,
            boxSizing: 'border-box', display: 'block',
          }}
        />
      ) : (
        /* Div untuk DISPLAY — font-size sudah dipastikan muat, tidak pernah terpotong */
        <div
          onClick={handleDisplayClick}
          title={value}
          style={{
            width: '100%', fontSize, textAlign: 'center',
            fontFamily: 'inherit', fontWeight: 600,
            whiteSpace: 'nowrap', cursor: 'text',
            userSelect: 'none', lineHeight: '1.4',
            overflow: 'visible',
          }}
        >
          {value || '\u00A0'}
        </div>
      )}
    </div>
  );
};

/**
 * AutoResizingTextarea: Textarea yang tingginya otomatis menyesuaikan isi teks,
 * sehingga tinggi cell menjadi dinamis dan teks tidak pernah terpotong.
 */
const AutoResizingTextarea = ({ value, onChange, placeholder, style, rows = 1, className, ...props }) => {
  const textareaRef = useRef(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.max(20, el.scrollHeight)}px`;
    }
  }, []);

  useLayoutEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  useEffect(() => {
    adjustHeight();
  }, [adjustHeight]);

  return (
    <textarea
      ref={textareaRef}
      value={value || ''}
      onChange={(e) => {
        onChange(e);
        adjustHeight();
      }}
      rows={rows}
      placeholder={placeholder}
      className={className}
      style={{
        width: '100%',
        border: 'none',
        outline: 'none',
        resize: 'none',
        fontFamily: 'inherit',
        fontSize: '9pt',
        overflow: 'hidden',
        background: 'transparent',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
        boxSizing: 'border-box',
        display: 'block',
        padding: 0,
        margin: 0,
        ...style
      }}
      {...props}
    />
  );
};

const SOPEditor = ({ document: docData, zoom, onDocChange }) => {
  const content = useMemo(() => {
    try {
      const parsed = JSON.parse(docData.contentData || '{}');
      const actorsList = (parsed.actors && parsed.actors.length > 0) ? parsed.actors : ['Pelaksana 1'];
      return { ...parsed, actors: actorsList };
    } catch (e) {
      return { identity: {}, actors: ['Pelaksana 1'], steps: [] };
    }
  }, [docData.contentData]);

  const { identity = {}, actors = ['Pelaksana 1'], steps = [], connections = [] } = content;

  // Migrate legacy steps if needed
  const normalizedSteps = useMemo(() => {
    return steps.map(step => {
      if (!step.nodes) {
        const newNodes = {};
        if (step.pelaksanaIds) {
          step.pelaksanaIds.forEach(id => {
            newNodes[id] = [step.symbol || 'kotak']; // Array format
          });
        }
        return { ...step, nodes: newNodes };
      } else {
        // Ensure all nodes are arrays
        const newNodes = {};
        Object.keys(step.nodes).forEach(key => {
           const val = step.nodes[key];
           newNodes[key] = Array.isArray(val) ? val : [val];
        });
        return { ...step, nodes: newNodes };
      }
    });
  }, [steps]);

  // Migrate legacy connections without port/subIndex info
  const normalizedConnections = useMemo(() => {
    return connections.map(conn => {
      let from = { ...conn.from };
      let to = { ...conn.to };
      if (!from.port) from.port = 'bottom';
      if (!to.port) to.port = 'top';
      if (from.subIndex === undefined) from.subIndex = 0;
      if (to.subIndex === undefined) to.subIndex = 0;
      return { from, to };
    });
  }, [connections]);

  const updateContent = (newContent) => {
    onDocChange({
      ...docData,
      contentData: JSON.stringify(newContent)
    });
  };

  const updateIdentity = (field, value) => {
    updateContent({
      ...content,
      identity: { ...identity, [field]: value }
    });
  };

  const updateActor = (index, value) => {
    const newActors = [...actors];
    newActors[index] = value;
    updateContent({ ...content, actors: newActors });
  };

  const addActor = () => {
    updateContent({ ...content, actors: [...actors, "Aktor Baru"] });
  };

  const removeConnectionsForNode = (s, a, subIndex) => {
    let newConns = normalizedConnections.filter(c => 
      !(c.from.s === s && c.from.a === a && c.from.subIndex === subIndex) && 
      !(c.to.s === s && c.to.a === a && c.to.subIndex === subIndex)
    );
    // Shift subIndex for connections to the same cell if they were after the deleted one
    newConns = newConns.map(c => {
      let from = { ...c.from };
      let to = { ...c.to };
      if (from.s === s && from.a === a && from.subIndex > subIndex) from.subIndex -= 1;
      if (to.s === s && to.a === a && to.subIndex > subIndex) to.subIndex -= 1;
      return { from, to };
    });
    return newConns;
  };

  const removeActor = (index) => {
    if (actors.length <= 1) return;

    let newConns = normalizedConnections.filter(c => c.from.a !== index && c.to.a !== index).map(c => ({
      from: { ...c.from, a: c.from.a > index ? c.from.a - 1 : c.from.a },
      to: { ...c.to, a: c.to.a > index ? c.to.a - 1 : c.to.a }
    }));

    updateContent({
      ...content,
      actors: actors.filter((_, i) => i !== index),
      steps: normalizedSteps.map(step => {
        const newNodes = {};
        Object.keys(step.nodes || {}).forEach(key => {
          const id = parseInt(key, 10);
          if (id < index) newNodes[id] = step.nodes[id];
          else if (id > index) newNodes[id - 1] = step.nodes[id];
        });
        return { ...step, nodes: newNodes };
      }),
      connections: newConns
    });
  };

  const updateStep = (index, field, value) => {
    const newSteps = [...normalizedSteps];
    if (field.startsWith('mutuBaku.')) {
      const mbField = field.split('.')[1];
      newSteps[index] = {
        ...newSteps[index],
        mutuBaku: { ...newSteps[index].mutuBaku, [mbField]: value }
      };
    } else {
      newSteps[index] = { ...newSteps[index], [field]: value };
    }
    updateContent({ ...content, steps: newSteps });
  };

  const addStep = () => {
    updateContent({
      ...content,
      steps: [...normalizedSteps, {
        id: `step-${Date.now()}`,
        uraian: "Aktivitas baru",
        nodes: {},
        mutuBaku: { persyaratan: "", waktu: "", output: "", keterangan: "" }
      }]
    });
  };

  const insertNoteRow = (afterIndex) => {
    const newSteps = [...normalizedSteps];
    // Shift connections for steps coming after afterIndex
    let newConns = normalizedConnections.map(c => ({
      from: { ...c.from, s: c.from.s > afterIndex ? c.from.s + 1 : c.from.s },
      to: { ...c.to, s: c.to.s > afterIndex ? c.to.s + 1 : c.to.s }
    }));

    newSteps.splice(afterIndex + 1, 0, {
      id: `note-${Date.now()}`,
      isNoteRow: true,
      keteranganText: "",
      nodes: {},
      mutuBaku: { persyaratan: "", waktu: "", output: "", keterangan: "" }
    });

    updateContent({
      ...content,
      steps: newSteps,
      connections: newConns
    });
  };

  const removeStep = (index) => {
    let newConns = normalizedConnections.filter(c => c.from.s !== index && c.to.s !== index).map(c => ({
      from: { ...c.from, s: c.from.s > index ? c.from.s - 1 : c.from.s },
      to: { ...c.to, s: c.to.s > index ? c.to.s - 1 : c.to.s }
    }));

    updateContent({
      ...content,
      steps: normalizedSteps.filter((_, i) => i !== index),
      connections: newConns
    });
  };

  const SYMBOL_TYPES = ['kapsul', 'kotak', 'belah_ketupat'];

  const changeSymbol = (stepIndex, actorIndex, subIndex, type) => {
    const step = normalizedSteps[stepIndex];
    const currentNodes = { ...(step.nodes || {}) };
    const arr = [...(currentNodes[actorIndex] || [])];
    arr[subIndex] = type;
    currentNodes[actorIndex] = arr;
    updateStep(stepIndex, 'nodes', currentNodes);
  };

  const deleteSymbol = (stepIndex, actorIndex, subIndex) => {
    const step = normalizedSteps[stepIndex];
    const currentNodes = { ...(step.nodes || {}) };
    const arr = [...(currentNodes[actorIndex] || [])];
    arr.splice(subIndex, 1);
    
    if (arr.length === 0) {
      delete currentNodes[actorIndex];
    } else {
      currentNodes[actorIndex] = arr;
    }
    
    const newConns = removeConnectionsForNode(stepIndex, actorIndex, subIndex);
    updateContent({ ...content, steps: Object.assign([...normalizedSteps], { [stepIndex]: { ...step, nodes: currentNodes } }), connections: newConns });
    setSelectedCell(null);
  };
  
  const addSymbolToCell = (stepIndex, actorIndex) => {
    const step = normalizedSteps[stepIndex];
    const currentNodes = { ...(step.nodes || {}) };
    const arr = [...(currentNodes[actorIndex] || [])];
    if (arr.length < 2) {
      arr.push(SYMBOL_TYPES[0]);
      currentNodes[actorIndex] = arr;
      updateStep(stepIndex, 'nodes', currentNodes);
      setSelectedCell({ s: stepIndex, a: actorIndex, subIndex: arr.length - 1 });
    }
  };

  const [selectedCell, setSelectedCell] = useState(null);
  const [addingSymbolToCell, setAddingSymbolToCell] = useState(null);

  useEffect(() => {
    const handleClickOutside = () => {
      setSelectedCell(null);
      setAddingSymbolToCell(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleCellClick = (e, s, a) => {
    e.stopPropagation(); // prevent document click from clearing selection immediately
    const step = normalizedSteps[s];
    const currentNodes = { ...(step.nodes || {}) };
    if (!currentNodes[a] || currentNodes[a].length === 0) {
      setAddingSymbolToCell({ s, a });
      setSelectedCell(null);
    } else if (!selectedCell || selectedCell.s !== s || selectedCell.a !== a) {
      setSelectedCell({ s, a, subIndex: 0 });
      setAddingSymbolToCell(null);
    }
  };
  
  const handleAddSymbol = (s, a, type) => {
    const step = normalizedSteps[s];
    const currentNodes = { ...(step.nodes || {}) };
    currentNodes[a] = [type];
    updateStep(s, 'nodes', currentNodes);
    setAddingSymbolToCell(null);
    setSelectedCell({ s, a, subIndex: 0 });
  };
  
  const handleSymbolClick = (e, s, a, subIndex) => {
    e.stopPropagation();
    setSelectedCell({ s, a, subIndex });
  };

  // Drag and Drop Lines State & Auto-Scroll
  const [dragState, setDragState] = useState(null);
  const autoScrollRef = useRef(null);
  const autoScrollDeltaRef = useRef(0);
  const dragMousePosRef = useRef({ clientX: 0, clientY: 0 });

  const stopAutoScroll = useCallback(() => {
    autoScrollDeltaRef.current = 0;
    if (autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  }, []);

  const updateDragTargetFromPoint = useCallback((clientX, clientY) => {
    let targetPort = null;
    let targetSubIndex = null;
    let targetX = clientX;
    let targetY = clientY;

    const elements = document.elementsFromPoint(clientX, clientY);
    const targetCircle = elements.find(el => el && el.hasAttribute && el.hasAttribute('data-port'));
    
    if (targetCircle) {
      targetPort = targetCircle.getAttribute('data-port');
      targetSubIndex = parseInt(targetCircle.getAttribute('data-cell-sub'), 10);
      const rect = targetCircle.getBoundingClientRect();
      targetX = rect.left + rect.width / 2;
      targetY = rect.top + rect.height / 2;
    }
    
    setDragState(prev => {
      if (!prev) return null;
      return { ...prev, currentX: targetX, currentY: targetY, targetPort, targetSubIndex };
    });
  }, []);

  const checkAutoScroll = useCallback((clientY) => {
    const viewportEl = document.querySelector('.document-viewport');
    const vRect = viewportEl ? viewportEl.getBoundingClientRect() : { top: 0, bottom: window.innerHeight, height: window.innerHeight };
    
    const EDGE_THRESHOLD = 150; // 150px threshold from top/bottom edge of viewport/container
    const MAX_SPEED = 30;

    let scrollDelta = 0;
    if (clientY > vRect.bottom - EDGE_THRESHOLD) {
      const ratio = (clientY - (vRect.bottom - EDGE_THRESHOLD)) / EDGE_THRESHOLD;
      scrollDelta = Math.min(MAX_SPEED, Math.max(6, ratio * MAX_SPEED));
    } else if (clientY < vRect.top + EDGE_THRESHOLD) {
      const ratio = (vRect.top + EDGE_THRESHOLD - clientY) / EDGE_THRESHOLD;
      scrollDelta = -Math.min(MAX_SPEED, Math.max(6, ratio * MAX_SPEED));
    }

    autoScrollDeltaRef.current = scrollDelta;

    if (scrollDelta !== 0) {
      if (!autoScrollRef.current) {
        const scrollLoop = () => {
          const delta = autoScrollDeltaRef.current;
          if (delta !== 0) {
            const vEl = document.querySelector('.document-viewport');
            if (vEl && vEl.scrollHeight > vEl.clientHeight) {
              vEl.scrollTop += delta;
            }
            window.scrollBy(0, delta);
            document.documentElement.scrollTop += delta;
            document.body.scrollTop += delta;

            const { clientX, clientY } = dragMousePosRef.current;
            updateDragTargetFromPoint(clientX, clientY);
            setLayoutVersion(v => v + 1);
            autoScrollRef.current = requestAnimationFrame(scrollLoop);
          } else {
            stopAutoScroll();
          }
        };
        autoScrollRef.current = requestAnimationFrame(scrollLoop);
      }
    } else {
      autoScrollDeltaRef.current = 0;
      stopAutoScroll();
    }
  }, [stopAutoScroll, updateDragTargetFromPoint]);

  const handlePortPointerDown = (e, s, a, subIndex, port) => {
    e.stopPropagation();
    setSelectedCell(null); // hide toolbar when drawing
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
    dragMousePosRef.current = { clientX: e.clientX, clientY: e.clientY };
    setDragState({
      startS: s, startA: a, startSubIndex: subIndex, startPort: port,
      startX: e.clientX, startY: e.clientY,
      currentX: e.clientX, currentY: e.clientY,
      targetElement: e.currentTarget
    });
  };

  // Window-level pointer listener to guarantee smooth auto-scroll & drop anywhere on viewport
  useEffect(() => {
    if (!dragState) return;

    const handleWindowPointerMove = (e) => {
      dragMousePosRef.current = { clientX: e.clientX, clientY: e.clientY };
      updateDragTargetFromPoint(e.clientX, e.clientY);
      checkAutoScroll(e.clientY);
    };

    const handleWindowPointerUp = (e) => {
      stopAutoScroll();
      if (dragState?.targetElement) {
        try {
          dragState.targetElement.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }

      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const targetCircle = elements.find(el => el && el.hasAttribute && el.hasAttribute('data-port'));

      if (targetCircle) {
        const targetS = parseInt(targetCircle.getAttribute('data-cell-s'), 10);
        const targetA = parseInt(targetCircle.getAttribute('data-cell-a'), 10);
        const targetSubIndex = parseInt(targetCircle.getAttribute('data-cell-sub'), 10);
        const targetPort = targetCircle.getAttribute('data-port');

        if (targetS !== dragState.startS || targetA !== dragState.startA || targetSubIndex !== dragState.startSubIndex) {
          const exists = normalizedConnections.some(c => 
            c.from.s === dragState.startS && c.from.a === dragState.startA && c.from.subIndex === dragState.startSubIndex && c.from.port === dragState.startPort &&
            c.to.s === targetS && c.to.a === targetA && c.to.subIndex === targetSubIndex && c.to.port === targetPort
          );
          if (!exists) {
            const newConns = [...normalizedConnections, { 
              from: { s: dragState.startS, a: dragState.startA, subIndex: dragState.startSubIndex, port: dragState.startPort }, 
              to: { s: targetS, a: targetA, subIndex: targetSubIndex, port: targetPort } 
            }];
            updateContent({ ...content, connections: newConns });
          }
        }
      }
      setDragState(null);
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, [dragState, checkAutoScroll, updateDragTargetFromPoint, stopAutoScroll, normalizedConnections, content, updateContent]);

  const handlePortPointerMove = (e) => {
    if (dragState) {
      dragMousePosRef.current = { clientX: e.clientX, clientY: e.clientY };
      updateDragTargetFromPoint(e.clientX, e.clientY);
      checkAutoScroll(e.clientY);
    }
  };

  const handlePortPointerUp = (e) => {
    e.stopPropagation();
    stopAutoScroll();
    if (dragState?.targetElement) {
       try { dragState.targetElement.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    
    if (dragState) {
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const targetCircle = elements.find(el => el && el.hasAttribute && el.hasAttribute('data-port'));
      
      if (targetCircle) {
         const targetS = parseInt(targetCircle.getAttribute('data-cell-s'), 10);
         const targetA = parseInt(targetCircle.getAttribute('data-cell-a'), 10);
         const targetSubIndex = parseInt(targetCircle.getAttribute('data-cell-sub'), 10);
         const targetPort = targetCircle.getAttribute('data-port');
         
         if (targetS !== dragState.startS || targetA !== dragState.startA || targetSubIndex !== dragState.startSubIndex) {
           const exists = normalizedConnections.some(c => 
              c.from.s === dragState.startS && c.from.a === dragState.startA && c.from.subIndex === dragState.startSubIndex && c.from.port === dragState.startPort &&
              c.to.s === targetS && c.to.a === targetA && c.to.subIndex === targetSubIndex && c.to.port === targetPort
           );
           if (!exists) {
              const newConns = [...normalizedConnections, { 
                  from: { s: dragState.startS, a: dragState.startA, subIndex: dragState.startSubIndex, port: dragState.startPort }, 
                  to: { s: targetS, a: targetA, subIndex: targetSubIndex, port: targetPort } 
              }];
              updateContent({ ...content, connections: newConns });
           }
         }
      }
      setDragState(null);
    }
  };

  const renderSymbol = (symbolType, s, a, subIndex) => {
    let svgContent = null;
    if (symbolType === 'kapsul') {
      svgContent = <rect x="2" y="2" width="36" height="16" rx="8" ry="8" fill="#F6A04D" stroke="#000" strokeWidth="1.5" />;
    } else if (symbolType === 'kotak') {
      svgContent = <rect x="2" y="2" width="36" height="16" fill="#F6A04D" stroke="#000" strokeWidth="1.5" />;
    } else if (symbolType === 'belah_ketupat') {
      svgContent = <polygon points="20,2 38,10 20,18 2,10" fill="#F6A04D" stroke="#000" strokeWidth="1.5" />;
    }

    if (!svgContent) return null;

    const portProps = (port) => ({
      'data-port': port,
      'data-cell-s': s,
      'data-cell-a': a,
      'data-cell-sub': subIndex,
      onPointerDown: (e) => handlePortPointerDown(e, s, a, subIndex, port),
      onPointerMove: handlePortPointerMove,
      onPointerUp: handlePortPointerUp,
      onPointerCancel: (e) => {
         stopAutoScroll();
         if(dragState?.targetElement) dragState.targetElement.releasePointerCapture(e.pointerId);
         setDragState(null);
      }
    });

    return (
      <svg 
        id={`symbol-${s}-${a}-${subIndex}`}
        className="sop-symbol"
        width="40" height="20" viewBox="0 0 40 20" 
        style={{ display: 'block', touchAction: 'none', overflow: 'visible' }}
        onClick={(e) => handleSymbolClick(e, s, a, subIndex)}
      >
        {svgContent}
        <g className="symbol-ports" style={{ opacity: dragState || (selectedCell?.s === s && selectedCell?.a === a && selectedCell?.subIndex === subIndex) ? 1 : undefined, transition: 'opacity 0.2s', cursor: 'crosshair' }}>
           <circle cx="20" cy="2" r="5" fill="#1a73e8" stroke="#fff" strokeWidth="1" {...portProps('top')} />
           <circle cx="20" cy="18" r="5" fill="#1a73e8" stroke="#fff" strokeWidth="1" {...portProps('bottom')} />
           <circle cx="2" cy="10" r="5" fill="#1a73e8" stroke="#fff" strokeWidth="1" {...portProps('left')} />
           <circle cx="38" cy="10" r="5" fill="#1a73e8" stroke="#fff" strokeWidth="1" {...portProps('right')} />
        </g>
      </svg>
    );
  };

  const [lineCoords, setLineCoords] = useState([]);
  const containerRef = useRef(null);

  // layoutVersion bumps whenever container/window resizes, triggering line recalculation
  const [layoutVersion, setLayoutVersion] = useState(0);
  const renderLinePath = useCallback((x1, y1, p1, x2, y2, p2) => {
    const r = (n) => Math.round(n * 10) / 10;
    x1 = r(x1); y1 = r(y1);
    x2 = r(x2); y2 = r(y2);

    // Garis lurus horizontal yang sudah tersambung
    if (p2 && Math.abs(y1 - y2) < 4 && ((p1 === 'right' && p2 === 'left') || (p1 === 'left' && p2 === 'right'))) {
      return `M ${x1} ${y1} L ${x2} ${y1}`;
    }

    // Garis lurus vertikal yang sudah tersambung (ditarik penuh dari node ke node)
    if (p2 && Math.abs(x1 - x2) < 4 && ((p1 === 'bottom' && p2 === 'top') || (p1 === 'top' && p2 === 'bottom'))) {
      return `M ${x1} ${y1} L ${x1} ${y2}`;
    }

    const OFFSET = 18;
    
    // Rute saat masih ditarik (Drag Line)
    if (!p2) {
        const out1 = { x: x1, y: y1 };
        if (p1 === 'top') out1.y -= OFFSET;
        if (p1 === 'bottom') out1.y += OFFSET;
        if (p1 === 'left') out1.x -= OFFSET;
        if (p1 === 'right') out1.x += OFFSET;

        if (p1 === 'top' || p1 === 'bottom') {
            const isForward = (p1 === 'bottom' && y2 >= out1.y) || (p1 === 'top' && y2 <= out1.y);
            if (isForward) {
                const midY = r(out1.y + (y2 - out1.y) / 2);
                return `M ${x1} ${y1} L ${out1.x} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
            } else {
                return `M ${x1} ${y1} L ${out1.x} ${out1.y} L ${x2} ${out1.y} L ${x2} ${y2}`;
            }
        } else {
            const isForward = (p1 === 'right' && x2 >= out1.x) || (p1 === 'left' && x2 <= out1.x);
            if (isForward) {
                const midX = r(out1.x + (x2 - out1.x) / 2);
                return `M ${x1} ${y1} L ${midX} ${out1.y} L ${midX} ${y2} L ${x2} ${y2}`;
            } else {
                return `M ${x1} ${y1} L ${out1.x} ${out1.y} L ${out1.x} ${y2} L ${x2} ${y2}`;
            }
        }
    }
    
    // Rute garis akhir (sudah tersambung)
    const out1 = { x: x1, y: y1 };
    if (p1 === 'top') out1.y -= OFFSET;
    if (p1 === 'bottom') out1.y += OFFSET;
    if (p1 === 'left') out1.x -= OFFSET;
    if (p1 === 'right') out1.x += OFFSET;

    const out2 = { x: x2, y: y2 };
    if (p2 === 'top') out2.y -= OFFSET;
    if (p2 === 'bottom') out2.y += OFFSET;
    if (p2 === 'left') out2.x -= OFFSET;
    if (p2 === 'right') out2.x += OFFSET;

    const isVert1 = p1 === 'top' || p1 === 'bottom';
    const isVert2 = p2 === 'top' || p2 === 'bottom';

    let path = `M ${x1} ${y1} L ${out1.x} ${out1.y}`;

    if (isVert1 && isVert2) {
        if (p1 === 'bottom' && p2 === 'bottom') {
            const midY = Math.max(out1.y, out2.y) + OFFSET;
            path += ` L ${out1.x} ${midY} L ${out2.x} ${midY}`;
        } else if (p1 === 'top' && p2 === 'top') {
            const midY = Math.min(out1.y, out2.y) - OFFSET;
            path += ` L ${out1.x} ${midY} L ${out2.x} ${midY}`;
        } else {
            // Koneksi berlawanan arah vertikal
            if ((p1 === 'bottom' && out1.y > out2.y) || (p1 === 'top' && out1.y < out2.y)) {
                const midX = r(out1.x + (out2.x - out1.x) / 2);
                path += ` L ${out1.x} ${out1.y} L ${midX} ${out1.y} L ${midX} ${out2.y} L ${out2.x} ${out2.y}`;
            } else {
                const midY = r(out1.y + (out2.y - out1.y) / 2);
                path += ` L ${out1.x} ${midY} L ${out2.x} ${midY}`;
            }
        }
    } else if (!isVert1 && !isVert2) {
        if (p1 === 'right' && p2 === 'right') {
            const midX = Math.max(out1.x, out2.x) + OFFSET;
            path += ` L ${midX} ${out1.y} L ${midX} ${out2.y}`;
        } else if (p1 === 'left' && p2 === 'left') {
            const midX = Math.min(out1.x, out2.x) - OFFSET;
            path += ` L ${midX} ${out1.y} L ${midX} ${out2.y}`;
        } else {
            if ((p1 === 'right' && out1.x > out2.x) || (p1 === 'left' && out1.x < out2.x)) {
                const midY = r(out1.y + (out2.y - out1.y) / 2);
                path += ` L ${out1.x} ${midY} L ${out2.x} ${midY}`;
            } else {
                const midX = r(out1.x + (out2.x - out1.x) / 2);
                path += ` L ${midX} ${out1.y} L ${midX} ${out2.y}`;
            }
        }
    } else {
        if (isVert1) {
            if ((p1 === 'bottom' && out2.y > out1.y) || (p1 === 'top' && out2.y < out1.y)) {
                path += ` L ${out1.x} ${out2.y}`;
            } else {
                path += ` L ${out2.x} ${out1.y}`;
            }
        } else {
            if ((p1 === 'right' && out2.x > out1.x) || (p1 === 'left' && out1.x < out2.x)) {
                path += ` L ${out2.x} ${out1.y}`;
            } else {
                path += ` L ${out1.x} ${out2.y}`;
            }
        }
    }

    path += ` L ${out2.x} ${out2.y} L ${x2} ${y2}`;
    return path;
  }, []);

  const renderCrossPagePath = useCallback((x1, y1, p1, x2, y2, p2, crossType) => {
    const r = (n) => Math.round(n * 10) / 10;
    x1 = r(x1); y1 = r(y1);
    x2 = r(x2); y2 = r(y2);

    if (crossType === 'exit') {
      if (Math.abs(x1 - x2) < 4) {
        return `M ${x1} ${y1} L ${x1} ${y2}`;
      }
      if (p1 === 'left' || p1 === 'right') {
        return `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2}`;
      } else {
        const turnY = r(Math.min(y2 - 12, y1 + 15));
        return `M ${x1} ${y1} L ${x1} ${turnY} L ${x2} ${turnY} L ${x2} ${y2}`;
      }
    }
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }, []);

  /**
   * getPortCoords: Konversi posisi port simbol ke koordinat layout-space kertas A4.
   * Menggunakan selisih getBoundingClientRect() elemen dan sheet container,
   * di-scale dengan zoom factor agar menghasilkan koordinat pixel internal kertas yang tepat.
   */
  const getPortCoords = useCallback((s, a, subIndex, port) => {
    const el = document.getElementById(`symbol-${s}-${a}-${subIndex}`);
    if (!el) return null;
    const sheetEl = el.closest('.a4-paper-sheet-landscape');
    if (!sheetEl) return null;

    const sheetRect = sheetEl.getBoundingClientRect();
    const shapeEl = el.querySelector('polygon, rect') || el;
    const shapeRect = shapeEl.getBoundingClientRect();

    const scaleX = sheetRect.width > 0 ? sheetRect.width / 1122.52 : 1;
    const scaleY = sheetRect.height > 0 ? sheetRect.height / 793.70 : 1;

    const elLeft = (shapeRect.left - sheetRect.left) / scaleX;
    const elTop = (shapeRect.top - sheetRect.top) / scaleY;
    const elWidth = shapeRect.width / scaleX;
    const elHeight = shapeRect.height / scaleY;

    const cx = elLeft + elWidth / 2;
    const cy = elTop + elHeight / 2;

    switch (port) {
      case 'top':    return { x: cx, y: elTop };
      case 'bottom': return { x: cx, y: elTop + elHeight };
      case 'left':   return { x: elLeft, y: cy };
      case 'right':  return { x: elLeft + elWidth, y: cy };
      default:       return { x: cx, y: cy };
    }
  }, []);

  /**
   * computeLineCoords: Hitung koordinat semua garis connector berdasarkan posisi DOM aktual.
   * Mendukung koneksi satu halaman (intra-page) maupun lintas halaman (cross-page).
   */
  const computeLineCoords = useCallback(() => {
    const newCoords = [];

    // Build stepToPage index map
    const stepToPage = {};
    flowchartPages.forEach((pageItems, pageIdx) => {
      pageItems.forEach((item) => {
        stepToPage[item.originalIndex] = pageIdx;
      });
    });

    normalizedConnections.forEach((conn, idx) => {
      const fromSub = conn.from.subIndex !== undefined ? conn.from.subIndex : 0;
      const toSub   = conn.to.subIndex !== undefined ? conn.to.subIndex : 0;
      const fromEl = document.getElementById(`symbol-${conn.from.s}-${conn.from.a}-${fromSub}`);
      const toEl   = document.getElementById(`symbol-${conn.to.s}-${conn.to.a}-${toSub}`);

      if (!fromEl || !toEl) return;

      const fromSheet = fromEl.closest('.a4-paper-sheet-landscape');
      const toSheet   = toEl.closest('.a4-paper-sheet-landscape');

      if (!fromSheet || !toSheet) return;

      const fromCoords = getPortCoords(conn.from.s, conn.from.a, fromSub, conn.from.port);
      const toCoords   = getPortCoords(conn.to.s, conn.to.a, toSub, conn.to.port);

      if (!fromCoords || !toCoords) return;

      const fromPageIdx = stepToPage[conn.from.s];
      const toPageIdx = stepToPage[conn.to.s];

      if (fromPageIdx !== undefined && fromPageIdx === toPageIdx) {
        const item = {
          x1: fromCoords.x, y1: fromCoords.y, p1: conn.from.port,
          x2: toCoords.x,   y2: toCoords.y,   p2: conn.to.port,
          fromS: conn.from.s, toS: conn.to.s,
          isCrossPage: false,
          id: idx
        };
        newCoords.push(item);
      } else {
        const fromTable = fromSheet.querySelector('table');
        const toTable   = toSheet.querySelector('table');
        const toTbody   = toTable ? toTable.querySelector('tbody') : null;

        const fromSheetRect = fromSheet.getBoundingClientRect();
        const toSheetRect   = toSheet.getBoundingClientRect();
        const fromScaleY    = fromSheetRect.height > 0 ? fromSheetRect.height / 793.70 : 1;
        const toScaleY      = toSheetRect.height > 0 ? toSheetRect.height / 793.70 : 1;

        let fromTableBottom = 793.70 - 40;
        if (fromTable && fromSheetRect.height > 0) {
          const fromTableRect = fromTable.getBoundingClientRect();
          fromTableBottom = (fromTableRect.bottom - fromSheetRect.top) / fromScaleY;
        }

        let toTbodyTop = 125;
        if (toTbody && toSheetRect.height > 0) {
          const toTbodyRect = toTbody.getBoundingClientRect();
          toTbodyTop = (toTbodyRect.top - toSheetRect.top) / toScaleY;
        } else if (toTable && toSheetRect.height > 0) {
          const toTableRect = toTable.getBoundingClientRect();
          toTbodyTop = (toTableRect.top - toSheetRect.top) / toScaleY;
        }

        // Segmen Keluar (Exit) pada Lembar Asal (berbelok di dalam tabel ke kolom target toCoords.x lalu mentok ke bawah)
        newCoords.push({
          x1: fromCoords.x, y1: fromCoords.y, p1: conn.from.port,
          x2: toCoords.x,   y2: fromTableBottom, p2: 'bottom',
          fromS: conn.from.s, toS: conn.to.s,
          isCrossPage: true,
          crossType: 'exit',
          id: `${idx}-exit`
        });

        // Segmen Masuk (Entry) pada Lembar Tujuan (mulai dari border atas baris data pertama / tbody)
        newCoords.push({
          x1: toCoords.x, y1: toTbodyTop, p1: 'top',
          x2: toCoords.x, y2: toCoords.y, p2: conn.to.port,
          fromS: conn.from.s, toS: conn.to.s,
          isCrossPage: true,
          crossType: 'entry',
          id: `${idx}-entry`
        });
      }
    });

    // Synchronously update DOM SVG path elements
    newCoords.forEach(c => {
      const d = c.isCrossPage 
        ? renderCrossPagePath(c.x1, c.y1, c.p1, c.x2, c.y2, c.p2, c.crossType) 
        : renderLinePath(c.x1, c.y1, c.p1, c.x2, c.y2, c.p2);
      const els = document.querySelectorAll(`[data-line-id="${c.id}"]`);
      els.forEach(el => el.setAttribute('d', d));
    });

    setLineCoords(newCoords);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedConnections, normalizedSteps, getPortCoords, renderLinePath, renderCrossPagePath]);

  useEffect(() => {
    computeLineCoords();
  }, [computeLineCoords, layoutVersion]);

  useEffect(() => {
    let timer = null;
    const triggerUpdate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setLayoutVersion(v => v + 1);
      }, 50);
    };

    const onWindowResize = triggerUpdate;
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('beforeprint', computeLineCoords);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        computeLineCoords();
      });
    }

    // Observe all tables inside print area to recalculate line coordinates whenever row heights change
    const tableElements = document.querySelectorAll('.sop-print-area table');
    let ro = null;
    if (tableElements.length > 0) {
      ro = new ResizeObserver(() => {
        triggerUpdate();
      });
      tableElements.forEach(el => ro.observe(el));
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', onWindowResize);
      window.removeEventListener('beforeprint', computeLineCoords);
    };
  }, [computeLineCoords]);

  const dragLine = useMemo(() => {
    if (!dragState) return null;

    const el = document.getElementById(`symbol-${dragState.startS}-${dragState.startA}-${dragState.startSubIndex}`);
    if (!el) return null;
    const sheetEl = el.closest('.a4-paper-sheet-landscape');
    if (!sheetEl) return null;

    const fromCoords = getPortCoords(dragState.startS, dragState.startA, dragState.startSubIndex, dragState.startPort);
    if (!fromCoords) return null;

    const sheetRect = sheetEl.getBoundingClientRect();
    const scale = zoom / 100;
    const x2 = (dragState.currentX - sheetRect.left) / scale;
    const y2 = (dragState.currentY - sheetRect.top) / scale;
    const p2 = dragState.targetPort || null;

    return { x1: fromCoords.x, y1: fromCoords.y, p1: dragState.startPort, x2, y2, p2 };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragState, zoom, layoutVersion]);

  const removeConnection = (index) => {
    const newConns = [...normalizedConnections];
    newConns.splice(index, 1);
    updateContent({ ...content, connections: newConns });
  };

  // Paginate Flowchart Steps into Fixed Height A4 Landscape Sheets (297mm x 210mm)
  // Total printable height capacity is 580px.
  // Signature block height is ~140px. If last page accumulated height + SIGNATURE_HEIGHT exceeds 580px,
  // push an additional sheet dedicated for the signature block so it never touches the footer.
  const FLOWCHART_PAGE_CAPACITY = 580;
  const FLOWCHART_HEADER_HEIGHT = 65;
  const SIGNATURE_HEIGHT = 140;

  const splitTextByLength = (text, maxLength) => {
    if (!text || text.length <= maxLength) return [text, ''];
    let cutIdx = maxLength;
    for (let i = maxLength; i > Math.max(10, maxLength - 20); i--) {
      if (/[\s\n.,;]/.test(text[i])) {
        cutIdx = i;
        break;
      }
    }
    return [text.substring(0, cutIdx), text.substring(cutIdx).trimStart()];
  };

  const flowchartPages = useMemo(() => {
    if (normalizedSteps.length === 0) return [[]];

    const pages = [];
    let currentPage = [];
    let currentH = FLOWCHART_HEADER_HEIGHT;

    for (let idx = 0; idx < normalizedSteps.length; idx++) {
      const step = normalizedSteps[idx];
      
      const uraianLines = Math.max(1, Math.ceil((step.uraian || '').length / 30));
      const reqLines = Math.max(1, Math.ceil((step.mutuBaku?.persyaratan || '').length / 14));
      const outLines = Math.max(1, Math.ceil((step.mutuBaku?.output || '').length / 12));
      const maxTextLines = Math.max(uraianLines, reqLines, outLines);

      let maxShapeH = 20;
      if (step.nodes) {
        Object.values(step.nodes).forEach(arr => {
          if (Array.isArray(arr) && arr.length > 1) {
            maxShapeH = Math.max(maxShapeH, arr.length * 20 + (arr.length - 1) * 10);
          }
        });
      }

      const textH = maxTextLines * 16 + 12;
      const rowH = Math.max(45, textH, maxShapeH + 12);

      if (currentH + rowH <= FLOWCHART_PAGE_CAPACITY) {
        currentPage.push({ step, originalIndex: idx, isContinuation: false });
        currentH += rowH;
      } else {
        if (currentPage.length > 0) {
          pages.push(currentPage);
        }
        currentPage = [{ step, originalIndex: idx, isContinuation: false }];
        currentH = FLOWCHART_HEADER_HEIGHT + rowH;
      }
    }

    if (currentPage.length > 0) {
      if (currentH + SIGNATURE_HEIGHT > FLOWCHART_PAGE_CAPACITY) {
        pages.push(currentPage);
        pages.push([]); // Empty page for signature block
      } else {
        pages.push(currentPage);
      }
    }

    return pages;
  }, [normalizedSteps]);

  return (
    <div className="document-viewport" style={{ padding: '24px 0 120px 0', background: '#f8f9fa', minHeight: '100vh', overflowY: 'auto' }}>
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print, .floating-toolbar, .symbol-ports, .sop-page-break, .document-outline, .top-bar, .menu-bar, .toolbar, .modal-backdrop {
            display: none !important;
          }
          .document-viewport {
            padding: 0 !important;
            margin: 0 !important;
            background: #fff !important;
            overflow: visible !important;
            min-height: auto !important;
          }
          div.sop-editor-wrapper {
            display: block !important;
            transform: none !important;
            -webkit-transform: none !important;
            transform-origin: unset !important;
            gap: 0 !important;
            padding: 0 !important;
            padding-bottom: 0 !important;
            margin: 0 !important;
            margin-bottom: 0 !important;
            width: 100% !important;
            overflow: visible !important;
          }
          div.sop-print-area.a4-paper-sheet-landscape {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-sizing: border-box !important;
            display: block !important;
            overflow: hidden !important;
          }
          div.sop-print-area.a4-paper-sheet-landscape + div.sop-print-area.a4-paper-sheet-landscape {
            page-break-before: always !important;
            break-before: page !important;
          }
          div.sop-print-area.a4-paper-sheet-landscape:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          input, textarea {
            border: none !important;
            outline: none !important;
            background: transparent !important;
            box-shadow: none !important;
          }
        }
        .sop-symbol .symbol-ports { opacity: 0; }
        .sop-symbol:hover .symbol-ports { opacity: 1; }
        .symbol-toolbar-btn {
           background: transparent;
           border: none;
           padding: 6px;
           border-radius: 4px;
           cursor: pointer;
           display: flex;
           align-items: center;
           justify-content: center;
           transition: all 0.2s;
           color: #666;
        }
        .symbol-toolbar-btn:hover {
           background: #f1f3f4;
           color: #202124;
           transform: translateY(-1px);
        }
        .symbol-toolbar-btn:active {
           transform: translateY(0);
        }
        .modern-btn {
           padding: 6px 12px;
           font-size: 12px;
           cursor: pointer;
           background: #fff;
           border: 1px solid #dadce0;
           border-radius: 6px;
           display: inline-flex;
           align-items: center;
           gap: 6px;
           color: #3c4043;
           font-weight: 500;
           transition: all 0.2s;
           box-shadow: 0 1px 2px 0 rgba(60,64,67,0.05);
        }
        .modern-btn:hover {
           background: #f8f9fa;
           box-shadow: 0 1px 3px 1px rgba(60,64,67,0.08);
        }
        .modern-btn-primary {
           background: #1a73e8;
           color: #fff;
           border: none;
           box-shadow: 0 1px 3px 0 rgba(26,115,232,0.3);
           padding: 8px 16px;
           font-size: 13px;
        }
        .modern-btn-primary:hover {
           background: #1557b0;
           box-shadow: 0 1px 5px 0 rgba(26,115,232,0.4);
        }
        .toolbar-divider {
           width: 1px;
           background: #e0e0e0;
           margin: 0 4px;
           height: 20px;
        }
        .floating-toolbar {
           display: flex;
           gap: 2px;
           align-items: center;
           background: #fff;
           border: 1px solid #e0e0e0;
           padding: 4px;
           border-radius: 8px;
           z-index: 20;
           box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
      `}</style>
      
      {/* MULTI-PAGE A4 LANDSCAPE PAPER SHEETS PERSIS SEPERTI DOKUMEN SP */}
      <div
        ref={containerRef}
        className="sop-editor-wrapper"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '32px',
          paddingBottom: '120px',
          marginBottom: '80px',
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top center',
        }}
      >
        {/* === HALAMAN 1: IDENTITAS & KELENGKAPAN SOP (A4 LANDSCAPE SHEET) === */}
        <div
          className="sop-print-area a4-paper-sheet-landscape"
          style={{
            width: '297mm',
            height: '210mm',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 4px 0 rgba(60,64,67,0.15), 0 4px 14px 3px rgba(60,64,67,0.12)',
            border: '1px solid #dadce0',
            padding: '12mm 15mm 15mm 15mm',
            boxSizing: 'border-box',
            position: 'relative',
            color: '#000000',
            fontFamily: 'Arial, sans-serif',
            fontSize: '10pt',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          <table id="sop-sec-identitas" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', margin: '0 auto' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #000', width: '30%', textAlign: 'center', padding: 10 }}>
                  <div style={{ width: 80, height: 80, margin: '0 auto', position: 'relative' }}>
                    <img 
                      src={identity.logoImage || '/logobanjarnegara.webp'} 
                      alt="Logo Banjarnegara" 
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                    />
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                      title="Klik untuk mengubah logo"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => updateIdentity('logoImage', event.target.result);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                  {/* Nama instansi: bisa diedit */}
                  <textarea
                    value={identity.namaInstansi || 'PEMERINTAH KABUPATEN BANJARNEGARA'}
                    onChange={e => updateIdentity('namaInstansi', e.target.value)}
                    rows={2}
                    style={{
                      margin: '8px 0 0 0', fontSize: '11pt', fontWeight: 'bold',
                      textAlign: 'center', border: 'none', outline: 'none',
                      resize: 'none', fontFamily: 'inherit', width: '100%',
                      background: 'transparent', lineHeight: 1.3,
                    }}
                  />
                  <textarea
                    value={identity.namaOrganisasi || ''}
                    onChange={e => updateIdentity('namaOrganisasi', e.target.value)}
                    placeholder="Nama Organisasi/SKPD"
                    rows={1}
                    style={{
                      fontSize: '10pt', textAlign: 'center', border: 'none', outline: 'none',
                      resize: 'none', fontFamily: 'inherit', width: '100%',
                      background: 'transparent',
                    }}
                  />
                </td>
                <td style={{ border: '1px solid #000', width: '45%', padding: '8px 12px', verticalAlign: 'top' }}>
                  <table style={{ width: '100%', fontSize: '9.5pt', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td width="38%" style={{ padding: '3px 0', verticalAlign: 'top' }}>Nomor SOP</td>
                        <td style={{ padding: '3px 0', verticalAlign: 'top' }}>:</td>
                        <td style={{ padding: '3px 0' }}>
                          <textarea 
                            rows={1}
                            placeholder="Nomor SOP"
                            value={identity.nomorSOP !== undefined ? identity.nomorSOP : 'SOP/BKPSDM/2026/001'} 
                            onChange={(e) => {
                              updateIdentity('nomorSOP', e.target.value);
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }} 
                            onFocus={(e) => {
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', resize: 'none', fontFamily: 'inherit', fontSize: '9.5pt', overflow: 'hidden', padding: 0 }}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '3px 0', verticalAlign: 'top' }}>Tanggal Pembuatan</td>
                        <td style={{ padding: '3px 0', verticalAlign: 'top' }}>:</td>
                        <td style={{ padding: '3px 0' }}>
                          <textarea 
                            rows={1}
                            placeholder="Tanggal Pembuatan"
                            value={identity.tanggalPembuatan !== undefined ? identity.tanggalPembuatan : '2 Januari 2026'} 
                            onChange={(e) => {
                              updateIdentity('tanggalPembuatan', e.target.value);
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }} 
                            onFocus={(e) => {
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', resize: 'none', fontFamily: 'inherit', fontSize: '9.5pt', overflow: 'hidden', padding: 0 }}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '3px 0', verticalAlign: 'top' }}>Tanggal Revisi</td>
                        <td style={{ padding: '3px 0', verticalAlign: 'top' }}>:</td>
                        <td style={{ padding: '3px 0' }}>
                          <textarea 
                            rows={1}
                            placeholder="Tanggal Revisi"
                            value={identity.tanggalRevisi !== undefined ? identity.tanggalRevisi : '-'} 
                            onChange={(e) => {
                              updateIdentity('tanggalRevisi', e.target.value);
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }} 
                            onFocus={(e) => {
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', resize: 'none', fontFamily: 'inherit', fontSize: '9.5pt', overflow: 'hidden', padding: 0 }}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '3px 0', verticalAlign: 'top' }}>Tanggal Pengesahan</td>
                        <td style={{ padding: '3px 0', verticalAlign: 'top' }}>:</td>
                        <td style={{ padding: '3px 0' }}>
                          <textarea 
                            rows={1}
                            placeholder="Tanggal Pengesahan"
                            value={identity.tanggalPengesahan !== undefined ? identity.tanggalPengesahan : '5 Januari 2026'} 
                            onChange={(e) => {
                              updateIdentity('tanggalPengesahan', e.target.value);
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }} 
                            onFocus={(e) => {
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', resize: 'none', fontFamily: 'inherit', fontSize: '9.5pt', overflow: 'hidden', padding: 0 }}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '3px 0', verticalAlign: 'top' }}>Disahkan Oleh</td>
                        <td style={{ padding: '3px 0', verticalAlign: 'top' }}>:</td>
                        <td style={{ padding: '3px 0' }}>
                          <textarea 
                            rows={2}
                            placeholder="Jabatan Pengesah"
                            value={identity.disahkanOlehJabatan !== undefined ? identity.disahkanOlehJabatan : 'Kepala Badan Kepegawaian dan Pengembangan Sumber Daya Manusia'} 
                            onChange={(e) => {
                              updateIdentity('disahkanOlehJabatan', e.target.value);
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }} 
                            onFocus={(e) => {
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', resize: 'none', fontFamily: 'inherit', fontSize: '9.5pt', overflow: 'hidden', padding: 0, fontWeight: 'bold' }}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '3px 0', verticalAlign: 'top' }}>Nama SOP</td>
                        <td style={{ padding: '3px 0', verticalAlign: 'top' }}>:</td>
                        <td style={{ padding: '3px 0' }}>
                          <textarea 
                            rows={2}
                            placeholder="Nama / Judul SOP"
                            value={docData.title || ''} 
                            onChange={(e) => {
                              onDocChange({ ...docData, title: e.target.value });
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }} 
                            onFocus={(e) => {
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', resize: 'none', fontFamily: 'inherit', fontSize: '9.5pt', fontWeight: 'bold', overflow: 'hidden', padding: 0 }}
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <tr id="sop-sec-dasar-hukum">
                <td style={{ border: '1px solid #000', padding: 8, verticalAlign: 'top' }}>
                  <strong>DASAR HUKUM</strong><br/>
                  <textarea 
                    rows={4} 
                    placeholder="Contoh: 1. Permenpan RB Nomor 35 Tahun 2012&#10;2. Perda No. 5 Tahun 2021..."
                    style={{width:'100%', border:'none', outline:'none', resize:'none', fontFamily:'inherit', whiteSpace:'pre-wrap', fontSize:'9.5pt'}} 
                    value={identity.dasarHukum !== undefined ? identity.dasarHukum : '1. Peraturan Menteri PAN & RB Nomor 35 Tahun 2012 tentang Pedoman Penyusunan SOP Administrasi Pemerintahan.\n2. Peraturan Daerah Kabupaten Banjarnegara tentang Organisasi dan Tata Kerja.'} 
                    onChange={e => updateIdentity('dasarHukum', e.target.value)} 
                  />
                </td>
                <td id="sop-sec-kualifikasi" style={{ border: '1px solid #000', padding: 8, verticalAlign: 'top' }}>
                  <strong>KUALIFIKASI PELAKSANA</strong><br/>
                  <textarea 
                    rows={4} 
                    placeholder="Contoh: 1. Memiliki kualifikasi pendidikan S1&#10;2. Memahami prosedur teknis operasional..."
                    style={{width:'100%', border:'none', outline:'none', resize:'none', fontFamily:'inherit', whiteSpace:'pre-wrap', fontSize:'9.5pt'}} 
                    value={identity.kualifikasiPelaksana !== undefined ? identity.kualifikasiPelaksana : '1. Pendidikan minimal D3 / S1 Administrasi / Ilmu Komputer.\n2. Memahami prosedur dan regulasi penyusunan serta pelayanan standar.'} 
                    onChange={e => updateIdentity('kualifikasiPelaksana', e.target.value)} 
                  />
                </td>
              </tr>
              <tr id="sop-sec-keterkaitan">
                <td style={{ border: '1px solid #000', padding: 8, verticalAlign: 'top' }}>
                  <strong>KETERKAITAN</strong><br/>
                  <textarea 
                    rows={3} 
                    placeholder="Contoh: 1. SOP Pelayanan Informasi Publik&#10;2. SOP Pengelolaan Arsip..."
                    style={{width:'100%', border:'none', outline:'none', resize:'none', fontFamily:'inherit', whiteSpace:'pre-wrap', fontSize:'9.5pt'}} 
                    value={identity.keterkaitan !== undefined ? identity.keterkaitan : '1. SOP Pelayanan Administrasi Publik.\n2. SOP Pengelolaan Surat Masuk dan Keluar.'} 
                    onChange={e => updateIdentity('keterkaitan', e.target.value)} 
                  />
                </td>
                <td id="sop-sec-peralatan" style={{ border: '1px solid #000', padding: 8, verticalAlign: 'top' }}>
                  <strong>PERALATAN/PERLENGKAPAN</strong><br/>
                  <textarea 
                    rows={3} 
                    placeholder="Contoh: 1. Komputer / Laptop&#10;2. Jaringan Internet & Printer..."
                    style={{width:'100%', border:'none', outline:'none', resize:'none', fontFamily:'inherit', whiteSpace:'pre-wrap', fontSize:'9.5pt'}} 
                    value={identity.peralatanPerlengkapan !== undefined ? identity.peralatanPerlengkapan : '1. Komputer/Laptop, Printer, Scanner, dan Jaringan Internet.\n2. Alat Tulis Kantor (ATK) & Map Berkas.'} 
                    onChange={e => updateIdentity('peralatanPerlengkapan', e.target.value)} 
                  />
                </td>
              </tr>
              <tr id="sop-sec-peringatan">
                <td style={{ border: '1px solid #000', padding: 8, verticalAlign: 'top' }}>
                  <strong>PERINGATAN</strong><br/>
                  <textarea 
                    rows={3} 
                    placeholder="Contoh: Jika SOP ini tidak dilaksanakan, pelayanan publik tidak berjalan optimal..."
                    style={{width:'100%', border:'none', outline:'none', resize:'none', fontFamily:'inherit', whiteSpace:'pre-wrap', fontSize:'9.5pt'}} 
                    value={identity.peringatan !== undefined ? identity.peringatan : 'Jika SOP ini tidak dilaksanakan, proses pelayanan standar tidak akan berjalan secara optimal dan tepat waktu.'} 
                    onChange={e => updateIdentity('peringatan', e.target.value)} 
                  />
                </td>
                <td id="sop-sec-pencatatan" style={{ border: '1px solid #000', padding: 8, verticalAlign: 'top' }}>
                  <strong>PENCATATAN DAN PENDATAAN</strong><br/>
                  <textarea 
                    rows={3} 
                    placeholder="Contoh: Disimpan dalam bentuk berkas fisik (hardcopy) dan file digital (softcopy)..."
                    style={{width:'100%', border:'none', outline:'none', resize:'none', fontFamily:'inherit', whiteSpace:'pre-wrap', fontSize:'9.5pt'}} 
                    value={identity.pencatatan !== undefined ? identity.pencatatan : 'Disimpan dalam bentuk arsip fisik (hardcopy) pada file cabinet dan arsip digital (softcopy) dalam sistem database.'} 
                    onChange={e => updateIdentity('pencatatan', e.target.value)} 
                  />
                </td>
              </tr>
            </tbody>
          </table>

          {/* PAGE FOOTER DOKUMEN SOP */}
          <div className="page-number-footer" style={{ bottom: 12 }}>
            Halaman 1 dari {1 + flowchartPages.length}
          </div>
        </div>

        {/* === HALAMAN FLOWCHART DENGAN MULTI-PAGE SHEET (A4 LANDSCAPE: 297mm x 210mm) === */}
        {flowchartPages.map((pageItems, pageIdx) => {
          const isFirstFlowchartPage = pageIdx === 0;
          const isLastFlowchartPage = pageIdx === flowchartPages.length - 1;
          const totalSopPages = 1 + flowchartPages.length;

          return (
            <div
              key={pageIdx}
              id={`flowchart-sheet-${pageIdx}`}
              ref={pageIdx === 0 ? containerRef : null}
              className="sop-print-area a4-paper-sheet-landscape"
              style={{
                width: '297mm',
                height: '210mm',
                backgroundColor: '#ffffff',
                boxShadow: '0 1px 4px 0 rgba(60,64,67,0.15), 0 4px 14px 3px rgba(60,64,67,0.12)',
                border: '1px solid #dadce0',
                padding: '12mm 15mm 15mm 15mm',
                boxSizing: 'border-box',
                position: 'relative',
                color: '#000000',
                fontFamily: 'Arial, sans-serif',
                fontSize: '10pt',
                overflow: 'hidden',
              }}
            >
              {/* SVG Connector Overlay per lembar Halaman Flowchart */}
              <svg 
                viewBox="0 0 1122.52 793.70"
                style={{
                  position: 'absolute', top: 0, left: 0,
                  width: '100%', height: '100%',
                  overflow: 'visible',
                  pointerEvents: 'none',
                  zIndex: 10
                }}
              >
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#000" />
                  </marker>
                </defs>
                {(() => {
                  const stepIndices = new Set(pageItems.map(item => item.originalIndex));
                  return (
                    <>
                      {lineCoords
                        .filter(c => {
                          if (c.isCrossPage) {
                            return c.crossType === 'exit' ? stepIndices.has(c.fromS) : stepIndices.has(c.toS);
                          }
                          return stepIndices.has(c.fromS) && stepIndices.has(c.toS);
                        })
                        .map(c => (
                          <path 
                            key={c.id} 
                            data-line-id={c.id}
                            d={c.isCrossPage ? renderCrossPagePath(c.x1, c.y1, c.p1, c.x2, c.y2, c.p2, c.crossType) : renderLinePath(c.x1, c.y1, c.p1, c.x2, c.y2, c.p2)} 
                            fill="none" stroke="#000" strokeWidth="1.5" markerEnd="url(#arrow)" 
                            style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              const realId = typeof c.id === 'string' ? parseInt(c.id.split('-')[0], 10) : c.id;
                              removeConnection(realId); 
                            }}
                          />
                        ))
                      }
                    </>
                  );
                })()}
              </svg>

              <div id={isFirstFlowchartPage ? 'sop-sec-flowchart' : undefined} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 32, marginBottom: 10 }}>
                <strong style={{ fontSize: '11pt', lineHeight: '32px' }}>
                  Bagan Alir (Flowchart) {flowchartPages.length > 1 ? `- Hal ${pageIdx + 2}` : ''}
                </strong>
                {isFirstFlowchartPage && (
                  <button 
                    onClick={addActor} 
                    className="no-print modern-btn modern-btn-primary"
                    style={{ fontSize: 12, padding: '5px 12px' }}
                  >
                    <Plus size={14} /> Tambah Pelaksana
                  </button>
                )}
              </div>
            
              {/* TABEL BAGAN ALIR (HANYA DITAMPILKAN JIKA ADA POIN / STEPS PADA HALAMAN INI) */}
              {pageItems.length > 0 && (
                <table 
                  style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', border: '1px solid #000', textAlign: 'center', fontSize: '9pt', marginTop: 6 }}
                >
                  <thead>
                    <tr>
                      <th rowSpan="2" style={{ border: '1px solid #000', width: 30 }}>No</th>
                      <th rowSpan="2" style={{ border: '1px solid #000', width: 210 }}>Uraian Prosedur/Aktivitas</th>
                      <th colSpan={Math.max(1, actors.length)} style={{ border: '1px solid #000', padding: 4 }}>
                        Pelaksana
                      </th>
                      <th colSpan="3" style={{ border: '1px solid #000', padding: 4 }}>Mutu Baku</th>
                      <th rowSpan="2" style={{ border: '1px solid #000', width: 45 }}>Ket</th>
                      <th rowSpan="2" style={{ border: '1px solid #000', width: 30 }}>#</th>
                    </tr>
                    <tr>
                      {actors.map((actor, actorIdx) => (
                        <th key={actorIdx} style={{ border: '1px solid #000', padding: '6px 4px', fontWeight: 'normal', width: 60, minWidth: 60, verticalAlign: 'top', position: 'relative' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 28 }}>
                            <AutoFitInput
                              value={actor}
                              onChange={(e) => updateActor(actorIdx, e.target.value)}
                              baseFont={13}
                              minFont={9}
                            />
                            {actors.length > 1 && (
                              <button 
                                onClick={() => removeActor(actorIdx)} 
                                title="Hapus Pelaksana"
                                className="no-print"
                                style={{ 
                                  position: 'absolute',
                                  top: 2,
                                  right: 2,
                                  background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 4, 
                                  cursor: 'pointer', padding: '1px 3px', color: '#dc2626',
                                  display: 'flex', alignItems: 'center', gap: 2,
                                  fontSize: 9, lineHeight: 1,
                                  transition: 'all 0.2s',
                                  whiteSpace: 'nowrap',
                                  zIndex: 5
                                }}
                              >
                                <Trash2 size={10} />
                              </button>
                            )}
                          </div>
                        </th>
                      ))}
                      <th style={{ border: '1px solid #000', width: 100, fontWeight: 'normal' }}>Persyaratan</th>
                      <th style={{ border: '1px solid #000', width: 55, fontWeight: 'normal' }}>Waktu</th>
                      <th style={{ border: '1px solid #000', width: 85, fontWeight: 'normal' }}>Output</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map(({ step, originalIndex: idx, isContinuation }) => {
                      if (step.isNoteRow) {
                        return (
                          <tr key={`${step.id || idx}-note`}>
                            <td 
                              colSpan={6 + Math.max(1, actors.length)} 
                              style={{ border: '1px solid #000', padding: '4px 8px', background: '#ffffff', textAlign: 'left', verticalAlign: 'middle' }}
                            >
                              <AutoResizingTextarea
                                value={step.keteranganText || ''}
                                onChange={(e) => updateStep(idx, 'keteranganText', e.target.value)}
                                placeholder="Tuliskan keterangan di sini..."
                                rows={1}
                              />
                            </td>
                            <td className="no-print" style={{ border: '1px solid #000', padding: 4, verticalAlign: 'middle' }}>
                              <span>
                                <Trash2 size={14} color="red" style={{ cursor: 'pointer' }} onClick={() => removeStep(idx)} />
                              </span>
                            </td>
                          </tr>
                        );
                      }

                      return (
                      <tr key={`${step.id || idx}-${isContinuation ? 'cont' : 'main'}`}>
                        <td style={{ border: '1px solid #000', fontSize: '9pt', color: isContinuation ? '#70757a' : '#000', verticalAlign: 'middle' }}>
                          {isContinuation ? '' : idx + 1}
                        </td>
                        <td style={{ border: '1px solid #000', textAlign: 'left', padding: '4px 6px', verticalAlign: 'middle' }}>
                          {isContinuation ? (
                            <div style={{ color: '#5f6368', fontStyle: 'italic', fontSize: '9pt', padding: '2px 0' }}>
                              {step.uraian}
                            </div>
                          ) : (
                            <AutoResizingTextarea
                              value={step.uraian || ''}
                              onChange={(e) => updateStep(idx, 'uraian', e.target.value)}
                              rows={1}
                            />
                          )}
                        </td>

                        {/* SEL SIMBOL AKTIVITAS UNTUK SETIAP PELAKSANA */}
                        {actors.map((_, actorIdx) => (
                          <td 
                            key={actorIdx} 
                            style={{ border: '1px solid #000', padding: '6px 4px', position: 'relative', width: 60, verticalAlign: 'middle', boxSizing: 'border-box' }}
                            onClick={(e) => handleCellClick(e, idx, actorIdx)}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '2px 0', minHeight: '100%', width: '100%' }}>
                              {addingSymbolToCell?.s === idx && addingSymbolToCell?.a === actorIdx && (!step.nodes || !step.nodes[actorIdx] || step.nodes[actorIdx].length === 0) && (
                                <div 
                                  className="floating-toolbar"
                                  style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <button className="symbol-toolbar-btn" title="Kapsul" onClick={() => handleAddSymbol(idx, actorIdx, 'kapsul')}><KapsulIcon/></button>
                                  <button className="symbol-toolbar-btn" title="Kotak" onClick={() => handleAddSymbol(idx, actorIdx, 'kotak')}><KotakIcon/></button>
                                  <button className="symbol-toolbar-btn" title="Belah Ketupat" onClick={() => handleAddSymbol(idx, actorIdx, 'belah_ketupat')}><BelahKetupatIcon/></button>
                                  <div className="toolbar-divider"></div>
                                  <button className="symbol-toolbar-btn" title="Batal" onClick={() => setAddingSymbolToCell(null)}><X size={16} strokeWidth={2.5} /></button>
                                </div>
                              )}

                              {step.nodes && step.nodes[actorIdx] && step.nodes[actorIdx].map((symType, subIdx) => (
                                <div key={subIdx} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {renderSymbol(symType, idx, actorIdx, subIdx)}
                                  {selectedCell?.s === idx && selectedCell?.a === actorIdx && selectedCell?.subIndex === subIdx && (
                                    <div 
                                      className="floating-toolbar"
                                      style={{ position: 'absolute', top: -45, left: '50%', transform: 'translateX(-50%)' }}
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <button className="symbol-toolbar-btn" title="Kapsul" onClick={() => changeSymbol(idx, actorIdx, subIdx, 'kapsul')}><KapsulIcon/></button>
                                      <button className="symbol-toolbar-btn" title="Kotak" onClick={() => changeSymbol(idx, actorIdx, subIdx, 'kotak')}><KotakIcon/></button>
                                      <button className="symbol-toolbar-btn" title="Belah Ketupat" onClick={() => changeSymbol(idx, actorIdx, subIdx, 'belah_ketupat')}><BelahKetupatIcon/></button>
                                      {step.nodes[actorIdx].length < 2 && (
                                        <button className="symbol-toolbar-btn" title="Tambah Simbol di Bawah" onClick={() => addSymbolToCell(idx, actorIdx)}>
                                          <Plus size={16} strokeWidth={2.5} />
                                        </button>
                                      )}
                                      <div className="toolbar-divider"></div>
                                      <button className="symbol-toolbar-btn" style={{ color: '#d93025' }} title="Hapus" onClick={() => deleteSymbol(idx, actorIdx, subIdx)}>
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                        ))}

                        <td style={{ border: '1px solid #000', padding: '4px 6px', verticalAlign: 'middle' }}>
                          <AutoResizingTextarea 
                            value={step.mutuBaku?.persyaratan} 
                            onChange={e => updateStep(idx, 'mutuBaku.persyaratan', e.target.value)}
                            rows={1}
                          />
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px 2px', verticalAlign: 'middle' }}>
                          <AutoResizingTextarea 
                            value={step.mutuBaku?.waktu} 
                            onChange={e => updateStep(idx, 'mutuBaku.waktu', e.target.value)} 
                            rows={1}
                            style={{ textAlign: 'center' }} 
                          />
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', verticalAlign: 'middle' }}>
                          <AutoResizingTextarea 
                            value={step.mutuBaku?.output} 
                            onChange={e => updateStep(idx, 'mutuBaku.output', e.target.value)}
                            rows={1}
                          />
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px 2px', verticalAlign: 'middle', textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: '100%', gap: 4 }}>
                            <AutoResizingTextarea 
                              value={step.mutuBaku?.keterangan || ''} 
                              onChange={e => updateStep(idx, 'mutuBaku.keterangan', e.target.value)} 
                              rows={1}
                              style={{ textAlign: 'center', width: '100%' }} 
                            />
                            <button
                              onClick={() => insertNoteRow(idx)}
                              title="Tambah Baris Catatan/Keterangan Baru"
                              className="no-print"
                              style={{
                                background: '#e8f0fe', 
                                border: '1px solid #1a73e8', 
                                color: '#1a73e8',
                                borderRadius: 4, 
                                cursor: 'pointer', 
                                padding: '2px 5px', 
                                fontSize: 10,
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                gap: 2,
                                transition: 'background 0.15s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = '#d2e3fc'}
                              onMouseLeave={e => e.currentTarget.style.background = '#e8f0fe'}
                            >
                              <Plus size={11} strokeWidth={2.5} />
                            </button>
                          </div>
                        </td>
                        <td className="no-print" style={{ border: '1px solid #000', padding: 4, verticalAlign: 'middle' }}>
                          <span>
                            <Trash2 size={14} color="red" style={{ cursor: 'pointer' }} onClick={() => removeStep(idx)} />
                          </span>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              )}

              {/* TOMBOL TAMBAH BARIS & BLOK PENANDATANGAN HANYA DI HALAMAN FLOWCHART TERAKHIR */}
              {isLastFlowchartPage && (
                <>
                  <div className="no-print" style={{ marginTop: 12, textAlign: 'center' }}>
                    <button className="modern-btn modern-btn-primary" onClick={addStep}>
                      <Plus size={18} /> Tambah Baris Prosedur
                    </button>
                  </div>

                  <div id="sop-sec-ttd" style={{ marginTop: 18, width: 280, marginLeft: 'auto', textAlign: 'center' }}>
                    <AutoResizingTextarea
                      value={docData.signatoryTitle || 'KEPALA BADAN KEPEGAWAIAN\nDAN PENGEMBANGAN SUMBER DAYA MANUSIA'}
                      onChange={e => onDocChange({ ...docData, signatoryTitle: e.target.value })}
                      rows={1}
                      style={{ 
                        width: '100%', 
                        border: 'none', 
                        textAlign: 'center', 
                        resize: 'none', 
                        fontFamily: 'inherit', 
                        fontWeight: 'bold', 
                        fontSize: '9.5pt',
                        overflow: 'hidden',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                      }}
                    />
                    
                    {/* CAP & TANDA TANGAN IMAGE BOX (DISAMAKAN DENGAN SP) */}
                    <div
                      className="signature-image-container"
                      style={{
                        position: 'relative',
                        minHeight: 70,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '8px 0',
                      }}
                    >
                      {docData.signatureImage ? (
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <img
                            src={docData.signatureImage}
                            alt="Cap & Tanda Tangan"
                            style={{ maxHeight: 80, maxWidth: 260, objectFit: 'contain' }}
                          />
                          <button
                            className="no-print"
                            style={{
                              position: 'absolute',
                              top: -8,
                              right: -8,
                              background: '#ef4444',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '50%',
                              width: 22,
                              height: 22,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            }}
                            onClick={() => onDocChange({ ...docData, signatureImage: undefined })}
                            title="Hapus Gambar Cap/Tanda Tangan"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ) : (
                        <label
                          className="no-print signature-upload-placeholder"
                          style={{
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            color: '#1a73e8',
                            fontSize: 12,
                            padding: '6px 12px',
                            border: '1px dashed #1a73e8',
                            borderRadius: 4,
                            background: '#e8f0fe',
                          }}
                        >
                          <Plus size={14} />
                          <span>Unggah Cap / Tanda Tangan</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  onDocChange({ ...docData, signatureImage: event.target.result });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            style={{ display: 'none' }}
                          />
                        </label>
                      )}
                    </div>

                    <input
                      value={docData.signatoryName || 'ESTI WIDODO'}
                      onChange={e => onDocChange({ ...docData, signatoryName: e.target.value })}
                      style={{ width: '100%', border: 'none', borderBottom: '1px solid #000', textAlign: 'center', fontFamily: 'inherit', fontWeight: 'bold', fontSize: '9.5pt' }}
                    />
                  </div>
                </>
              )}

              {/* PAGE FOOTER DOKUMEN SOP */}
              <div className="page-number-footer" style={{ bottom: 12 }}>
                Halaman {pageIdx + 2} dari {totalSopPages}
              </div>
            </div>
          );
        })}
      </div>

      {/* GLOBAL FIXED DRAG LINE OVERLAY (Z-INDEX 999999: PENETRATES ALL BORDERS & STANDS ON TOP OF EVERYTHING) */}
      {dragState && (() => {
        const startSymbolEl = document.getElementById(`symbol-${dragState.startS}-${dragState.startA}-${dragState.startSubIndex}`);
        const circleEl = startSymbolEl ? startSymbolEl.querySelector(`circle[data-port="${dragState.startPort}"]`) : null;
        const circleRect = circleEl ? circleEl.getBoundingClientRect() : null;
        const startX = circleRect ? circleRect.left + circleRect.width / 2 : dragState.startX;
        const startY = circleRect ? circleRect.top + circleRect.height / 2 : dragState.startY;

        const endX = dragState.currentX;
        const endY = dragState.currentY;

        let d = `M ${startX} ${startY} L ${endX} ${endY}`;
        if (dragState.startPort === 'left' || dragState.startPort === 'right') {
          if (Math.abs(startY - endY) < 6) {
            d = `M ${startX} ${startY} L ${endX} ${startY}`;
          } else {
            // Belok CUMA SEKALI: Meluncur horizontal ke endX pada ketinggian startY, lalu belok 90° lurus ke endY
            d = `M ${startX} ${startY} L ${endX} ${startY} L ${endX} ${endY}`;
          }
        } else if (dragState.startPort === 'top' || dragState.startPort === 'bottom') {
          if (Math.abs(startX - endX) < 6) {
            d = `M ${startX} ${startY} L ${startX} ${endY}`;
          } else {
            // Belok CUMA SEKALI: Meluncur vertikal ke endY pada posisi startX, lalu belok 90° lurus ke endX
            d = `M ${startX} ${startY} L ${startX} ${endY} L ${endX} ${endY}`;
          }
        }

        return (
          <svg 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              pointerEvents: 'none',
              zIndex: 999999
            }}
          >
            <path 
              d={d} 
              fill="none" 
              stroke="#1a73e8" 
              strokeWidth="2.5" 
              strokeDasharray="6,4" 
            />
          </svg>
        );
      })()}
    </div>
  );
};

export default SOPEditor;
