import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-10">
            <div className="mb-8 flex flex-col items-center text-center">
                <Link href="/" className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
                        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                            <path d="M12 7v10M7 12h10" />
                        </svg>
                    </span>
                    <span className="text-2xl font-bold tracking-tight text-slate-900">
                        D_Med <span className="text-blue-600">Clinic</span>
                    </span>
                </Link>
                <p className="mt-2 text-sm text-slate-500">Gestão clínica e prontuário eletrônico</p>
            </div>

            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
                {children}
            </div>

            <p className="mt-8 text-xs text-slate-400">© D_Med Clinic · Acesso seguro e criptografado</p>
        </div>
    );
}
