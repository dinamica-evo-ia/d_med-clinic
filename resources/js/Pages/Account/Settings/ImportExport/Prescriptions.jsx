import CsvImportPanel from '@/Components/Import/CsvImportPanel';

export default function Prescriptions({ existing }) {
  return (
    <CsvImportPanel
      backHref="/account/settings/import-export"
      backLabel="Importar & Exportar"
      title="Importar Receitas (CSV)"
      existing={existing}
      existingLabel="A clínica já tem"
      previewUrl="/account/settings/import-export/prescriptions/preview"
      storeUrl="/account/settings/import-export/prescriptions"
      confirmLabel={(n) => `Confirmar e importar ${n} receita(s)`}
      columns={[
        { key: 'patient_name', label: 'Paciente' },
        { key: 'doctor_name', label: 'Profissional', render: (r) => r.doctor_name || '— (será criado)' },
        { key: 'created_at', label: 'Data' },
        { key: 'content_preview', label: 'Conteúdo' },
        { key: 'patient_found', label: 'Status', render: (r) => r.patient_found
          ? <span className="text-emerald-600 font-medium">OK</span>
          : <span className="text-rose-600 font-medium">Paciente não encontrado</span> },
      ]}
      warnings={(preview) => preview.unmatched_patients > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
          <strong>{preview.unmatched_patients} linha(s)</strong> referenciam um paciente que não foi encontrado pelo nome — serão ignoradas na importação. Importe a lista de Pacientes antes, se ainda não importou.
        </div>
      )}
      hints={<>
        <p className="text-sm text-slate-600">CSV com colunas: <code>Paciente</code>, <code>Profissional</code>, <code>Conteúdo</code> (texto livre da receita), <code>Observações</code> e <code>Data de criação</code>.</p>
        <p className="text-xs text-slate-500">O conteúdo (geralmente em HTML, ex.: fórmulas manipuladas) é convertido pra texto simples e guardado nas observações do medicamento da receita — fica disponível pra consulta e impressão, mesmo sem os campos estruturados (dosagem, via, frequência). Pacientes são localizados pelo nome — importe a lista de Pacientes antes desta.</p>
      </>}
    />
  );
}
