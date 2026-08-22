import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, ChevronDown } from 'lucide-react';

export const ZoomControls = ({ zoom, onZoomChange }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const presets = [50, 75, 100, 125, 150, 200];

  const handleZoomIn = () => {
    onZoomChange(Math.min(200, zoom + 10));
  };

  const handleZoomOut = () => {
    onZoomChange(Math.max(40, zoom - 10));
  };

  const handleReset = () => {
    onZoomChange(100);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={menuRef}
      className="canva-zoom-controls"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 28,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        border: '1px solid #dadce0',
        borderRadius: 24,
        boxShadow: '0 4px 16px rgba(60, 64, 67, 0.18)',
        padding: '4px 8px',
        gap: 4,
        userSelect: 'none',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      {/* Zoom Out Button */}
      <button
        onClick={handleZoomOut}
        disabled={zoom <= 40}
        title="Perkecil Tampilan (Zoom Out)"
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: zoom <= 40 ? 'not-allowed' : 'pointer',
          color: zoom <= 40 ? '#dadce0' : '#3c4043',
          transition: 'background 0.15s'
        }}
        onMouseEnter={(e) => { if (zoom > 40) e.currentTarget.style.background = '#f1f3f4'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <ZoomOut size={16} />
      </button>

      {/* Zoom Percentage Dropdown Trigger */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          title="Pilih Persentase Zoom"
          style={{
            height: 30,
            padding: '0 8px',
            borderRadius: 15,
            border: 'none',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            color: '#202124',
            transition: 'background 0.15s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f3f4'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <span>{zoom}%</span>
          <ChevronDown size={14} style={{ color: '#5f6368' }} />
        </button>

        {/* Zoom Preset Popover Menu */}
        {showMenu && (
          <div
            style={{
              position: 'absolute',
              bottom: 38,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#ffffff',
              border: '1px solid #dadce0',
              borderRadius: 12,
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              padding: '6px 0',
              minWidth: 110,
              zIndex: 10000
            }}
          >
            {presets.map((val) => (
              <button
                key={val}
                onClick={() => {
                  onZoomChange(val);
                  setShowMenu(false);
                }}
                style={{
                  width: '100%',
                  padding: '6px 16px',
                  border: 'none',
                  background: val === zoom ? '#e8f0fe' : 'transparent',
                  color: val === zoom ? '#1a73e8' : '#202124',
                  fontWeight: val === zoom ? 'bold' : 'normal',
                  fontSize: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onMouseEnter={(e) => { if (val !== zoom) e.currentTarget.style.background = '#f8f9fa'; }}
                onMouseLeave={(e) => { if (val !== zoom) e.currentTarget.style.background = 'transparent'; }}
              >
                <span>{val}%</span>
                {val === 100 && <span style={{ fontSize: '10px', color: '#70757a', marginLeft: 6 }}>(Normal)</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Zoom In Button */}
      <button
        onClick={handleZoomIn}
        disabled={zoom >= 200}
        title="Perbesar Tampilan (Zoom In)"
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: zoom >= 200 ? 'not-allowed' : 'pointer',
          color: zoom >= 200 ? '#dadce0' : '#3c4043',
          transition: 'background 0.15s'
        }}
        onMouseEnter={(e) => { if (zoom < 200) e.currentTarget.style.background = '#f1f3f4'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <ZoomIn size={16} />
      </button>

      <div style={{ width: 1, height: 16, background: '#dadce0', margin: '0 2px' }} />

      {/* Reset Zoom Button */}
      <button
        onClick={handleReset}
        title="Reset Zoom ke 100%"
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#5f6368',
          transition: 'background 0.15s'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f3f4'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <RotateCcw size={14} />
      </button>
    </div>
  );
};

export default ZoomControls;
