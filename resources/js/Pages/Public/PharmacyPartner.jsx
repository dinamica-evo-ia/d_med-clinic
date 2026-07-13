import { useForm, usePage, Head } from '@inertiajs/react';

const field = 'w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
const label = 'block text-sm font-medium text-slate-700 mb-1';

const BENEFITS = [
  ['🎙️', 'Med Studio — IA', 'Grava a consulta e já monta a anamnese e a receita.'],
  ['💊', 'Biblioteca de fórmulas', 'O médico busca pela finalidade e prescreve o manipulado.'],
  ['📈', 'Mais receitas', 'Suas fórmulas chegam direto a quem prescreve.'],
];

export default function PharmacyPartner() {
  const { flash } = usePage().props;
  const form = useForm({
    lab_name: '', responsible_name: '', contact_email: '', contact_phone: '',
    file: null, authorized: false, notes: '',
  });

  const submit = (e) => { e.preventDefault(); form.post('/parceria-farmacias', { forceFormData: true }); };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Head title="Parceria com farmácias — D_Med Clinic" />

      {/* Header / pitch */}
      <header className="bg-slate-900 text-white pb-10">
        <div className="max-w-3xl mx-auto px-6 pt-8">
          <div className="flex items-center justify-between gap-3">
            <span className="text-2xl font-extrabold tracking-tight">D_Med <span className="text-blue-400">Clinic</span></span>
            <span className="text-[11px] font-semibold text-blue-200 bg-white/10 rounded-full px-3 py-1">Parceria • Farmácias de manipulação</span>
          </div>
          <p className="text-sm text-slate-400 mt-1">CRM para clínicas médicas · com Inteligência Artificial</p>

          <h1 className="mt-8 text-3xl sm:text-4xl font-extrabold leading-tight">
            Suas fórmulas magistrais,<br /><span className="text-blue-400">na tela do médico.</span>
          </h1>
          <p className="mt-3 text-slate-300 max-w-xl leading-relaxed">
            Cadastramos os manipulados da sua farmácia no D_Med — e o médico prescreve em <strong>1 clique</strong>.
            Mais receitas chegando pra você, com praticidade pro médico.
          </p>
        </div>
      </header>

      {/* Benefits */}
      <section className="max-w-3xl mx-auto px-6 -mt-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {BENEFITS.map(([ic, t, s]) => (
            <div key={t} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="text-2xl">{ic}</div>
              <h3 className="mt-1.5 text-sm font-bold text-slate-800">{t}</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">{s}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Form / success */}
      <section className="max-w-3xl mx-auto px-6 py-10">
        {flash?.success ? (
          <div className="bg-white rounded-2xl border border-emerald-200 p-10 text-center shadow-sm">
            <div className="text-5xl">✅</div>
            <h2 className="mt-4 text-2xl font-bold text-slate-900">Recebido!</h2>
            <p className="mt-2 text-slate-600 max-w-md mx-auto">{flash.success}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Envie suas fórmulas</h2>
            <p className="text-sm text-slate-500 mt-1">Um cadastro rápido + o arquivo das fórmulas. Nossa equipe cuida de importar tudo.</p>

            <form onSubmit={submit} className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={label}>Laboratório / Farmácia *</label>
                  <input value={form.data.lab_name} onChange={e => form.setData('lab_name', e.target.value)} className={field} placeholder="Nome da farmácia de manipulação" />
                  {form.errors.lab_name && <p className="text-xs text-red-600 mt-1">{form.errors.lab_name}</p>}
                </div>
                <div>
                  <label className={label}>Responsável *</label>
                  <input value={form.data.responsible_name} onChange={e => form.setData('responsible_name', e.target.value)} className={field} placeholder="Quem estamos falando" />
                  {form.errors.responsible_name && <p className="text-xs text-red-600 mt-1">{form.errors.responsible_name}</p>}
                </div>
                <div>
                  <label className={label}>E-mail</label>
                  <input type="email" value={form.data.contact_email} onChange={e => form.setData('contact_email', e.target.value)} className={field} placeholder="contato@farmacia.com" />
                  {form.errors.contact_email && <p className="text-xs text-red-600 mt-1">{form.errors.contact_email}</p>}
                </div>
                <div>
                  <label className={label}>Telefone / WhatsApp</label>
                  <input value={form.data.contact_phone} onChange={e => form.setData('contact_phone', e.target.value)} className={field} placeholder="(00) 00000-0000" />
                  {form.errors.contact_phone && <p className="text-xs text-red-600 mt-1">{form.errors.contact_phone}</p>}
                </div>
              </div>

              <div>
                <label className={label}>Arquivo das fórmulas (PDF, Excel ou planilha) *</label>
                <input type="file" accept=".pdf,.xls,.xlsx,.csv,.doc,.docx"
                  onChange={e => form.setData('file', e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 border border-slate-300 rounded-lg p-1.5" />
                {form.errors.file && <p className="text-xs text-red-600 mt-1">{form.errors.file}</p>}
              </div>

              <div>
                <label className={label}>Observações (opcional)</label>
                <textarea rows={3} value={form.data.notes} onChange={e => form.setData('notes', e.target.value)} className={field} placeholder="Algo que a gente deva saber?" />
              </div>

              <label className="flex items-start gap-2.5 text-sm text-slate-600">
                <input type="checkbox" checked={form.data.authorized} onChange={e => form.setData('authorized', e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300" />
                <span>Autorizo o <strong>D_Med Clinic</strong> a cadastrar essas fórmulas no sistema para indicação e prescrição aos pacientes pelos médicos.</span>
              </label>
              {form.errors.authorized && <p className="text-xs text-red-600 -mt-2">{form.errors.authorized}</p>}

              <button type="submit" disabled={form.processing}
                className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition">
                {form.processing ? 'Enviando…' : 'Enviar fórmulas'}
              </button>
            </form>
          </div>
        )}
      </section>

      <footer className="max-w-3xl mx-auto px-6 pb-10 text-center text-sm text-slate-400">
        D_Med Clinic · (47) 99935-9991 · comercial@dinamicami.com.br
      </footer>
    </div>
  );
}
