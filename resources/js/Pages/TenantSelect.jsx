import { Link, usePage, router } from '@inertiajs/react';

export default function TenantSelect({ tenants }) {
    const { auth } = usePage().props;
    const isMaster = auth?.isMaster;

    if (!tenants || tenants.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full text-center space-y-4">
                    <h1 className="text-2xl font-bold text-slate-900">D_Med <span className="text-blue-600">Clinic</span></h1>
                    {isMaster ? (
                        <>
                            <p className="text-slate-600">Você é <strong>Master</strong> (admin do produto), não está vinculado a nenhuma clínica.</p>
                            <Link href="/master" className="inline-block px-5 py-2.5 bg-amber-500 text-slate-900 font-semibold rounded-lg hover:bg-amber-400">
                                Abrir Painel Master →
                            </Link>
                            <div>
                                <button onClick={() => router.post('/logout')} className="text-xs text-slate-400 hover:text-slate-700">Sair</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-slate-500">Você não possui acesso a nenhuma clínica. Fale com o administrador da sua clínica.</p>
                            <button onClick={() => router.post('/logout')} className="text-sm text-slate-500 hover:text-slate-800 underline">Sair</button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 max-w-md w-full">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 mb-1">D_Med <span className="text-blue-600">Clinic</span></h1>
                    <p className="text-slate-500 text-sm">Selecione a clínica para acessar</p>
                </div>

                <div className="space-y-3">
                    {tenants.map((tenant) => (
                        <Link
                            key={tenant.id}
                            href={`/select-tenant/${tenant.slug}`}
                            className="block p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                                    {tenant.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{tenant.name}</p>
                                    <p className="text-xs text-slate-500">{tenant.data?.plan ? `Plano ${tenant.data.plan}` : 'Plano Start'}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
