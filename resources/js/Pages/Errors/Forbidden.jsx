import { Link, router, Head } from '@inertiajs/react';

export default function Forbidden({ email }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4">
            <Head title="Acesso restrito" />
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/60">
                <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                    <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M10.5 3.5 2.6 17.25A1.5 1.5 0 0 0 3.9 19.5h16.2a1.5 1.5 0 0 0 1.3-2.25L13.5 3.5a1.5 1.5 0 0 0-3 0Z" /></svg>
                </div>
                <h1 className="text-xl font-bold text-slate-900">Acesso restrito</h1>
                <p className="mt-2 text-sm text-slate-500">
                    O Painel Master é exclusivo dos administradores do produto (master).
                    {email && <> Você está logado como <span className="font-medium text-slate-700">{email}</span>.</>}
                </p>

                <div className="mt-6 space-y-2.5">
                    <button
                        onClick={() => router.post('/logout')}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
                        Sair e entrar com a conta master
                    </button>
                    <Link
                        href="/"
                        className="block w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                        Ir para o meu sistema
                    </Link>
                </div>
            </div>
            <p className="mt-8 text-xs text-slate-400">D_Med Clinic</p>
        </div>
    );
}

Forbidden.layout = (page) => page;
