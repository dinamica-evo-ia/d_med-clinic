import { Link, router, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';

const UF = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const COUNCILS = ['CRM','CRO','CRF','CRP','CRN','CREFITO','CRMV','CRBM','COREN','CRFa'];
const PREFIXES = ['Dr.','Dra.'];
const PATIENT_FIELDS = [
  ['nome', 'Nome'], ['cpf', 'CPF'], ['rg', 'RG'],
  ['prontuario', 'Nº Prontuário'], ['contato', 'Contato'], ['endereco', 'Endereço'],
];

function Toggle({ on, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <button type="button" onClick={() => onChange(!on)}
        className={`relative h-5 w-9 rounded-full transition ${on ? 'bg-blue-600' : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${on ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
      {label && <span className="text-sm text-slate-700">{label}</span>}
    </label>
  );
}

const inp = "border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";

export default function Print() {
  const { doctors = [], doctor, settings, flash } = usePage().props;
  const [s, setS] = useState(settings);
  const [preview, setPreview] = useState(false);
  const logoRef = useRef(null);

  const top = (k, v) => setS((p) => ({ ...p, [k]: v }));
  const hdr = (k, v) => setS((p) => ({ ...p, header: { ...p.header, [k]: v } }));
  const pat = (k, v) => setS((p) => ({ ...p, patient_data: { ...p.patient_data, [k]: v } }));
  const patField = (f, v) => setS((p) => ({ ...p, patient_data: { ...p.patient_data, fields: { ...p.patient_data.fields, [f]: v } } }));
  const foot = (k, v) => setS((p) => ({ ...p, footer: { ...p.footer, [k]: v } }));

  const onSelectDoctor = (id) => router.get('/account/settings/print', { doctor_id: id }, { preserveState: false });

  const save = () => {
    router.put('/account/settings/print', { doctor_id: doctor.id, settings: s }, { preserveScroll: true });
  };

  const uploadLogo = (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('doctor_id', doctor.id);
    fd.append('logo', file);
    router.post('/account/settings/print/logo', fd, { forceFormData: true, preserveScroll: true });
  };

  const removeLogo = () => router.delete('/account/settings/print/logo', { data: { doctor_id: doctor.id }, preserveScroll: true });

  if (!doctor) {
    return (
      <div className="max-w-3xl mx-auto">
        <Link href="/account/settings/doctor" className="text-sm text-slate-500 hover:text-slate-800">← Voltar</Link>
        <p className="mt-4 text-slate-600">Cadastre um médico para configurar a impressão do prontuário.</p>
      </div>
    );
  }

  if (preview) {
    return <PreviewSheet s={s} doctorName={doctor.name} onClose={() => setPreview(false)} />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Link href="/account/settings/doctor" className="text-sm text-slate-500 hover:text-slate-800">← Voltar</Link>

      {flash?.success && <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700">{flash.success}</div>}

      <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-center text-sm text-amber-800">
        Sua impressora deve estar configurada com margens = <strong>nenhuma</strong> e escala = <strong>100%</strong>. Tecle <strong>CTRL + P</strong> para abrir as configurações da sua impressora.
      </div>

      {/* Barra superior */}
      <div className="flex flex-wrap items-end gap-4 justify-between">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Título</label>
            <input value={s.title} onChange={(e) => top('title', e.target.value)} placeholder="Modelo de impressão" className={`${inp} w-56`} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Tipo de impressão</label>
            <select value={s.print_type} onChange={(e) => top('print_type', e.target.value)} className={`${inp} w-44`}>
              <option value="padrao">Padrão</option>
              <option value="compacto">Compacto</option>
              <option value="receituario">Receituário</option>
            </select>
          </div>
          {doctors.length > 1 && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Médico</label>
              <select value={doctor.id} onChange={(e) => onSelectDoctor(e.target.value)} className={`${inp} w-52`}>
                {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setPreview(true)} className="text-sm font-semibold text-slate-600 hover:text-slate-900 uppercase tracking-wide">Visualizar</button>
          <button onClick={save} className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 uppercase tracking-wide">Salvar</button>
        </div>
      </div>

      {/* "Folha" — editor visual */}
      <div className="bg-slate-100 rounded-2xl p-6">
        <div className="mx-auto bg-white shadow-sm border border-slate-200" style={{ maxWidth: 700, minHeight: 560 }}>
          {/* Cabeçalho */}
          <div className="border-b border-dashed border-slate-300 p-4">
            <div className="flex items-center justify-between gap-4 mb-3">
              <Toggle on={s.header.logo_left} onChange={(v) => hdr('logo_left', v)} label="Logotipo" />
              <Toggle on={s.header.show_header} onChange={(v) => hdr('show_header', v)} label="Cabeçalho" />
              <Toggle on={s.header.logo_right} onChange={(v) => hdr('logo_right', v)} label="Logotipo" />
            </div>

            {s.header.show_header && (
              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <select value={s.header.prefix} onChange={(e) => hdr('prefix', e.target.value)} className={inp}>
                      {PREFIXES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <input value={s.header.name} onChange={(e) => hdr('name', e.target.value)} placeholder="Nome do profissional" className={`${inp} flex-1 font-semibold`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <input value={s.header.specialty} onChange={(e) => hdr('specialty', e.target.value)} placeholder="Especialidade" className={`${inp} flex-1`} />
                    <span className="text-xs text-slate-500">RQE:</span>
                    <input value={s.header.rqe} onChange={(e) => hdr('rqe', e.target.value)} placeholder="Digite" className={`${inp} w-24`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">CPF:</span>
                    <input value={s.header.cpf} onChange={(e) => hdr('cpf', e.target.value)} className={`${inp} w-44`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={s.header.council} onChange={(e) => hdr('council', e.target.value)} className={inp}>
                      {COUNCILS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input value={s.header.council_number} onChange={(e) => hdr('council_number', e.target.value)} placeholder="Número" className={`${inp} w-28`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Telefones:</span>
                    <input value={s.header.phones} onChange={(e) => hdr('phones', e.target.value)} className={`${inp} flex-1`} />
                  </div>
                  <input value={s.header.address} onChange={(e) => hdr('address', e.target.value)} placeholder="Endereço" className={`${inp} w-full`} />
                  <div className="flex items-center gap-2">
                    <input value={s.header.city} onChange={(e) => hdr('city', e.target.value)} placeholder="Cidade" className={`${inp} flex-1`} />
                    <span className="text-slate-400">-</span>
                    <select value={s.header.state} onChange={(e) => hdr('state', e.target.value)} className={inp}>
                      <option value="">UF</option>
                      {UF.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>
                </div>

                {(s.header.logo_left || s.header.logo_right) && (
                  <div className="w-52 shrink-0">
                    {s.header.logo_url ? (
                      <div className="text-center">
                        <img src={s.header.logo_url} alt="Logo" className="max-h-24 mx-auto object-contain border border-slate-200 rounded p-1" />
                        <div className="mt-2 flex items-center justify-center gap-2">
                          <button onClick={() => logoRef.current?.click()} className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200">Alterar logo</button>
                          <button onClick={removeLogo} className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">Remover</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => logoRef.current?.click()} className="w-full h-28 border-2 border-dashed border-slate-300 rounded-lg grid place-items-center text-center text-xs text-slate-500 hover:bg-slate-50">
                        <span>⬆<br/>Clique para adicionar uma imagem</span>
                      </button>
                    )}
                    <p className="mt-2 text-[10px] text-slate-400 text-center leading-tight">Dimensão: 233 x 113 px<br/>Tipos: jpg ou png · máx 5MB</p>
                    <input ref={logoRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => uploadLogo(e.target.files?.[0])} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Título */}
          <div className="border-b border-dashed border-slate-300 px-4 py-3 flex items-center gap-3">
            <Toggle on={s.show_title} onChange={(v) => top('show_title', v)} />
            <span className="text-base font-semibold text-slate-800">{s.title || 'Título'}</span>
          </div>

          {/* Dados do paciente */}
          <div className="border-b border-dashed border-slate-300 p-4">
            <Toggle on={s.patient_data.enabled} onChange={(v) => pat('enabled', v)} label="Dados do paciente" />
            {s.patient_data.enabled && (
              <div className="mt-2 ml-1 grid grid-cols-2 gap-x-6 gap-y-1 max-w-md">
                {PATIENT_FIELDS.map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={!!s.patient_data.fields[key]} onChange={(e) => patField(key, e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    {label}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Corpo (placeholder) */}
          <div className="px-4 py-8 text-center text-xs text-slate-300 italic">— corpo do prontuário —</div>

          {/* Assinatura */}
          <div className="px-4 pb-4">
            <div className="ml-auto w-72 border border-slate-200 rounded">
              <div className="px-3 py-2 border-b border-slate-100"><Toggle on={s.signature} onChange={(v) => top('signature', v)} label="Assinatura" /></div>
              {s.signature && <div className="px-3 py-6 text-center text-sm text-slate-400">Campo de assinatura</div>}
            </div>
          </div>

          {/* Rodapé */}
          <div className="border-t border-dashed border-slate-300 p-4 space-y-2">
            <Toggle on={s.footer.enabled} onChange={(v) => foot('enabled', v)} label="Rodapé" />
            {s.footer.enabled && (
              <input value={s.footer.text} onChange={(e) => foot('text', e.target.value)} placeholder="Texto do rodapé" className={`${inp} w-full bg-slate-50`} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Prévia limpa pra impressão (Ctrl+P) */
function PreviewSheet({ s, doctorName, onClose }) {
  const h = s.header;
  const sampleAddr = [h.address, [h.city, h.state].filter(Boolean).join('/')].filter(Boolean).join(' - ');
  return (
    <div>
      <style>{`@media print { .no-print { display: none !important; } .print-sheet { box-shadow: none !important; border: none !important; margin: 0 !important; } body { background: #fff; } }`}</style>
      <div className="no-print flex items-center justify-between mb-4">
        <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-800">← Voltar à configuração</button>
        <button onClick={() => window.print()} className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">Imprimir</button>
      </div>

      <div className="print-sheet mx-auto bg-white shadow border border-slate-200 p-8 text-slate-900" style={{ maxWidth: 760, minHeight: 900 }}>
        {h.show_header && (
          <div className="flex items-start justify-between gap-6 border-b border-slate-300 pb-4">
            <div className="text-sm leading-snug">
              <p className="font-bold text-base">{h.prefix} {h.name || doctorName}</p>
              {(h.specialty || h.rqe) && <p>{h.specialty}{h.rqe ? ` · RQE: ${h.rqe}` : ''}</p>}
              {h.cpf && <p>CPF: {h.cpf}</p>}
              {h.council_number && <p>{h.council}: {h.council_number}</p>}
              {h.phones && <p>Telefones: {h.phones}</p>}
              {sampleAddr && <p>{sampleAddr}</p>}
            </div>
            {(h.logo_left || h.logo_right) && h.logo_url && (
              <img src={h.logo_url} alt="Logo" className="max-h-24 object-contain shrink-0" />
            )}
          </div>
        )}

        {s.show_title && <h1 className="text-center text-lg font-bold my-5">{s.title || 'Título'}</h1>}

        {s.patient_data.enabled && (
          <div className="text-sm border border-slate-300 rounded p-3 mb-5 grid grid-cols-2 gap-x-6 gap-y-1">
            {s.patient_data.fields.nome && <p><strong>Nome:</strong> Paciente Exemplo</p>}
            {s.patient_data.fields.cpf && <p><strong>CPF:</strong> 000.000.000-00</p>}
            {s.patient_data.fields.rg && <p><strong>RG:</strong> 0.000.000</p>}
            {s.patient_data.fields.prontuario && <p><strong>Nº Prontuário:</strong> 0000</p>}
            {s.patient_data.fields.contato && <p><strong>Contato:</strong> (00) 00000-0000</p>}
            {s.patient_data.fields.endereco && <p className="col-span-2"><strong>Endereço:</strong> Rua Exemplo, 000 - Centro</p>}
          </div>
        )}

        <div className="text-sm min-h-[280px] text-slate-400 italic">
          (Conteúdo do prontuário aparece aqui na impressão real.)
        </div>

        {s.signature && (
          <div className="mt-16 ml-auto w-72 text-center">
            <div className="border-t border-slate-500 pt-1 text-sm">{h.prefix} {h.name || doctorName}</div>
          </div>
        )}

        {s.footer.enabled && s.footer.text && (
          <div className="mt-8 pt-3 border-t border-slate-300 text-center text-xs text-slate-500">{s.footer.text}</div>
        )}
      </div>
    </div>
  );
}
