import { Link } from '@inertiajs/react';

export default function Index({ counts }) {
  const topics = [
    {
      key: 'patients',
      title: 'Pacientes',
      description: 'Ficha de pacientes — nome, contato, CPF, endereço, convênio.',
      count: counts.patients,
      importHref: '/patients-import',
      canImport: true,
    },
    {
      key: 'medical_records',
      title: 'Anamneses',
      description: 'Histórico de consultas/anamneses por paciente e profissional.',
      count: counts.medical_records,
      importHref: '/account/settings/import-export/medical-records',
      canImport: true,
    },
    {
      key: 'prescriptions',
      title: 'Receitas',
      description: 'Receitas/prescrições emitidas, com conteúdo e observações.',
      count: counts.prescriptions,
      importHref: '/account/settings/import-export/prescriptions',
      canImport: true,
    },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Importar & Exportar</h1>
        <p className="text-sm text-slate-500 mt-1">Traga dados de outro sistema pra dentro da clínica, organizados por tipo. Exportação chega em breve para cada um destes tópicos.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {topics.map((t) => (
          <div key={t.key} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{t.title}</h2>
                <p className="text-xs text-slate-500 mt-1">{t.description}</p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 whitespace-nowrap">{t.count} hoje</span>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
              {t.canImport ? (
                <Link href={t.importHref} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700">
                  Importar CSV
                </Link>
              ) : (
                <span className="px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-medium rounded-lg">Importar (em breve)</span>
              )}
              <span className="px-3 py-1.5 bg-slate-50 text-slate-400 text-xs font-medium rounded-lg border border-slate-100">Exportar (em breve)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
