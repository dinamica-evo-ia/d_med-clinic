import { Link } from '@inertiajs/react';
import logoHorizontal from '@/assets/logo-horizontal.png';

export default function GuestLayout({ children }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-10">
            <div className="mb-8 flex flex-col items-center text-center">
                <Link href="/">
                    <img src={logoHorizontal} alt="D_Med Clinic" className="h-10 w-auto" />
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
