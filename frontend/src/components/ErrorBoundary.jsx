import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Captured React Component Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8f9fa',
            color: '#202124',
            fontFamily: 'Roboto, Arial, sans-serif',
            padding: 24,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              maxWidth: 480,
              width: '100%',
              backgroundColor: '#ffffff',
              borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              padding: 32,
              textAlign: 'center',
              border: '1px solid #dadce0',
            }}
          >
            <AlertTriangle size={48} color="#d93025" style={{ marginBottom: 16 }} />
            <h2 style={{ fontSize: 20, margin: '0 0 8px 0', color: '#202124' }}>
              Terjadi Kesalahan Aplikasi
            </h2>
            <p style={{ fontSize: 14, color: '#5f6368', marginBottom: 24, lineHeight: 1.5 }}>
              Terjadi kendala minor pada aplikasi. Anda dapat memuat ulang halaman untuk memulihkan dokumen secara otomatis.
            </p>
            <button
              onClick={this.handleReset}
              style={{
                backgroundColor: '#1a73e8',
                color: '#ffffff',
                border: 'none',
                borderRadius: 4,
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            >
              <RefreshCw size={16} />
              <span>Muat Ulang Halaman</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
