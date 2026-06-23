import CsvImportPanel from '@/Components/Import/CsvImportPanel';

export default function MedicalRecords({ existing }) {
  return (
    <CsvImportPanel
      backHref="/account/settings/import-export"
      backLabel="Importar & Exportar"
      title="Importar Anamneses (CSV)"
      existing={existing}
      existingLabel="A clínica já tem"
      previewUrl="/account/settings/import-export/medical-records/preview"
      storeUrl="/account/settings/import-export/medical-records"
      confirmLabel={(n) => `Confirmar e importar ${n} anamnese(s)`}
      columns={[
        { key: 'patient_name', label: 'Paciente' },
        { key: 'doctor_name', label: 'Profissional', render: (r) => r.doctor_name || '— (será criado)' },
        { key: 'created_at', label: 'Data' },
        { key: 'has_content', label: 'Conteúdo', render: (r) => r.has_content ? 'Sim' : 'Apenas metadados' },
        { key: 'patient_found', label: 'Status', render: (r) => r.patient_found
          ? <span className="text-emerald-600 font-medium">OK</span>
          : <span className="text-rose-600 font-medium">Paciente não encontrado</span> },
      ]}
      warnings={(preview) => (
        <>
          {preview.unmatched_patients > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              <strong>{preview.unmatched_patients} linha(s)</strong> referenciam um paciente que não foi encontrado pelo nome — serão ignoradas na importação. Importe a lista de Pacientes antes, se ainda não importou.
            </div>
          )}
          {preview.without_content > 0 && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
              <strong>{preview.without_content} linha(s)</strong> não trazem o texto da anamnese neste arquivo — serão importadas como registro histórico (paciente, profissional e data preservados), apenas sem o conteúdo da consulta.
            </div>
          )}
        </>
      )}
      hints={<>
        <p className="text-sm text-slate-600">CSV com colunas: <code>Paciente</code>, <code>Profissional</code>, <code>Data de criação</code> e, se o export do seu sistema anterior trouxer, <code>Conteúdo</code>/<code>Anamnese</code>/<code>Texto</code> com o conteúdo da consulta.</p>
        <p className="text-xs text-slate-500">Pacientes são localizados pelo nome — importe a lista de Pacientes antes desta. Profissionais ainda não cadastrados são criados automaticamente. Importar o mesmo arquivo de novo não duplica os registros já importados.</p>
      </>}
    />
  );
}
