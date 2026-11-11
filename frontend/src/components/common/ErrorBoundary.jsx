import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturó un error en la aplicación:', error, errorInfo);
  }

  handleReload = () => {
    try {
      sessionStorage.clear();
    } catch {
      // noop
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#051F26] p-6 text-white text-center font-sans">
          <div className="max-w-md w-full bg-[#072730] border border-white/10 rounded-3xl p-8 shadow-2xl space-y-4 animate-in fade-in">
            <span className="grid size-14 place-items-center rounded-2xl bg-lime/20 text-lime text-2xl mx-auto">
              <i className="bx bx-refresh" />
            </span>
            <h2 className="font-display text-2xl font-bold text-white">Sincronizando la plataforma...</h2>
            <p className="text-xs text-white/70 leading-relaxed">
              Hemos refrescado los componentes del portal. Haz clic en el botón inferior para ingresar al inicio de Vincula de forma limpia.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full py-3.5 px-6 rounded-xl bg-lime text-ink font-bold text-xs shadow-md transition-all hover:bg-lime/85 cursor-pointer"
            >
              Ir al inicio de Vincula
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
