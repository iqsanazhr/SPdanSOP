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

export const SOPEditor = ({ document: docData, zoom, onDocChange }) => {
  const content = useMemo(() => {
    try {
      return JSON.parse(docData.contentData || '{}');
    } catch (e) {
      return { identity: {}, actors: [], steps: [] };
    }
  }, [docData.contentData]);

  const { identity = {}, actors = [], steps = [], connections = [] } = content;

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

  // Drag and Drop Lines State
  const [dragState, setDragState] = useState(null);

  const handlePortPointerDown = (e, s, a, subIndex, port) => {
    e.stopPropagation();
    setSelectedCell(null); // hide toolbar when drawing
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragState({
      startS: s, startA: a, startSubIndex: subIndex, startPort: port,
      startX: e.clientX, startY: e.clientY,
      currentX: e.clientX, currentY: e.clientY,
      targetElement: e.currentTarget
    });
  };

  const handlePortPointerMove = (e) => {
    if (dragState) {
      let targetPort = null;
      let targetSubIndex = null;
      let targetX = e.clientX;
      let targetY = e.clientY;

      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const targetCircle = elements.find(el => el.hasAttribute('data-port'));
      
      if (targetCircle) {
         targetPort = targetCircle.getAttribute('data-port');
         targetSubIndex = parseInt(targetCircle.getAttribute('data-cell-sub'), 10);
         const rect = targetCircle.getBoundingClientRect();
         targetX = rect.left + rect.width / 2;
         targetY = rect.top + rect.height / 2;
      }
      
      setDragState(prev => ({ ...prev, currentX: targetX, currentY: targetY, targetPort, targetSubIndex }));
    }
  };

  const handlePortPointerUp = (e) => {
    e.stopPropagation();
    if (dragState?.targetElement) {
       dragState.targetElement.releasePointerCapture(e.pointerId);
    }
    
    if (dragState) {
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const targetCircle = elements.find(el => el.hasAttribute('data-port'));
      
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
         if(dragState?.targetElement) dragState.targetElement.releasePointerCapture(e.pointerId);
         setDragState(null);
      }
    });

    return (
      <svg 
        id={`symbol-${s}-${a}-${subIndex}`}
        className="sop-symbol"
        width="40" height="20" viewBox="0 0 40 20" 
        style={{ display: 'block', touchAction: 'none' }}
        onClick={(e) => handleSymbolClick(e, s, a, subIndex)}
      >
        {svgContent}
        <g className="symbol-ports" style={{ opacity: 0, transition: 'opacity 0.2s', cursor: 'crosshair' }}>
           <circle cx="20" cy="2" r="4" fill="#1a73e8" {...portProps('top')} />
           <circle cx="20" cy="18" r="4" fill="#1a73e8" {...portProps('bottom')} />
           <circle cx="2" cy="10" r="4" fill="#1a73e8" {...portProps('left')} />
           <circle cx="38" cy="10" r="4" fill="#1a73e8" {...portProps('right')} />
        </g>
      </svg>
    );
  };

  const [lineCoords, setLineCoords] = useState([]);
  const containerRef = useRef(null);

  // layoutVersion bumps whenever container/window resizes, triggering line recalculation
  const [layoutVersion, setLayoutVersion] = useState(0);

  /**
   * getPortCoords: Konversi posisi port simbol dari screen space ke SVG/layout space.
   * Menggunakan getBoundingClientRect() dari elemen simbol aktual,
   * bukan offset hardcoded, agar selalu akurat.
   */
  const getPortCoords = (s, a, subIndex, port, containerRect, scale) => {
    const el = document.getElementById(`symbol-${s}-${a}-${subIndex}`);
    if (!el) return null;
    const rect = el.getBoundingClientRect();

    // Konversi screen coords ke SVG/layout coords dengan membagi selisih dengan scale
    const cx = (rect.left - containerRect.left + rect.width / 2) / scale;
    const cy = (rect.top - containerRect.top + rect.height / 2) / scale;

    // Gunakan ukuran aktual simbol dalam layout space (bukan hardcoded px)
    const hw = (rect.width / scale) / 2;  // half-width dalam layout coords
    const hh = (rect.height / scale) / 2; // half-height dalam layout coords

    switch (port) {
      case 'top':    return { x: cx, y: cy - hh };
      case 'bottom': return { x: cx, y: cy + hh };
      case 'left':   return { x: cx - hw, y: cy };
      case 'right':  return { x: cx + hw, y: cy };
      default:       return { x: cx, y: cy };
    }
  };

  /**
   * computeLineCoords: Hitung koordinat semua garis connector berdasarkan posisi DOM aktual.
   * Dipanggil via useLayoutEffect (setelah DOM commit, sebelum paint)
   * sehingga koordinat selalu sinkron dengan layout terkini.
   */
  const computeLineCoords = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const scale = zoom / 100;
    const newCoords = [];

    normalizedConnections.forEach((conn, idx) => {
      const fromCoords = getPortCoords(conn.from.s, conn.from.a, conn.from.subIndex, conn.from.port, containerRect, scale);
      const toCoords   = getPortCoords(conn.to.s, conn.to.a, conn.to.subIndex, conn.to.port, containerRect, scale);

      if (fromCoords && toCoords) {
        newCoords.push({
          x1: fromCoords.x, y1: fromCoords.y, p1: conn.from.port,
          x2: toCoords.x,   y2: toCoords.y,   p2: conn.to.port,
          id: idx
        });
      }
    });
    setLineCoords(newCoords);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedConnections, normalizedSteps, zoom]);

  /**
   * PRIMARY: useLayoutEffect — berjalan synchronous setelah setiap DOM commit, sebelum paint.
   * Ini memastikan koordinat garis selalu up-to-date saat React memperbarui DOM
   * (row ditambah, row dihapus, teks berubah, simbol berubah, zoom berubah, dll).
   */
  useLayoutEffect(() => {
    computeLineCoords();
  }, [computeLineCoords, layoutVersion]);

  /**
   * SECONDARY: ResizeObserver + window resize — tangkap perubahan layout yang tidak
   * berasal dari React state changes (e.g. browser resize, font loading, scroll).
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => setLayoutVersion(v => v + 1));
    ro.observe(container);
    // Amati juga tabel flowchart (row bisa berubah tinggi tanpa container berubah)
    const tables = container.querySelectorAll('table');
    tables.forEach(t => ro.observe(t));

    const onWindowResize = () => setLayoutVersion(v => v + 1);
    window.addEventListener('resize', onWindowResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onWindowResize);
    };
  }, []);


  const dragLine = useMemo(() => {
    if (!dragState || !containerRef.current) return null;
    const containerRect = containerRef.current.getBoundingClientRect();
    const scale = zoom / 100;

    const fromCoords = getPortCoords(dragState.startS, dragState.startA, dragState.startSubIndex, dragState.startPort, containerRect, scale);
    if (!fromCoords) return null;

    // Jika kursor sedang di atas port target, snap ke port tersebut
    const x2 = (dragState.currentX - containerRect.left) / scale;
    const y2 = (dragState.currentY - containerRect.top) / scale;
    const p2 = dragState.targetPort || null;

    return { x1: fromCoords.x, y1: fromCoords.y, p1: dragState.startPort, x2, y2, p2 };
  // layoutVersion ensures drag line also recomputes when layout changes during drag
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragState, zoom, layoutVersion]);

  const renderLinePath = (x1, y1, p1, x2, y2, p2) => {
    // Toleransi garis lurus
    if (Math.abs(y1 - y2) < 5 && (!p2 || p1 === 'left' || p1 === 'right')) return `M ${x1} ${y1} L ${x2} ${y2}`;
    if (Math.abs(x1 - x2) < 5 && (!p2 || p1 === 'top' || p1 === 'bottom')) return `M ${x1} ${y1} L ${x2} ${y2}`;

    const OFFSET = 20;
    
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
                const midY = out1.y + (y2 - out1.y) / 2;
                return `M ${x1} ${y1} L ${out1.x} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
            } else {
                return `M ${x1} ${y1} L ${out1.x} ${out1.y} L ${x2} ${out1.y} L ${x2} ${y2}`;
            }
        } else {
            const isForward = (p1 === 'right' && x2 >= out1.x) || (p1 === 'left' && x2 <= out1.x);
            if (isForward) {
                const midX = out1.x + (x2 - out1.x) / 2;
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
                // Loop memutar jika target ada di arah yang salah
                const midX = out1.x + (out2.x - out1.x) / 2;
                path += ` L ${out1.x} ${out1.y} L ${midX} ${out1.y} L ${midX} ${out2.y} L ${out2.x} ${out2.y}`;
            } else {
                // Koneksi langsung (S shape)
                const midY = out1.y + (out2.y - out1.y) / 2;
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
            // Koneksi berlawanan arah horizontal
            if ((p1 === 'right' && out1.x > out2.x) || (p1 === 'left' && out1.x < out2.x)) {
                // Loop memutar
                const midY = out1.y + (out2.y - out1.y) / 2;
                path += ` L ${out1.x} ${midY} L ${out2.x} ${midY}`;
            } else {
                const midX = out1.x + (out2.x - out1.x) / 2;
                path += ` L ${midX} ${out1.y} L ${midX} ${out2.y}`;
            }
        }
    } else {
        // Satu vertikal, satu horizontal
        if (isVert1) {
            if ((p1 === 'bottom' && out2.y > out1.y) || (p1 === 'top' && out2.y < out1.y)) {
                path += ` L ${out1.x} ${out2.y}`;
            } else {
                path += ` L ${out2.x} ${out1.y}`;
            }
        } else {
            if ((p1 === 'right' && out2.x > out1.x) || (p1 === 'left' && out2.x < out1.x)) {
                path += ` L ${out2.x} ${out1.y}`;
            } else {
                path += ` L ${out1.x} ${out2.y}`;
            }
        }
    }

    path += ` L ${out2.x} ${out2.y} L ${x2} ${y2}`;
    return path;
  };

  const removeConnection = (index) => {
    const newConns = [...normalizedConnections];
    newConns.splice(index, 1);
    updateContent({ ...content, connections: newConns });
  };

  return (
    <div className="document-viewport" style={{ padding: '20px 0', background: '#f8f9fa', minHeight: '100vh', overflowY: 'auto' }}>
      <style>{`
        @media print {
          input, textarea { border: none !important; outline: none !important; background: transparent !important; box-shadow: none !important; }
          .no-print { display: none !important; }
          .floating-toolbar { display: none !important; }
          .sop-symbol .symbol-ports { display: none !important; }
          .sop-page-break { display: none !important; }
        }
        .sop-symbol .symbol-ports { opacity: 0; }
        .sop-symbol:hover .symbol-ports { opacity: 1; }
        .symbol-toolbar-btn {
           background: transparent;
           border: none;
           padding: 6px;
           cursor: pointer;
           border-radius: 6px;
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
      <div 
        ref={containerRef}
        className="sop-print-area sop-document-paper"
        style={{
          width: '297mm',
          backgroundColor: '#ffffff',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
          margin: '0 auto',
          padding: '20mm',
          boxSizing: 'border-box',
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top center',
          color: '#000',
          fontFamily: 'Arial, sans-serif',
          fontSize: '10pt',
          position: 'relative'
        }}
      >
        {/* SVG Overlay untuk semua garis connector.
             overflow:visible — garis antar-cell tidak terpotong di batas SVG.
             pointerEvents:none pada SVG container agar tidak menghalangi mouse,
             tapi path individual punya pointerEvents:stroke agar bisa diklik. */}
        <svg 
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
          {lineCoords.map(c => (
            <path 
              key={c.id} 
              d={renderLinePath(c.x1, c.y1, c.p1, c.x2, c.y2, c.p2)} 
              fill="none" stroke="#000" strokeWidth="1.5" markerEnd="url(#arrow)" 
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); removeConnection(c.id); }}
            />
          ))}
          {dragLine && (
            <path 
              d={renderLinePath(dragLine.x1, dragLine.y1, dragLine.p1, dragLine.x2, dragLine.y2, dragLine.p2)} 
              fill="none" stroke="#666" strokeWidth="1.5" strokeDasharray="4,4" 
            />
          )}
        </svg>

        {/* --- HALAMAN 1 --- */}
        <div style={{ minHeight: '160mm' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: 20 }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #000', width: '30%', textAlign: 'center', padding: 10 }}>
                  <div style={{ width: 80, height: 80, background: '#eee', margin: '0 auto', position: 'relative' }}>
                    {identity.logoImage ? (
                      <img src={identity.logoImage} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#999' }}>Klik untuk<br/>upload logo</div>
                    )}
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
                <td style={{ border: '1px solid #000', width: '35%', padding: 10 }}>
                  <table style={{ width: '100%' }}>
                    <tbody>
                      <tr><td width="40%">Nomor SOP</td><td>: <input value={identity.nomorSOP || ''} onChange={(e) => updateIdentity('nomorSOP', e.target.value)} style={{width:'90%'}}/></td></tr>
                      <tr><td>Tanggal Pembuatan</td><td>: <input value={identity.tanggalPembuatan || ''} onChange={(e) => updateIdentity('tanggalPembuatan', e.target.value)} style={{width:'90%'}}/></td></tr>
                      <tr><td>Tanggal Revisi</td><td>: <input value={identity.tanggalRevisi || ''} onChange={(e) => updateIdentity('tanggalRevisi', e.target.value)} style={{width:'90%'}}/></td></tr>
                      <tr><td>Tanggal Pengesahan</td><td>: <input value={identity.tanggalPengesahan || ''} onChange={(e) => updateIdentity('tanggalPengesahan', e.target.value)} style={{width:'90%'}}/></td></tr>
                      <tr><td>Disahkan Oleh</td><td>: <input value={identity.disahkanOlehJabatan || ''} onChange={(e) => updateIdentity('disahkanOlehJabatan', e.target.value)} style={{width:'90%'}}/></td></tr>
                      <tr><td>Nama SOP</td><td>: <strong>{docData.title}</strong></td></tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: 8, verticalAlign: 'top' }}>
                  <strong>DASAR HUKUM</strong><br/>
                  <textarea rows={5} style={{width:'100%', border:'none', outline:'none', resize:'none', fontFamily:'inherit', whiteSpace:'pre-wrap'}} value={identity.dasarHukum || ''} onChange={e => updateIdentity('dasarHukum', e.target.value)} />
                </td>
                <td style={{ border: '1px solid #000', padding: 8, verticalAlign: 'top' }}>
                  <strong>KUALIFIKASI PELAKSANA</strong><br/>
                  <textarea rows={5} style={{width:'100%', border:'none', outline:'none', resize:'none', fontFamily:'inherit', whiteSpace:'pre-wrap'}} value={identity.kualifikasiPelaksana || ''} onChange={e => updateIdentity('kualifikasiPelaksana', e.target.value)} />
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: 8, verticalAlign: 'top' }}>
                  <strong>KETERKAITAN</strong><br/>
                  <textarea rows={3} style={{width:'100%', border:'none', outline:'none', resize:'none', fontFamily:'inherit', whiteSpace:'pre-wrap'}} value={identity.keterkaitan || ''} onChange={e => updateIdentity('keterkaitan', e.target.value)} />
                </td>
                <td style={{ border: '1px solid #000', padding: 8, verticalAlign: 'top' }}>
                  <strong>PERALATAN/PERLENGKAPAN</strong><br/>
                  <textarea rows={3} style={{width:'100%', border:'none', outline:'none', resize:'none', fontFamily:'inherit', whiteSpace:'pre-wrap'}} value={identity.peralatanPerlengkapan || ''} onChange={e => updateIdentity('peralatanPerlengkapan', e.target.value)} />
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: 8, verticalAlign: 'top' }}>
                  <strong>PERINGATAN</strong><br/>
                  <textarea rows={3} style={{width:'100%', border:'none', outline:'none', resize:'none', fontFamily:'inherit', whiteSpace:'pre-wrap'}} value={identity.peringatan || ''} onChange={e => updateIdentity('peringatan', e.target.value)} />
                </td>
                <td style={{ border: '1px solid #000', padding: 8, verticalAlign: 'top' }}>
                  <strong>PENCATATAN DAN PENDATAAN</strong><br/>
                  <textarea rows={3} style={{width:'100%', border:'none', outline:'none', resize:'none', fontFamily:'inherit', whiteSpace:'pre-wrap'}} value={identity.pencatatan || ''} onChange={e => updateIdentity('pencatatan', e.target.value)} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* --- PAGE BREAK --- */}
        <div className="sop-page-break" style={{ pageBreakBefore: 'always', margin: '40px 0', borderTop: '2px dashed #ccc', position: 'relative' }}>
           <span style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: '#fff', padding: '0 10px', color: '#999', fontSize: 12 }}>Halaman 2: Flowchart</span>
        </div>

        {/* --- HALAMAN 2 --- */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
          <strong style={{ fontSize: '11pt' }}>Bagan Alir (Flowchart)</strong>
          <button className="modern-btn no-print" onClick={addActor}>
            <Plus size={14} /> Tambah Pelaksana
          </button>
        </div>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', textAlign: 'center' }}>
          <thead>
            <tr>
              <th rowSpan="2" style={{ border: '1px solid #000', width: 30 }}>No</th>
              <th rowSpan="2" style={{ border: '1px solid #000', width: 250 }}>Uraian Prosedur/Aktivitas</th>
              <th colSpan={Math.max(1, actors.length)} style={{ border: '1px solid #000' }}>Pelaksana</th>
              <th colSpan="3" style={{ border: '1px solid #000' }}>Mutu Baku</th>
              <th rowSpan="2" style={{ border: '1px solid #000', width: 40 }}>Ket</th>
              <th rowSpan="2" className="no-print" style={{ border: '1px solid #000', width: 30 }}>#</th>
            </tr>
            <tr>
              {actors.map((actor, idx) => (
                <th key={idx} style={{ border: '1px solid #000', padding: '6px 6px 4px', fontWeight: 'normal', minWidth: 60, verticalAlign: 'top' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <AutoFitInput
                      value={actor}
                      onChange={(e) => updateActor(idx, e.target.value)}
                      baseFont={13}
                      minFont={9}
                    />
                    <button 
                      onClick={() => removeActor(idx)} 
                      title="Hapus Pelaksana"
                      className="no-print"
                      style={{ 
                        background: 'none', border: '1px solid #fca5a5', borderRadius: 4, 
                        cursor: 'pointer', padding: '1px 6px', color: '#dc2626',
                        display: 'flex', alignItems: 'center', gap: 3,
                        fontSize: 10, lineHeight: 1.4,
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                    >
                      <Trash2 size={10} /> Hapus
                    </button>
                  </div>
                </th>
              ))}
              <th style={{ border: '1px solid #000', width: 100, fontWeight: 'normal' }}>Persyaratan</th>
              <th style={{ border: '1px solid #000', width: 60, fontWeight: 'normal' }}>Waktu</th>
              <th style={{ border: '1px solid #000', width: 80, fontWeight: 'normal' }}>Output</th>
            </tr>
          </thead>
          <tbody>
            {normalizedSteps.map((step, idx) => (
              <tr key={step.id}>
                <td style={{ border: '1px solid #000' }}>{idx + 1}</td>
                <td style={{ border: '1px solid #000', textAlign: 'left', padding: 4 }}>
                  <textarea 
                    value={step.uraian} 
                    onChange={(e) => {
                      updateStep(idx, 'uraian', e.target.value);
                      // Auto-resize
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    onFocus={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    style={{ width: '100%', border: 'none', resize: 'none', fontFamily: 'inherit', overflow: 'hidden', whiteSpace: 'pre-wrap' }}
                    rows={2}
                  />
                </td>
                
                {actors.map((_, actorIdx) => (
                  <td 
                    key={actorIdx} 
                    id={`cell-${idx}-${actorIdx}`}
                    data-cell-s={idx}
                    data-cell-a={actorIdx}
                    style={{ border: '1px solid #000', cursor: 'pointer', position: 'relative', height: 40 }} 
                    onClick={(e) => handleCellClick(e, idx, actorIdx)}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '10px 0', minHeight: '100%' }}>
                      
                      {/* Add Symbol Toolbar for Empty Cell */}
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
                        <div key={subIdx} style={{ position: 'relative' }}>
                          {renderSymbol(symType, idx, actorIdx, subIdx)}
                          
                          {/* Select Toolbar */}
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

                <td style={{ border: '1px solid #000', padding: 2 }}>
                  <textarea value={step.mutuBaku?.persyaratan} onChange={e => updateStep(idx, 'mutuBaku.persyaratan', e.target.value)} style={{ width: '100%', height: '100%', border: 'none', resize: 'none', fontSize: '9pt' }} />
                </td>
                <td style={{ border: '1px solid #000', padding: 2 }}>
                  <input value={step.mutuBaku?.waktu} onChange={e => updateStep(idx, 'mutuBaku.waktu', e.target.value)} style={{ width: '100%', border: 'none', textAlign: 'center', fontSize: '9pt' }} />
                </td>
                <td style={{ border: '1px solid #000', padding: 2 }}>
                  <textarea value={step.mutuBaku?.output} onChange={e => updateStep(idx, 'mutuBaku.output', e.target.value)} style={{ width: '100%', height: '100%', border: 'none', resize: 'none', fontSize: '9pt' }} />
                </td>
                <td style={{ border: '1px solid #000', padding: 2 }}>
                  <input value={step.mutuBaku?.keterangan} onChange={e => updateStep(idx, 'mutuBaku.keterangan', e.target.value)} style={{ width: '100%', border: 'none', textAlign: 'center', fontSize: '9pt' }} />
                </td>
                <td className="no-print" style={{ border: '1px solid #000', padding: 4 }}>
                  <Trash2 size={14} color="red" style={{ cursor: 'pointer' }} onClick={() => removeStep(idx)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="no-print" style={{ marginTop: 20, textAlign: 'center' }}>
          <button className="modern-btn modern-btn-primary" onClick={addStep}>
            <Plus size={18} /> Tambah Baris Prosedur
          </button>
        </div>

        <div style={{ marginTop: 40, width: 300, marginLeft: 'auto', textAlign: 'center' }}>
          <textarea
            value={docData.signatoryTitle || 'KEPALA BADAN...'}
            onChange={e => onDocChange({ ...docData, signatoryTitle: e.target.value })}
            style={{ width: '100%', border: 'none', textAlign: 'center', resize: 'none', fontFamily: 'inherit', fontWeight: 'bold' }}
            rows={3}
          />
          <div style={{ margin: '20px 0', minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {docData.signatureImage ? <img src={docData.signatureImage} alt="TTD" style={{maxHeight: 60}}/> : <span style={{color: '#999'}}>(Tanda Tangan)</span>}
          </div>
          <input
            value={docData.signatoryName || 'NAMA'}
            onChange={e => onDocChange({ ...docData, signatoryName: e.target.value })}
            style={{ width: '100%', border: 'none', borderBottom: '1px solid #000', textAlign: 'center', fontFamily: 'inherit', fontWeight: 'bold' }}
          />
        </div>

      </div>
    </div>
  );
};
