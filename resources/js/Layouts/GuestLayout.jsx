import { Link } from '@inertiajs/react';
import { useState } from 'react';
import logoHorizontal from '@/assets/logo-horizontal.png';
import logoIcon from '@/assets/logo-icon.png';

/*
 * Shell das telas públicas (login / cadastro), estilo split-screen:
 *  - Esquerda: painel publicitário escuro. Sorteia 1 de 3 lâminas a cada acesso, cada uma com
 *    a MARCA do anunciante no topo (house ad do Studio Med + 2 anúncios de exemplo: DiagLab e
 *    NeoVita, fictícios). Plugar campanha real = editar o array ADS.
 *  - Direita: logo do D_Med + formulário (children).
 */
const ACCENT = {
    cyan:  { text: 'text-cyan-300',  dot: 'bg-cyan-300',  chip: 'bg-cyan-400',  ink: '#06283a' },
    teal:  { text: 'text-teal-300',  dot: 'bg-teal-300',  chip: 'bg-teal-400',  ink: '#06291f' },
    amber: { text: 'text-amber-300', dot: 'bg-amber-300', chip: 'bg-amber-400', ink: '#3a2600' },
};

const MARKS = {
    lab: (ink) => <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke={ink} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6M10 3v6l-4.6 8.6A1.6 1.6 0 006.8 20h10.4a1.6 1.6 0 001.4-2.4L14 9V3M7.5 14h9" /></svg>,
    med: (ink) => <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke={ink} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 15.5l7-7a3.5 3.5 0 10-5-5l-7 7a3.5 3.5 0 105 5zM6 13l5-5" /></svg>,
};

const ADS = [
    {
        kind: 'house', mark: 'studio', brand: 'Studio Med', brandTag: 'by D_Med', accent: 'cyan',
        eyebrow: 'Inteligência clínica',
        title: ['Termine a consulta ', 'sem prontuário', ' pra fazer depois.'],
        sub: 'A IA do Studio Med escuta a consulta e devolve o prontuário já escrito. Mais tempo com o paciente, menos digitação.',
        pills: ['Prontuário automático', 'Agenda inteligente', 'Receita digital', 'Financeiro integrado'],
    },
    {
        kind: 'ad', mark: 'lab', brand: 'DiagLab', brandTag: 'Análises Clínicas', accent: 'teal',
        eyebrow: 'Laboratório parceiro',
        title: ['Resultados de exames em ', 'até 24h', ', direto no sistema.'],
        sub: 'Parceria DiagLab: coleta agendada e laudos integrados ao prontuário do seu paciente.',
        pills: ['Laudos integrados', 'Coleta agendada', 'Cobertura nacional'],
    },
    {
        kind: 'ad', mark: 'med', brand: 'NeoVita', brandTag: 'D3', accent: 'amber',
        eyebrow: 'Medicamento',
        title: ['NeoVita D3 — vitamina D com ', '1 dose semanal', '.'],
        sub: 'Reposição prática, na dose certa para o seu paciente. Bula, estudos e amostras sob solicitação.',
        pills: ['Dose semanal', 'Bula e estudos', 'Amostra grátis'],
    },
];

export default function GuestLayout({ children }) {
    const [ad] = useState(() => ADS[Math.floor(Math.random() * ADS.length)]);
    const accent = ACCENT[ad.accent] || ACCENT.cyan;

    return (
        <div className="min-h-screen bg-white lg:flex">
            {/* ---- Painel publicitário (esquerda) ---- */}
            <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#0a1c38] via-[#0e2a54] to-[#081428] text-white lg:flex lg:w-[56%]">
                <div aria-hidden className="absolute inset-0">
                    <div className="absolute -left-28 -top-28 h-96 w-96 rounded-full bg-blue-500/25 blur-3xl" />
                    <div className="absolute -bottom-24 right-0 h-[30rem] w-[30rem] rounded-full bg-cyan-400/15 blur-3xl" />
                    <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '28px 28px' }} />
                </div>

                <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
                    {/* marca do anunciante */}
                    <div className="flex items-center gap-3 self-start">
                        {ad.mark === 'studio'
                            ? <img src={logoIcon} alt="" className="h-9 w-9" />
                            : <span className={`grid h-9 w-9 place-items-center rounded-xl ${accent.chip}`}>{MARKS[ad.mark]?.(accent.ink)}</span>}
                        <div className="leading-tight">
                            <div className="text-lg font-bold tracking-tight">{ad.brand}</div>
                            {ad.brandTag && <div className="text-xs text-white/50">{ad.brandTag}</div>}
                        </div>
                    </div>

                    {/* conteúdo da lâmina */}
                    <div className="max-w-xl">
                        {ad.kind === 'ad' && (
                            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">Publicidade</p>
                        )}
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/90">
                            <span className={`h-1.5 w-1.5 rounded-full ${accent.dot}`} /> {ad.eyebrow}
                        </span>
                        <h1 className="mt-7 text-4xl font-bold leading-[1.06] xl:text-5xl">
                            {ad.title[0]}<span className={accent.text}>{ad.title[1]}</span>{ad.title[2]}
                        </h1>
                        <p className="mt-6 max-w-md text-lg leading-relaxed text-white/70">{ad.sub}</p>
                        <div className="mt-9 flex flex-wrap gap-2.5">
                            {ad.pills.map((t) => (
                                <span key={t} className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white/85 backdrop-blur">{t}</span>
                            ))}
                        </div>
                    </div>

                    {/* rodapé do slot */}
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-white/35">
                        <span>Powered by D_Med Clinic</span>
                        <span>Espaço publicitário</span>
                    </div>
                </div>
            </aside>

            {/* ---- Formulário (direita) ---- */}
            <main className="flex flex-1 flex-col items-center justify-center px-5 py-12 sm:px-10">
                <div className="w-full max-w-md">
                    <div className="mb-8 flex justify-center">
                        <Link href="/"><img src={logoHorizontal} alt="D_Med Clinic" className="h-10 w-auto" /></Link>
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
