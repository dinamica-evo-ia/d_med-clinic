import { Link, usePage } from '@inertiajs/react';

const dt = (s) => s ? new Date(String(s).replace(' ', 'T')).toLocaleDateString('pt-BR') : '';

// wa.me exige só dígitos, com DDI. Assume Brasil (55) quando o número vier sem.
function waNumber(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (!d.startsWith('55') && (d.length === 10 || d.length === 11)) d = '55' + d;
  return d;
}

function receitaTexto({ s, prescription, clinicName }) {
  const { patient, doctor, medicines, notes, created_at } = prescription;
  const h = s.header;
  const council = h.council_number || doctor?.license_number;
  const L = [];
  L.push(`*${s.title || 'Receita médica'}*`);
  L.push('');
  L.push(`${h.prefix || ''} ${h.name || doctor?.name || ''}`.trim());
  if (council) L.push(`${h.council}: ${council}`);
  L.push('');
  if (patient?.name) L.push(`Paciente: ${patient.name}`);
  if (created_at) L.push(`Data: ${dt(created_at)}`);
  L.push('');
  L.push('Prescrição:');
  (medicines || []).forEach((m, i) => {
    let line = `${i + 1}. ${m.medication || ''}${m.dosage ? ` — ${m.dosage}` : ''}`;
    const det = [m.route && `Via: ${m.route}`, m.frequency && `Freq: ${m.frequency}`, m.duration && `Duração: ${m.duration}`, m.quantity && `Qtd: ${m.quantity}`].filter(Boolean).join(' · ');
    if (det) line += `\n   ${det}`;
    if (m.notes) line += `\n   Obs: ${m.notes}`;
    L.push(line);
  });
  if (notes) { L.push(''); L.push(`Observações: ${notes}`); }
  L.push('');
  if (s.footer?.enabled && s.footer.text) L.push(s.footer.text);
  else L.push(clinicName);
  return L.join('\n');
}

export default function Print({ prescription, settings }) {
  const { tenant } = usePage().props;
  const s = settings;
  const h = s.header;
  const { patient, doctor, medicines, notes, created_at } = prescription;
  const clinicName = tenant?.name || 'D_Med Clinic';

  const texto = receitaTexto({ s, prescription, clinicName });
  const waNum = waNumber(patient?.whatsapp || patient?.phone);
  const waUrl = `https://wa.me/${waNum}?text=${encodeURIComponent(texto)}`;
  const mailUrl = `mailto:${patient?.email || ''}?subject=${encodeURIComponent(s.title || 'Receita médica')}&body=${encodeURIComponent(texto)}`;

  const addr = [h.address, [h.city, h.state].filter(Boolean).join('/')].filter(Boolean).join(' - ');
  const F = s.patient_data.fields;

  return (
    <div>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .sheet { box-shadow: none !important; border: none !important; margin: 0 !important; max-width: 100% !important; }
          body { background: #fff; }
          @page { margin: 12mm; }
        }
      `}</style>

      {/* Barra de ações (não imprime) */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <Link href={`/prescriptions/${prescription.id}`} className="text-sm text-slate-500 hover:text-slate-800">← Voltar</Link>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9V3h12v6M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z" /></svg>
            Imprimir
          </button>
          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
            WhatsApp
          </a>
          <a href={mailUrl} className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M3 8v10a1 1 0 001 1h16a1 1 0 001-1V8M3 8l1-2h16l1 2" /></svg>
            E-mail
          </a>
        </div>
      </div>

      {/* Folha da receita */}
      <div className="bg-slate-100 py-6">
        <div className="sheet mx-auto bg-white shadow border border-slate-200 p-10 text-slate-900" style={{ maxWidth: 760, minHeight: 1000 }}>
          {h.show_header && (
            <div className="flex items-start justify-between gap-6 border-b border-slate-300 pb-4">
              {h.logo_left && h.logo_url && <img src={h.logo_url} alt="" className="max-h-20 object-contain shrink-0" />}
              <div className="text-sm leading-snug flex-1">
                <p className="font-bold text-base">{h.prefix} {h.name || doctor?.name}</p>
                {(h.specialty || h.rqe || doctor?.specialty) && <p>{h.specialty || doctor?.specialty}{h.rqe ? ` · RQE: ${h.rqe}` : ''}</p>}
                {(h.cpf || doctor?.document) && <p>CPF: {h.cpf || doctor?.document}</p>}
                {(h.council_number || doctor?.license_number) && <p>{h.council}: {h.council_number || doctor?.license_number}</p>}
                {(h.phones || doctor?.phone) && <p>Telefones: {h.phones || doctor?.phone}</p>}
                {addr && <p>{addr}</p>}
              </div>
              {h.logo_right && h.logo_url && <img src={h.logo_url} alt="" className="max-h-20 object-contain shrink-0" />}
            </div>
          )}

          {s.show_title && <h1 className="text-center text-lg font-bold my-6 uppercase tracking-wide">{s.title || 'Receita médica'}</h1>}

          <div className="text-right text-sm mb-4">{dt(created_at)}</div>

          {s.patient_data.enabled && (
            <div className="text-sm border border-slate-300 rounded p-3 mb-6 grid grid-cols-2 gap-x-6 gap-y-1">
              {F.nome && <p><strong>Paciente:</strong> {patient?.name || '—'}</p>}
              {F.cpf && <p><strong>CPF:</strong> {patient?.document || '—'}</p>}
              {F.rg && <p><strong>RG:</strong> {patient?.rg || '—'}</p>}
              {F.prontuario && <p><strong>Nº Prontuário:</strong> {patient?.id?.slice(0, 8) || '—'}</p>}
              {F.contato && <p><strong>Contato:</strong> {patient?.phone || patient?.whatsapp || '—'}</p>}
              {F.endereco && <p className="col-span-2"><strong>Endereço:</strong> {[patient?.address?.street, patient?.address?.number, patient?.address?.neighborhood, patient?.address?.city].filter(Boolean).join(', ') || '—'}</p>}
            </div>
          )}

          <p className="text-sm font-semibold mb-3">Prescrevo o(s) seguinte(s) medicamento(s):</p>
          <div className="space-y-4 min-h-[260px]">
            {(medicines || []).map((med, i) => (
              <div key={i} className="text-sm">
                <p className="font-semibold">{i + 1}. {med.medication}{med.dosage ? ` — ${med.dosage}` : ''}</p>
                <div className="ml-4 text-slate-700">
                  {med.route && <span className="block">Via: {med.route}</span>}
                  {med.frequency && <span className="block">Frequência: {med.frequency}</span>}
                  {med.duration && <span className="block">Duração: {med.duration}</span>}
                  {med.quantity && <span className="block">Quantidade: {med.quantity}</span>}
                  {med.notes && <span className="block">Obs: {med.notes}</span>}
                </div>
              </div>
            ))}
          </div>

          {notes && <p className="text-sm italic mt-4"><strong>Observações:</strong> {notes}</p>}

          {s.signature && (
            <div className="mt-20 ml-auto w-72 text-center">
              <div className="border-t border-slate-500 pt-1 text-sm">{h.prefix} {h.name || doctor?.name}</div>
              {h.council_number && <div className="text-xs text-slate-500">{h.council}: {h.council_number}</div>}
            </div>
          )}

          {s.footer.enabled && s.footer.text && (
            <div className="mt-10 pt-3 border-t border-slate-300 text-center text-xs text-slate-500">{s.footer.text}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Página standalone (sem sidebar do AppLayout) — passthrough porque o app.jsx usa `|| AppLayout` (null seria ignorado).
Print.layout = (page) => page;
