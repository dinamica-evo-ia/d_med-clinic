import CsvImportPanel from '@/Components/Import/CsvImportPanel';
import { useState } from 'react';

export default function Formulas({ counts }) {
  const [category, setCategory] = useState('manipulado');
  const total = (counts?.manipulado ?? 0) + (counts?.industrializado ?? 0);

  const TABS = [
    ['manipulado', `Manipulados (${counts?.manipulado ?? 0})`],
    ['industrializado', `Industrializados (${counts?.industrializado ?? 0})`],
  ];

  return (
    <CsvImportPanel
      backHref="/account/settings/import-export"
      backLabel="Importar & Exportar"
      title="Importar Fórmulas (CSV)"
      existing={total}
      existingLabel="A clínica já tem"
      previewUrl="/account/settings/import-export/formulas/preview"
      storeUrl="/account/settings/import-export/formulas"
      extraData={{ category }}
      extraFields={
        <div>
          <span className="text-sm font-semibold text-slate-700">Categoria destas fórmulas</span>
          <div className="mt-2 flex gap-1 rounded-lg bg-slate-100 p-1 max-w-md">
            {TABS.map(([k, label]) => (
              <button key={k} type="button" onClick={() => setCategory(k)}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${category === k ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            Se o CSV tiver uma coluna <code>Categoria</code>, ela vale por linha; senão, tudo entra como a categoria escolhida aqui.
          </p>
        </div>
      }
      confirmLabel={(n) => `Confirmar e importar ${n} fórmula(s)`}
      columns={[
        { key: 'purpose', label: 'Finalidade', render: (r) => r.purpose || '—' },
        { key: 'name', label: 'Nome / ativos' },
        { key: 'content_preview', label: 'Composição' },
        { key: 'form', label: 'Forma', render: (r) => r.form || '—' },
        { key: 'route', label: 'Via', render: (r) => r.route || '—' },
        {
          key: 'ok', label: 'Status', render: (r) => r.ok
            ? <span className="text-emerald-600 font-medium">OK</span>
            : <span className="text-rose-600 font-medium">Falta nome/composição</span>,
        },
      ]}
      warnings={(p) => (p.invalid > 0 || p.unmapped?.length > 0) && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 space-y-1">
          {p.invalid > 0 && <p><strong>{p.invalid} linha(s)</strong> sem nome ou sem composição — serão ignoradas na importação.</p>}
          {p.unmapped?.length > 0 && <p>Colunas não reconhecidas (serão ignoradas): {p.unmapped.join(', ')}.</p>}
        </div>
      )}
      hints={<>
        <p className="text-sm text-slate-600">
          CSV com as colunas: <code>Finalidade</code> (pra que serve), <code>Nome</code> (ativos), <code>Composição</code>, <code>Forma</code>, <code>Via</code> e, opcionalmente, <code>Categoria</code>.
        </p>
        <p className="text-xs text-slate-500">
          Só <strong>Nome</strong> e <strong>Composição</strong> são obrigatórios — o resto é opcional. Aceita separador <code>;</code> ou <code>,</code> e acentuação de sistemas antigos (ISO-8859-1). Fórmula com o mesmo nome na mesma categoria não é duplicada. A <strong>Finalidade</strong> é o que o médico usa pra buscar na receita — vale a pena preencher.
        </p>
      </>}
    />
  );
}
