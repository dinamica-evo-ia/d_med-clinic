import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function AppLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { url, auth } = usePage().props;
    const userRole = auth?.role;

    const allNavigation = [
        { name: 'Dashboard', href: '/', icon: '📊', roles: ['admin', 'doctor', 'receptionist'] },
        { name: 'Pacientes', href: '/patients', icon: '👤', roles: ['admin', 'doctor', 'receptionist'] },
        { name: 'Agenda', href: '/appointments', icon: '📅', roles: ['admin', 'doctor', 'receptionist'] },
        { name: 'Médicos', href: '/doctors', icon: '👨‍⚕️', roles: ['admin', 'doctor'] },
        { name: 'Receitas', href: '/prescriptions', icon: '💊', roles: ['admin', 'doctor'] },
        { name: 'Atestados', href: '/certificates', icon: '📋', roles: ['admin', 'doctor'] },
        { name: 'Exames', href: '/exam-requests', icon: '🔬', roles: ['admin', 'doctor'] },
        { name: 'Studio Med', href: '/studio-med', icon: '🎙️', roles: ['admin', 'doctor'] },
        { name: 'Financeiro', href: '/financeiro', icon: '💰', roles: ['admin', 'doctor'] },
        { name: 'Relatórios', href: '/reports', icon: '📊', roles: ['admin', 'doctor'] },
        { name: 'Usuários', href: '/users', icon: '🔐', roles: ['admin'] },
    ];

    const navigation = allNavigation.filter(item => item.roles.includes(userRole));

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile sidebar */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
                    <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">
                        <SidebarContent navigation={navigation} currentUrl={url} onNavClick={() => setSidebarOpen(false)} />
                    </div>
                </div>
            )}

            {/* Desktop sidebar */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
                <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6">
                    <SidebarContent navigation={navigation} currentUrl={url} />
                </div>
            </div>

            {/* Main content */}
            <div className="lg:pl-64">
                {/* Top bar */}
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 lg:px-6">
                    <div className="flex items-center justify-between">
                        <button className="lg:hidden -ml-2 p-2 text-gray-500 hover:text-gray-700" onClick={() => setSidebarOpen(true)}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <div className="flex items-center gap-2 ml-auto">
                            <span className="text-sm text-gray-500">{auth?.user?.name}</span>
                            <Link href="/select-tenant" className="text-sm text-blue-600 hover:text-blue-800">Trocar Clínica</Link>
                        </div>
                    </div>
                </div>

                {/* Page content */}
                <main className="p-4 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}

function SidebarContent({ navigation, currentUrl, onNavClick }) {
    return (
        <>
            <div className="flex h-16 shrink-0 items-center">
                <Link href="/" className="text-xl font-bold text-blue-600">
                    🏥 MedHealth
                </Link>
            </div>
            <nav className="flex flex-1 flex-col">
                <ul className="flex flex-1 flex-col gap-y-1">
                    {navigation.map((item) => {
                        const isActive = item.href === '/'
                            ? currentUrl === '/' || currentUrl === '/dashboard'
                            : currentUrl.startsWith(item.href);
                        return (
                            <li key={item.name}>
                                <Link
                                    href={item.href}
                                    onClick={onNavClick}
                                    className={`group flex gap-x-3 rounded-lg px-3 py-2 text-sm font-semibold leading-6 transition-colors ${
                                        isActive
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                                >
                                    <span className="text-lg">{item.icon}</span>
                                    {item.name}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </>
    );
}
