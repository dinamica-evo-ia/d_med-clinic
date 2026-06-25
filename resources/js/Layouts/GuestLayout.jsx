import { Link } from '@inertiajs/react';
import logoHorizontal from '@/assets/logo-horizontal.png';
import logoIcon from '@/assets/logo-icon.png';

/*
 * Shell das telas públicas (login / cadastro), estilo split-screen:
 *  - Esquerda: painel promocional escuro = espaço publicitário (hoje promove o Studio Med;
 *    pensado pra receber anúncio de laboratório/medicamento depois).
 *  - Direita: formulário (children) em fundo claro, campos grandes e modernos.
 * No mobile o painel some e fica só o formulário (com a logo no topo).
 */
export default function GuestLayout({ children }) {
    return (
        <div className="min-h-screen bg-white lg:flex">
            {/* ---- Painel promocional (esquerda) ---- */}
            <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#0a1c38] via-[#0e2a54] to-[#081428] text-white lg:flex lg:w-[56%]">
                <div aria-hidden className="absolute inset-0">
                    <div className="absolute -left-28 -top-28 h-96 w-96 rounded-full bg-blue-500/25 blur-3xl" />
                    <div className="absolute -bottom-24 right-0 h-[30rem] w-[30rem] rounded-full bg-cyan-400/15 blur-3xl" />
                    <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '28px 28px' }} />
                </div>

                <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
                    {/* marca */}
                    <Link href="/" className="inline-flex items-center gap-3 self-start">
                        <img src={logoIcon} alt="" className="h-10 w-10" />
                        <span className="text-xl font-bold tracking-tight">D_Med <span className="text-cyan-300">Clinic</span></span>
                    </Link>

                    {/* anúncio / promo */}
                    <div className="max-w-xl">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> Studio Med · IA clínica
                        </span>
                        <h1 className="mt-7 text-4xl font-bold leading-[1.06] xl:text-5xl">
                            Termine a consulta <span className="text-cyan-300">sem prontuário</span> pra fazer depois.
                        </h1>
                        <p className="mt-6 max-w-md text-lg leading-relaxed text-white/70">
                            A IA do Studio Med escuta a consulta e devolve o prontuário já escrito. Mais tempo com o paciente, menos digitação.
                        </p>
                        <div className="mt-9 flex flex-wrap gap-2.5">
                            {['Prontuário automático', 'Agenda inteligente', 'Receita digital', 'Financeiro integrado'].map((t) => (
                                <span key={t} className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white/85 backdrop-blur">
                                    {t}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* rodapé do painel (slot publicitário) */}
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-white/35">
                        <span>© {new Date().getFullYear()} D_Med Clinic</span>
                        <span>Espaço publicitário</span>
                    </div>
                </div>
            </aside>

            {/* ---- Formulário (direita) ---- */}
            <main className="flex flex-1 flex-col items-center justify-center px-5 py-12 sm:px-10">
                <div className="w-full max-w-md">
                    <div className="mb-10 flex justify-center lg:hidden">
                        <Link href="/"><img src={logoHorizontal} alt="D_Med Clinic" className="h-9 w-auto" /></Link>
                    </div>
                    {children}
                </div>
                <p className="mt-10 flex items-center gap-1.5 text-xs text-slate-400">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 5-3.75 8.25-9 9.75C6.75 20.25 3 17 3 12V6l9-3 9 3v6Z" /></svg>
                    Acesso seguro e criptografado
                </p>
            </main>
        </div>
    );
}
