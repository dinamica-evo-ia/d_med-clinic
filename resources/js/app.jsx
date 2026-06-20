import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import AppLayout from './Components/Layouts/AppLayout';

const appName = import.meta.env.VITE_APP_NAME || 'MedHealth';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => {
        const pages = import.meta.glob('./Pages/**/*.jsx', { eager: true });
        let page = pages[`./Pages/${name}.jsx`];
        if (!page) {
            page = pages[`./Pages/${name}.jsx`];
        }

        // Apply layout: Auth pages don't get sidebar, others do
        if (!name.startsWith('Auth/') && name !== 'TenantSelect') {
            page.default.layout = page.default.layout || ((page) => <AppLayout>{page}</AppLayout>);
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
