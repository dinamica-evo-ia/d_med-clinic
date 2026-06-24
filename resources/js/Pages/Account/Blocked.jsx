import GuestLayout from '@/Layouts/GuestLayout';
import { Head, router } from '@inertiajs/react';

const REASON = {
    trial: {
        title: 'Seu teste grátis terminou',
        body: 'Os 7 dias de teste da sua clínica chegaram ao fim. Fale com a gente pra continuar usando o D_Med Clinic — seus dados continuam guardados, com segurança.',
    },
    suspended: {
        title: 'Clínica suspensa',
        body: 'O acesso desta clínica está temporariamente suspenso. Fale com a gente pra entender o motivo e reativar.',
    },
    cancelled: {
        title: 'Clínica cancelada',
        body: 'Esta clínica não está mais ativa no D_Med Clinic. Se isso for um engano, fale com a gente.',
    },
};

export default function Blocked({ tenant }) {
    const reason = REASON[tenant?.status] || REASON.cancelled;

    return (
        <GuestLayout>
            <Head title="Acesso bloqueado — D_Med Clinic" />

            <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
                    <svg className="h-6 w-6 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M10.29 3.86L1.82 18a1.5 1.5 0 001.29 2.25h17.78A1.5 1.5 0 0022.18 18L13.71 3.86a1.5 1.5 0 00-2.42 0z" />
                    </svg>
                </div>
                <h1 className="text-lg font-semibold text-slate-900">{reason.title}</h1>
                {tenant?.name && <p className="mt-1 text-sm text-slate-500">{tenant.name}</p>}
                <p className="mt-4 text-sm text-slate-600 leading-relaxed">{reason.body}</p>

                <div className="mt-6 flex flex-col gap-2.5">
                    <a
                        href="mailto:ola@dmed.app"
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                    >
                        Falar com a gente
                    </a>
                    <button
                        onClick={() => router.post('/logout')}
                        className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50"
                    >
                        Sair
                    </button>
                </div>
            </div>
        </GuestLayout>
    );
}
