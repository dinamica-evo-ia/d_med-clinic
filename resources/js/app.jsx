import './polyfills';
import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import AppLayout from './Components/Layouts/AppLayout';
import MasterLayout from './Components/Layouts/MasterLayout';

const appName = import.meta.env.VITE_APP_NAME || 'D_Med Clinic';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => {
        const pages = import.meta.glob('./Pages/**/*.jsx', { eager: true });
        let page = pages[`./Pages/${name}.jsx`];
        if (!page) {
            page = pages[`./Pages/${name}.jsx`];
        }

        // Layout: Auth e TenantSelect ficam sem shell; Master/* usa MasterLayout; resto usa AppLayout
        if (name.startsWith('Master/')) {
            page.default.layout = page.default.layout || ((p) => <MasterLayout>{p}</MasterLayout>);
        } else if (!name.startsWith('Auth/') && name !== 'TenantSelect') {
            page.default.layout = page.default.layout || ((p) => <AppLayout>{p}</AppLayout>);
        }

        return page;
    },
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(<App {...props} />);
    },
    progress: {
        color: '#2563EB',
    },
});