import { useForm, usePage, Head } from '@inertiajs/react';

/* Página pública de parceria com farmácias — mesma comunicação visual da landing
   (dmedclinic.com.br): fundo bone, tipografia Plus Jakarta Sans + Syne, header em
   pílula com logo/menu/CTA idênticos e o rodapé real do site. */

const SITE = 'https://dmedclinic.com.br';
const CRM = 'https://crm.dmedclinic.com.br';
const LOGO_H = CRM + '/landing-assets/dmed-logo-horizontal.png';
const LOGO_V = CRM + '/landing-assets/dmed-logo-vertical.png';

const display = { fontFamily: '"Syne", ui-sans-serif, system-ui, sans-serif' };
const sans = { fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif' };

const NAV = [
  ['Studio Med', SITE + '/#studio-med'],
  ['CRM', SITE + '/#crm'],
  ['Planos', SITE + '/#planos'],
  ['Resultados', SITE + '/#prova'],
];

const BENEFITS = [
  ['🎙️', 'Med Studio — IA', 'Grava a consulta e já monta a anamnese e a receita do paciente.'],
  ['💊', 'Biblioteca de fórmulas', 'O médico busca o manipulado pela finalidade e prescreve em 1 clique.'],
  ['📈', 'Mais receitas', 'Suas fórmulas chegam direto a quem prescreve, no momento da consulta.'],
];

const field = 'w-full rounded-xl border border-[#0d162026] bg-[#f1ece1]/50 px-4 py-2.5 text-sm text-[#0d1620] outline-none transition focus:border-[#102a45] focus:ring-2 focus:ring-[#102a45]/15 placeholder:text-[#0d1620]/35';
const lbl = 'block text-[13px] font-medium text-[#0d1620]/80 mb-1.5';

export default function PharmacyPartner() {
  const { flash } = usePage().props;
  const form = useForm({
    lab_name: '', responsible_name: '', contact_email: '', contact_phone: '',
    file: null, authorized: false, notes: '',
  });
  const submit = (e) => { e.preventDefault(); form.post('/parceria-farmacias', { forceFormData: true }); };

  return (
    <div style={sans} className="min-h-screen bg-[#f1ece1] text-[#0d1620] antialiased">
      <Head title="Parceria com farmácias — D_Med Clinic">
        <link rel="preconnect" href="https://fonts.bunny.net" />
        <link href="https://fonts.bunny.net/css?family=plus-jakarta-sans:400,500,600,700|syne:600,700,800&display=swap" rel="stylesheet" />
      </Head>

      {/* grão sutil (como a landing) */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 opacity-[0.035] mix-blend-multiply"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

      {/* HEADER — pílula idêntica à landing */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-auto max-w-[1500px] px-4 sm:px-6 pt-4">
          <div className="rounded-[26px] bg-[#f1ece1]/85 backdrop-blur-xl border border-[#0d162026] shadow-[0_18px_60px_-30px_rgba(7,22,42,0.35)] pl-3 pr-3 sm:pl-4 sm:pr-4 py-3 flex items-center justify-between gap-4">
            <a href={SITE + '/#top'} className="flex items-center shrink-0 group">
              <img src={LOGO_H} alt="D_Med Clinic" className="h-[27px] sm:h-[35px] md:h-[39px] w-auto object-contain transition-transform group-hover:scale-[1.02]" />
            </a>
            <nav className="hidden lg:flex items-center gap-1 text-[13px] text-[#0d1620]/75 border border-[#0d162026] rounded-full px-1.5 py-1 bg-[#e9e3d4]/40">
              {NAV.map(([t, href]) => (
                <a key={t} href={href} className="px-3.5 py-1.5 rounded-full hover:bg-[#f1ece1] hover:text-[#102a45] transition-colors">{t}</a>
              ))}
            </nav>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <a href={CRM + '/login'} className="hidden sm:inline-flex items-center gap-2 rounded-full border border-[#0d162026] px-4 py-2 text-[12px] font-semibold tracking-[0.22em] uppercase text-[#102a45] hover:bg-[#102a45] hover:text-[#f1ece1] transition-colors">
                <span className="h-1.5 w-1.5 rounded-full bg-[#102a45]/40"></span>Login
              </a>
              <a href={SITE + '/#planos'} className="group inline-flex items-center gap-2.5 rounded-full bg-[#102a45] text-[#f1ece1] pl-4 sm:pl-5 pr-1.5 py-1.5 sm:py-2 text-[12.5px] sm:text-[13px] font-medium hover:bg-[#081627] transition-colors shadow-[0_10px_30px_-12px_rgba(7,22,42,0.55)]">
                <span className="hidden sm:inline">Teste 7 dias grátis</span><span className="sm:hidden">7 dias grátis</span>
                <span className="inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-[#1fb39a] text-[#081627] text-[12px] transition-transform group-hover:translate-x-0.5">→</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1100px] px-5 sm:px-8">
        {/* HERO / pitch */}
        <section className="pt-32 sm:pt-40 pb-4">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#102a45]/70">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1fb39a]"></span>
            Parceria · Farmácias de manipulação
          </div>
          <h1 style={display} className="mt-5 text-4xl sm:text-5xl md:text-[3.4rem] font-bold tracking-tight leading-[1.05] text-[#0d1620]">
            Suas fórmulas magistrais,<br /><span className="text-[#102a45]">na tela do médico.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] sm:text-base text-[#0d1620]/65 leading-relaxed">
            Cadastramos os manipulados da sua farmácia no D_Med Clinic — e o médico prescreve em <strong className="text-[#0d1620]">1 clique</strong>,
            durante a consulta. Mais receitas chegando pra você, com praticidade pra quem prescreve.
          </p>
        </section>

        {/* Benefícios */}
        <section className="grid gap-4 sm:grid-cols-3 py-8">
          {BENEFITS.map(([ic, t, s]) => (
            <div key={t} className="rounded-3xl border border-[#0d162026] bg-[#e9e3d4]/50 p-6">
              <div className="text-2xl">{ic}</div>
              <h3 style={display} className="mt-3 text-lg font-semibold text-[#102a45]">{t}</h3>
              <p className="mt-1.5 text-sm text-[#0d1620]/65 leading-relaxed">{s}</p>
            </div>
          ))}
        </section>

        {/* Formulário / sucesso */}
        <section className="py-8">
          {flash?.success ? (
            <div className="rounded-[28px] border border-[#1fb39a]/40 bg-white/70 backdrop-blur p-10 sm:p-14 text-center shadow-[0_18px_60px_-30px_rgba(7,22,42,0.35)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#1fb39a]/15 text-2xl text-[#1fb39a]">✓</div>
              <h2 style={display} className="mt-5 text-2xl font-bold text-[#0d1620]">Recebido!</h2>
              <p className="mt-3 text-[#0d1620]/65 max-w-md mx-auto leading-relaxed">{flash.success}</p>
              <a href={SITE + '/#top'} className="mt-7 inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#102a45] hover:text-[#081627]">← Voltar ao site</a>
            </div>
          ) : (
            <div className="rounded-[28px] border border-[#0d162026] bg-white/70 backdrop-blur p-6 sm:p-10 shadow-[0_18px_60px_-30px_rgba(7,22,42,0.35)]">
              <h2 style={display} className="text-2xl sm:text-[1.7rem] font-bold text-[#0d1620]">Envie suas fórmulas</h2>
              <p className="mt-2 text-sm text-[#0d1620]/60">Um cadastro rápido + o arquivo das fórmulas. Nossa equipe cuida de importar tudo no sistema.</p>

              <form onSubmit={submit} className="mt-7 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={lbl}>Laboratório / Farmácia *</label>
                    <input value={form.data.lab_name} onChange={e => form.setData('lab_name', e.target.value)} className={field} placeholder="Nome da farmácia de manipulação" />
                    {form.errors.lab_name && <p className="text-xs text-red-600 mt-1">{form.errors.lab_name}</p>}
                  </div>
                  <div>
                    <label className={lbl}>Responsável *</label>
                    <input value={form.data.responsible_name} onChange={e => form.setData('responsible_name', e.target.value)} className={field} placeholder="Com quem falamos" />
                    {form.errors.responsible_name && <p className="text-xs text-red-600 mt-1">{form.errors.responsible_name}</p>}
                  </div>
                  <div>
                    <label className={lbl}>E-mail</label>
                    <input type="email" value={form.data.contact_email} onChange={e => form.setData('contact_email', e.target.value)} className={field} placeholder="contato@farmacia.com" />
                    {form.errors.contact_email && <p className="text-xs text-red-600 mt-1">{form.errors.contact_email}</p>}
                  </div>
                  <div>
                    <label className={lbl}>Telefone / WhatsApp</label>
                    <input value={form.data.contact_phone} onChange={e => form.setData('contact_phone', e.target.value)} className={field} placeholder="(00) 00000-0000" />
                    {form.errors.contact_phone && <p className="text-xs text-red-600 mt-1">{form.errors.contact_phone}</p>}
                  </div>
                </div>

                <div>
                  <label className={lbl}>Arquivo das fórmulas (PDF, Excel ou planilha) *</label>
                  <input type="file" accept=".pdf,.xls,.xlsx,.csv,.doc,.docx"
                    onChange={e => form.setData('file', e.target.files?.[0] || null)}
                    className="w-full text-sm text-[#0d1620]/70 rounded-xl border border-[#0d162026] bg-[#f1ece1]/50 p-1.5 file:mr-3 file:rounded-lg file:border-0 file:bg-[#102a45] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#f1ece1] hover:file:bg-[#081627]" />
                  {form.errors.file && <p className="text-xs text-red-600 mt-1">{form.errors.file}</p>}
                </div>

                <div>
                  <label className={lbl}>Observações (opcional)</label>
                  <textarea rows={3} value={form.data.notes} onChange={e => form.setData('notes', e.target.value)} className={field} placeholder="Algo que a gente deva saber?" />
                </div>

                <label className="flex items-start gap-2.5 text-sm text-[#0d1620]/70">
                  <input type="checkbox" checked={form.data.authorized} onChange={e => form.setData('authorized', e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-[#0d162040] text-[#102a45] focus:ring-[#102a45]/30" />
                  <span>Autorizo o <strong className="text-[#0d1620]">D_Med Clinic</strong> a cadastrar essas fórmulas no sistema para indicação e prescrição aos pacientes pelos médicos.</span>
                </label>
                {form.errors.authorized && <p className="text-xs text-red-600 -mt-2">{form.errors.authorized}</p>}

                <button type="submit" disabled={form.processing}
                  className="group inline-flex items-center gap-3 rounded-full bg-[#102a45] text-[#f1ece1] pl-6 pr-2 py-2.5 text-sm font-medium hover:bg-[#081627] disabled:opacity-60 transition-colors shadow-[0_10px_30px_-12px_rgba(7,22,42,0.55)]">
                  {form.processing ? 'Enviando…' : 'Enviar fórmulas'}
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1fb39a] text-[#081627] transition-transform group-hover:translate-x-0.5">→</span>
                </button>
              </form>
            </div>
          )}
        </section>
      </main>

      {/* FOOTER — igual ao da landing */}
      <footer className="relative z-10 bg-[#f1ece1] py-14 mt-6">
        <div className="mx-auto max-w-[1100px] px-5 sm:px-8">
          <div className="grid grid-cols-12 gap-y-10">
            <div className="col-span-12 md:col-span-5">
              <img src={LOGO_V} alt="D_Med Clinic" className="h-[8.4rem] w-auto" />
            </div>
            <nav className="col-span-6 md:col-span-3 text-[13px] space-y-2 text-[#0d1620]/65">
              <div className="text-[10.5px] uppercase tracking-widest text-[#0d1620]/40 mb-3">Produto</div>
              <a href={SITE + '/#studio-med'} className="block hover:text-[#102a45]">Studio Med</a>
              <a href={SITE + '/#crm'} className="block hover:text-[#102a45]">CRM Clinic</a>
              <a href={SITE + '/#planos'} className="block hover:text-[#102a45]">Planos</a>
            </nav>
            <nav className="col-span-6 md:col-span-2 text-[13px] space-y-2 text-[#0d1620]/65">
              <div className="text-[10.5px] uppercase tracking-widest text-[#0d1620]/40 mb-3">Empresa</div>
              <a href={SITE + '/#prova'} className="block hover:text-[#102a45]">Resultados</a>
              <a href={CRM + '/login'} className="block hover:text-[#102a45]">Login</a>
              <a href={SITE + '/#planos'} className="block hover:text-[#102a45]">Teste grátis</a>
            </nav>
            <div className="col-span-12 md:col-span-2 text-[13px] text-[#0d1620]/65">
              <div className="text-[10.5px] uppercase tracking-widest text-[#0d1620]/40 mb-3">Falar com a gente</div>
              <a href="mailto:comercial@dinamicami.com.br" className="block hover:text-[#102a45]">comercial@dinamicami.com.br</a>
              <a href="https://wa.me/5547999359991" className="block hover:text-[#102a45] mt-1">(47) 99935-9991</a>
            </div>
          </div>
          <div className="mt-14 border-t border-[#0d162026] pt-6 flex flex-wrap items-center justify-between gap-4 text-[11px] uppercase tracking-widest text-[#0d1620]/40">
            <span>© 2026 D_Med · Todos os direitos reservados</span>
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#1fb39a]"></span> feito no Brasil, para médicos brasileiros</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
