import { useForm, Link, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState, useRef } from 'react';
import PatientPicker from '@/Components/shared/PatientPicker';

const DAY_KEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const hhmmToMin = (s) => { const [h, m] = String(s).split(':').map(Number); return h * 60 + m; };
const pad = (n) => String(n).padStart(2, '0');
const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

// Mirror de App\Support\DoctorSchedule::violation em JS — feedback imediato no form.
// O backend continua sendo a autoridade final (bloqueio rígido); isto é só UX.
function violation(schedule, startsAt, endsAt) {
    if (!schedule || !startsAt || !endsAt) return null;
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (isNaN(start) || isNaN(end)) return null;
    if (end <= start) return 'O horário final deve ser depois do inicial.';
    if (start.toDateString() !== end.toDateString()) return 'A consulta deve começar e terminar no mesmo dia.';

    const dayCfg = schedule.days?.[DAY_KEY[start.getDay()]];
    if (!dayCfg || !dayCfg.active) return 'O médico não atende neste dia da semana.';

    const startMin = start.getHours() * 60 + start.getMinutes();
    const endMin = end.getHours() * 60 + end.getMinutes();
    const openMin = hhmmToMin(dayCfg.open);
    const closeMin = hhmmToMin(dayCfg.close);
    if (startMin < openMin || endMin > closeMin) {
        return `Fora do expediente (${dayCfg.open}–${dayCfg.close}).`;
    }
    const lunch = dayCfg.lunch;
    if (lunch?.start && lunch?.end) {
        const ls = hhmmToMin(lunch.start), le = hhmmToMin(lunch.end);
        if (startMin < le && endMin > ls) {
            return `Conflita com a pausa de almoço (${lunch.start}–${lunch.end}).`;
        }
    }
    return null;
}

export default function Form({ appointment, patients, doctors, preselectedDoctorId, convenios = [], paymentTypes = ['particular', 'convenio'] }) {
    const isEditing = !!appointment;
    const { props } = usePage();
    const preselectedPatient = props.query?.patient_id || '';
    const [avisoConvenio, setAvisoConvenio] = useState(null);

    // Clínica que aceita uma forma só (nutri particular, p.ex.) não vê o seletor: não há escolha
    // a fazer. Configurável em /atendente. O backend também força, então o campo só vai junto.
    const aceitaConvenio = paymentTypes.includes('convenio');
    const pagamentoUnico = paymentTypes.length === 1 ? paymentTypes[0] : null;

    const { data, setData, post, put, processing, errors } = useForm({
        patient_id: appointment?.patient_id || preselectedPatient || '',
        doctor_id: appointment?.doctor_id || preselectedDoctorId || '',
        starts_at: appointment?.starts_at?.slice(0, 16) || '',
        ends_at: appointment?.ends_at?.slice(0, 16) || '',
        type: appointment?.type || 'consultation',
        payment_type: appointment?.payment_type || pagamentoUnico || 'particular',
        insurance_name: appointment?.insurance_name || '',
        notes: appointment?.notes || '',
    });

    /*
     * Ao escolher o paciente, pré-preenche o pagamento com o convênio do CADASTRO.
     * É sugestão, não decisão: o mesmo paciente pode vir particular hoje mesmo tendo convênio
     * registrado, e a recepção troca com um clique.
     */
    const onPatient = (id, patient) => {
        setData((cur) => {
            const next = { ...cur, patient_id: id };
            if (pagamentoUnico) {
                // Sem escolha: o convênio do cadastro não muda nada aqui.
                next.payment_type = pagamentoUnico;
                next.insurance_name = pagamentoUnico === 'convenio' ? (patient?.insurance_name || '') : '';
            } else if (patient?.insurance_name) {
                next.payment_type = 'convenio';
                next.insurance_name = patient.insurance_name;
            } else if (patient) {
                // paciente sem convênio no cadastro (ou recém-criado): começa particular
                next.payment_type = 'particular';
                next.insurance_name = '';
            }
            return next;
        });
        setAvisoConvenio(patient?.insurance_name && aceitaConvenio ? 'Veio do cadastro do paciente — confirme ou troque.' : null);
    };

    const selectedDoctor = useMemo(() => doctors.find((d) => d.id === data.doctor_id), [doctors, data.doctor_id]);
    const schedule = selectedDoctor?.schedule;
    const warning = useMemo(() => violation(schedule, data.starts_at, data.ends_at), [schedule, data.starts_at, data.ends_at]);

    // Ao trocar a hora de início (e não estiver editando o fim manualmente), sugere o fim com base no slot do médico.
    const onStartChange = (value) => {
        setData((cur) => {
            const next = { ...cur, starts_at: value };
            if (value && schedule?.slot_minutes) {
                const start = new Date(value);
                if (!isNaN(start)) {
                    const end = new Date(start.getTime() + schedule.slot_minutes * 60000);
                    next.ends_at = toLocalInput(end);
                }
            }
            return next;
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEditing) {
            put(`/appointments/${appointment.id}`);
        } else {
            post('/appointments');
        }
    };

    const blocked = !!warning;

    return (
        <div>
            <div className="mb-6">
                <Link href="/appointments" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">← Voltar</Link>
                <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Editar Consulta' : 'Nova Consulta'}</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
                        <PatientPicker
                            value={data.patient_id}
                            initial={patients.find((p) => p.id === data.patient_id) || null}
                            onChange={onPatient}
                        />
                        {errors.patient_id && <p className="text-red-500 text-xs mt-1">{errors.patient_id}</p>}
                    </div>

                    {/* Particular ou convênio — perguntado SEMPRE que a clínica aceita as duas,
                        paciente novo ou antigo. Quando o cadastro tem convênio, já vem marcado;
                        a recepção só confirma. */}
                    {!pagamentoUnico && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pagamento *</label>
                            <div className="flex gap-2">
                                {[['particular', 'Particular'], ['convenio', 'Convênio']].map(([v, label]) => (
                                    <button key={v} type="button"
                                        onClick={() => setData('payment_type', v)}
                                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                                            data.payment_type === v
                                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                                        }`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                            {errors.payment_type && <p className="text-red-500 text-xs mt-1">{errors.payment_type}</p>}
                        </div>
                    )}

                    {data.payment_type === 'convenio' && (
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Qual convênio? *</label>
                            <input list="convenios-conhecidos"
                                value={data.insurance_name}
                                onChange={e => setData('insurance_name', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ex.: Unimed, Bradesco Saúde…" />
                            {/* datalist com os que a clínica já usou — evita 'Unimed'/'unimed'/'UNIMED' */}
                            <datalist id="convenios-conhecidos">
                                {(convenios || []).map((c) => <option key={c} value={c} />)}
                            </datalist>
                            {errors.insurance_name && <p className="text-red-500 text-xs mt-1">{errors.insurance_name}</p>}
                            {avisoConvenio && <p className="mt-1 text-xs text-blue-600">{avisoConvenio}</p>}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Médico *</label>
                        <select value={data.doctor_id} onChange={e => setData('doctor_id', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="">Selecione...</option>
                            {doctors.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                        {errors.doctor_id && <p className="text-red-500 text-xs mt-1">{errors.doctor_id}</p>}
                        {schedule && (
                            <p className="text-xs text-gray-400 mt-1">
                                Consulta padrão: {schedule.slot_minutes} min. Horários fora do expediente do médico serão bloqueados.
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data e Hora Início *</label>
                        <input type="datetime-local" value={data.starts_at} onChange={e => onStartChange(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        {errors.starts_at && <p className="text-red-500 text-xs mt-1">{errors.starts_at}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data e Hora Fim *</label>
                        <input type="datetime-local" value={data.ends_at} onChange={e => setData('ends_at', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        {errors.ends_at && <p className="text-red-500 text-xs mt-1">{errors.ends_at}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                        <select value={data.type} onChange={e => setData('type', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="consultation">Consulta</option>
                            <option value="followup">Retorno</option>
                            <option value="exam">Exame</option>
                            <option value="other">Outro</option>
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                        <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows={3}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                </div>

                {warning && (
                    <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                        ⚠ {warning}
                    </div>
                )}

                {errors.starts_at && !warning && (
                    <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
                        {errors.starts_at}
                    </div>
                )}

                <div className="mt-6 flex gap-3">
                    <button type="submit" disabled={processing || blocked}
                        title={blocked ? warning : undefined}
                        className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        {processing ? 'Salvando...' : 'Salvar'}
                    </button>
                    <Link href="/appointments" className="px-6 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200">
                        Cancelar
                    </Link>
                </div>
            </form>
        </div>
    );
}
