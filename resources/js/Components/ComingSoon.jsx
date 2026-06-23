import { Link, usePage } from '@inertiajs/react';

export default function ComingSoon({ title, description, features = [], back = '/' }) {
  const { auth } = usePage().props;
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href={back} className="text-sm text-slate-500 hover:text-slate-800">← Voltar</Link>
      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 grid place-items-center text-xl">⏳</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Em breve</span>
            </div>
            <p className="mt-2 text-slate-600">{description}</p>
            {features.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">O que vai ter</p>
                <ul className="space-y-1.5">
                  {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="text-emerald-500 mt-0.5">✓</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
              Quer adiantar ou opinar nessa feature? Use a área <Link href="/account/suggestions" className="text-blue-600 hover:text-blue-800 font-medium">Sugestões</Link> e nos avise.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
