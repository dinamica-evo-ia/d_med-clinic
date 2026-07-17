import './polyfills';
import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { Component } from 'react';
import AppLayout from './Components/Layouts/AppLayout';
import MasterLayout from './Components/Layouts/MasterLayout';

const appName = import.meta.env.VITE_APP_NAME || 'D_Med Clinic';

// Rede de segurança: se qualquer tela quebrar em runtime, mostra o erro (e um botão de
// recarregar) em vez de deixar a página em branco. Também ajuda a diagnosticar.
class ErrorBoundary extends Component {
    state = { error: null };
    static getDerivedStateFromError(error) { return { error }; }
    componentDidCatch(error, info) { console.error('D_Med crash:', error, info); }
    render() {
        if (!this.state.error) return this.props.children;
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'system-ui, sans-serif', background: '#f8fafc' }}>
                <div style={{ maxWidth: 640, width: '100%' }}>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Algo quebrou nesta tela</h1>
                    <p style={{ marginTop: '.5rem', color: '#64748b', fontSize: '.9rem' }}>Recarregue a página. Se continuar, mande este erro pro suporte:</p>
                    <pre style={{ marginTop: '1rem', padding: '1rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '.5rem', overflow: 'auto', fontSize: '.75rem', color: '#b91c1c', whiteSpace: 'pre-wrap', maxHeight: '40vh' }}>{String(this.state.error?.stack || this.state.error)}</pre>
                    <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '.6rem 1.2rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '.5rem', fontWeight: 600, cursor: 'pointer' }}>Recarregar</button>
                </div>
            </div>
        );
    }
}

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => {
        const pages = import.meta.glob('./Pages/**/*.jsx', { eager: true });
        let page = pages[`./Pages/${name}.jsx`];
        if (!page) {
            page = pages[`./Pages/${name}.jsx`];
        }

        // Layout: Auth, Public, TenantSelect e Mobile/* (PWA) ficam SEM o shell de desktop;
        // Master/* usa MasterLayout; resto usa AppLayout. As telas Mobile trazem o próprio chrome.
        if (name.startsWith('Master/')) {
            page.default.layout = page.default.layout || ((p) => <MasterLayout>{p}</MasterLayout>);
        } else if (!name.startsWith('Auth/') && !name.startsWith('Public/') && !name.startsWith('Mobile/') && name !== 'TenantSelect') {
            page.default.layout = page.default.layout || ((p) => <AppLayout>{p}</AppLayout>);
        }

        return page;
    },
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(<ErrorBoundary><App {...props} /></ErrorBoundary>);
    },
    progress: {
        color: '#2563EB',
    },
});

// PWA: registra o service worker (network-first — ver public/sw.js). Só em produção/HTTPS.
if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('SW falhou:', e));
    });
}