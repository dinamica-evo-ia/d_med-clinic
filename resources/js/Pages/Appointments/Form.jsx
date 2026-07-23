import { useForm, Link, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState, useRef } from 'react';
import PatientPicker from '@/Components/shared/PatientPicker';

const DAY_KEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const hhmmToMin = (s) => { const [h, m] = String(s).split(':').map(Number); return h * 60 + m; };
const pad = (n) => String(n).padStart(2, '0');
const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

// Mirror de App\Support\DoctorSchedule::violation em JS — feedback imediato no form.
// O backend continua sendo a autoridade final (bloqueio rígido); isto é só UX.
function violation(schedule, startsAt, endsAt, exceptions = {}) {
    if (!schedule || !startsAt || !endsAt) return null;
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (isNaN(start) || isNaN(end)) return null;
    if (end <= start) return 'O horário final deve ser depois do inicial.';
    if (start.toDateString() !== end.toDateString()) return 'A consulta deve começar e terminar no mesmo dia.';

    // Exceção da data ("abri este sábado") manda; sem exceção, vale a regra da semana.
    const ymd = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    const padrao = schedule.days?.[DAY_KEY[start.getDay()]];
    const dayCfg = exceptions?.[ymd] || padrao;
    if (!dayCfg || !dayCfg.active) {
        return exceptions?.[ymd]
            ? 'Este dia está bloqueado na agenda.'
            : 'O médico não atende neste dia da semana.';
    }

    const startMin = start.getHours() * 60 + start.getMinutes();
    const endMin = end.getHours() * 60 + end.getMinutes();

    // A consulta tem que caber INTEIRA dentro de UM período. Assim o intervalo entre
    // períodos (almoço) fica bloqueado sozinho, sem precisar de regra própria.
    const periods = dayCfg.periods || [];
    const cabe = periods.some((p) => startMin >= hhmmToMin(p.start) && endMin <= hhmmToMin(p.end));
    if (!cabe) {
        const faixas = periods.map((p) => `${p.start}–${p.end}`).join(', ');
        return `Fora do horário de atendimento (${faixas}).`;
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
    const [pacienteNome, setPacienteNome] = useState(
        patients.find((p) => p.id === (appointment?.patient_id || preselectedPatient))?.name || '',
    );

    const onPatient = (id, patient) => {
        setPacienteNome(patient?.name || '');
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
    // Convênios que ESTE médico atende. A clínica sem cadastro nenhum cai no texto livre.
    const conveniosDoMedico = selectedDoctor?.insurances || [];
    const temConvenioNaClinica = doctors.some((d) => (d.insurances || []).length > 0);

    /*
     * Consultório de um médico só não tem escolha a fazer: o seletor vira uma pergunta com
     * uma resposta possível. Some da tela e já vai preenchido — a clínica com vários médicos
     * continua escolhendo normalmente.
     */
    const medicoUnico = doctors.length === 1 ? doctors[0] : null;
    useEffect(() => {
        if (medicoUnico && !data.doctor_id) setData('doctor_id', medicoUnico.id);
    }, [medicoUnico?.id]);

    // Trocou de médico e o convênio escolhido não é atendido por ele? Limpa em vez de mandar
    // pro backend e voltar com erro — o campo já mostra só o que dá pra escolher.
    useEffect(() => {
        if (!temConvenioNaClinica || !data.doctor_id || !data.insurance_name) return;
        if (!conveniosDoMedico.includes(data.insurance_name)) setData('insurance_name', '');
    }, [data.doctor_id]);

    const schedule = selectedDoctor?.schedule;
    const excecoes = selectedDoctor?.exceptions || {};
    const warning = useMemo(
        () => violation(schedule, data.starts_at, data.ends_at, excecoes),
        [schedule, data.starts_at, data.ends_at, excecoes],
    );

    /*
     * Duração em vez de "hora do fim". A recepção pensa em "consulta de 15 min", não em
     * "termina às 09:15" — e a agenda já tem a duração padrão configurada. O `ends_at` continua
     * existindo e indo pro backend; só parou de ser digitado.
     */
    const duracaoPadrao = schedule?.slot_minutes || 30;
    const [ajustando, setAjustando] = useState(false); // exceção, não o caso normal

    // Duração atual = diferença entre início e fim (numa consulta que já existe, respeita o que
    // foi gravado). Sem início/fim ainda, mostra a padrão da agenda como selecionada.
    const duracaoAtual = useMemo(() => {
        if (!data.starts_at || !data.ends_at) return duracaoPadrao;
        const min = Math.round((new Date(data.ends_at) - new Date(data.starts_at)) / 60000);
        return min > 0 ? min : duracaoPadrao;
    }, [data.starts_at, data.ends_at, duracaoPadrao]);

    const setDuracao = (min) => {
        if (!data.starts_at) return; // sem início não há o que calcular
        const start = new Date(data.starts_at);
        if (isNaN(start)) return;
        setData('ends_at', toLocalInput(new Date(start.getTime() + min * 60000)));
    };

    // Ao escolher o início, já calcula o fim mantendo a duração que estiver selecionada.
    const onStartChange = (value) => {
        setData((cur) => {
            const next = { ...cur, starts_at: value };
            const start = new Date(value);
            if (value && !isNaN(start)) {
                next.ends_at = toLocalInput(new Date(start.getTime() + duracaoAtual * 60000));
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
    const INPUT = 'w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition';

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-5">
                <Link href="/appointments" className="text-sm text-slate-500 hover:text-slate-800">← Voltar para a agenda</Link>
                <h1 className="mt-1 text-2xl font-bold text-slate-900">{isEditing ? 'Editar consulta' : 'Nova consulta'}</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                    {medicoUnico
                        ? <>Agenda de <strong>{medicoUnico.name}</strong>.</>
                        : 'Escolha o profissional primeiro — a agenda e os convênios mudam conforme o médico.'}
                </p>
            </div>

            {/*
             * Duas colunas no desktop (formulário + resumo grudado), uma no celular. Antes a tela
             * inteira era um max-w-2xl fixo — num monitor grande sobrava metade da tela vazia e no
             * celular os campos apertavam em duas colunas.
             */}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
                <div className="space-y-4 min-w-0">
                    <Secao titulo="Atendimento">
                        {/*
                         * MÉDICO PRIMEIRO: é ele que define a agenda e a lista de convênios. Numa
                         * clínica de um médico só o campo nem aparece — pergunta com uma resposta
                         * possível não é pergunta.
                         */}
                        {!medicoUnico && (
                            <Campo label="Profissional" obrigatorio erro={errors.doctor_id}>
                                <select value={data.doctor_id} onChange={e => setData('doctor_id', e.target.value)} className={INPUT}>
                                    <option value="">Selecione o médico…</option>
                                    {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </Campo>
                        )}

                        <Campo label="Paciente" obrigatorio erro={errors.patient_id}>
                            <PatientPicker
                                value={data.patient_id}
                                initial={patients.find((p) => p.id === data.patient_id) || null}
                                onChange={onPatient}
                            />
                        </Campo>
                    </Secao>

                    <Secao titulo="Quando"
                        aside={schedule ? `Consulta padrão de ${schedule.slot_minutes} min` : null}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Campo label="Início" obrigatorio erro={errors.starts_at}>
                                <input type="datetime-local" value={data.starts_at}
                                    onChange={e => onStartChange(e.target.value)} className={INPUT} />
                            </Campo>

                            {/* A duração JÁ foi respondida nas configurações da agenda — aqui ela só é
                                APLICADA, não perguntada de novo. O ajuste fica atrás de um link, pro
                                caso excepcional (1ª consulta, procedimento). */}
                            <Campo label="Término" erro={errors.ends_at}>
                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                                    {data.starts_at && data.ends_at ? (
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-sm text-slate-700">
                                                <strong>{data.ends_at.slice(11, 16)}</strong>
                                                <span className="text-slate-400"> · {duracaoAtual} min</span>
                                            </span>
                                            {!ajustando && (
                                                <button type="button" onClick={() => setAjustando(true)}
                                                    className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2">
                                                    ajustar
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-sm text-slate-400">Escolha o início — calculamos o fim ({duracaoPadrao} min).</span>
                                    )}

                                    {ajustando && (
                                        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-slate-200 pt-2">
                                            {[15, 20, 30, 45, 60].map((min) => (
                                                <button key={min} type="button" onClick={() => { setDuracao(min); setAjustando(false); }}
                                                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                                                        duracaoAtual === min
                                                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                                                            : 'border-slate-200 text-slate-600 hover:bg-white'
                                                    }`}>
                                                    {min}min
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Campo>
                        </div>
                    </Secao>

                    {/* Particular ou convênio — perguntado SEMPRE que a clínica aceita as duas,
                        paciente novo ou antigo. Quando o cadastro tem convênio, já vem marcado;
                        a recepção só confirma. */}
                    {!pagamentoUnico && (
                        <Secao titulo="Pagamento">
                            <div className="grid grid-cols-2 gap-2 max-w-sm">
                                {[['particular', 'Particular'], ['convenio', 'Convênio']].map(([v, label]) => (
                                    <button key={v} type="button"
                                        onClick={() => setData('payment_type', v)}
                                        className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                                            data.payment_type === v
                                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                            {errors.payment_type && <p className="text-rose-600 text-xs mt-1">{errors.payment_type}</p>}

                            {/* As opções do convênio abrem LOGO ABAIXO do botão que as pediu, e já
                                depois do médico — que é quem define quais existem. */}
                            {data.payment_type === 'convenio' && (
                                <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                                    <Campo label="Qual convênio?" obrigatorio erro={errors.insurance_name}>
                                        {temConvenioNaClinica ? (
                                            <select value={data.insurance_name}
                                                onChange={e => setData('insurance_name', e.target.value)}
                                                disabled={!data.doctor_id}
                                                className={`${INPUT} bg-white disabled:bg-slate-100 disabled:text-slate-400`}>
                                                <option value="">Selecione o convênio…</option>
                                                {conveniosDoMedico.map((c) => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        ) : (
                                            <>
                                                {/* Clínica que ainda não cadastrou convênio segue no texto livre,
                                                    com datalist do que já usou (evita Unimed/unimed/UNIMED). */}
                                                <input list="convenios-conhecidos" value={data.insurance_name}
                                                    onChange={e => setData('insurance_name', e.target.value)}
                                                    className={`${INPUT} bg-white`}
                                                    placeholder="Ex.: Unimed, Bradesco Saúde…" />
                                                <datalist id="convenios-conhecidos">
                                                    {(convenios || []).map((c) => <option key={c} value={c} />)}
                                                </datalist>
                                            </>
                                        )}
                                    </Campo>
                                    {avisoConvenio && <p className="mt-1 text-xs text-blue-700">{avisoConvenio}</p>}
                                    {temConvenioNaClinica && !data.doctor_id && (
                                        <p className="mt-1 text-xs text-slate-500">Escolha o profissional primeiro — cada um atende convênios diferentes.</p>
                                    )}
                                    {selectedDoctor && temConvenioNaClinica && conveniosDoMedico.length === 0 && (
                                        <p className="mt-1 text-xs text-amber-700">{selectedDoctor.name} não atende nenhum convênio cadastrado.</p>
                                    )}
                                </div>
                            )}
                        </Secao>
                    )}

                    <Secao titulo="Detalhes">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Campo label="Tipo">
                                <select value={data.type} onChange={e => setData('type', e.target.value)} className={INPUT}>
                                    <option value="consultation">Consulta</option>
                                    <option value="followup">Retorno</option>
                                    <option value="exam">Exame</option>
                                    <option value="other">Outro</option>
                                </select>
                            </Campo>
                        </div>
                        <Campo label="Observações">
                            <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows={3}
                                placeholder="Algo que a recepção ou o médico precise saber antes da consulta…"
                                className={`${INPUT} resize-y`} />
                        </Campo>
                    </Secao>
                </div>

                {/* Resumo + ações. Gruda no topo no desktop; no celular cai no fim do formulário,
                    que é exatamente onde a pessoa termina de preencher. */}
                <aside className="lg:sticky lg:top-4 space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Resumo</h2>
                        <dl className="mt-3 space-y-2.5 text-sm">
                            <Linha rotulo="Profissional" valor={selectedDoctor?.name} />
                            <Linha rotulo="Paciente" valor={pacienteNome} />
                            <Linha rotulo="Quando" valor={resumoQuando(data.starts_at, data.ends_at)} />
                            <Linha rotulo="Pagamento" valor={
                                data.payment_type === 'convenio'
                                    ? (data.insurance_name ? `Convênio · ${data.insurance_name}` : 'Convênio')
                                    : 'Particular'
                            } />
                        </dl>
                    </div>

                    {warning && (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                            ⚠ {warning}
                        </div>
                    )}
                    {errors.starts_at && !warning && (
                        <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
                            {errors.starts_at}
                        </div>
                    )}

                    <div className="flex flex-col-reverse sm:flex-row lg:flex-col gap-2">
                        <Link href="/appointments"
                            className="flex-1 text-center px-6 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200">
                            Cancelar
                        </Link>
                        <button type="submit" disabled={processing || blocked}
                            title={blocked ? warning : undefined}
                            className="flex-1 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                            {processing ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Marcar consulta'}
                        </button>
                    </div>
                </aside>
            </form>
        </div>
    );
}

/* ─────────── pedacinhos de layout (só apresentação) ─────────── */

function Secao({ titulo, aside, children }) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-baseline justify-between gap-3 mb-3">
                <h2 className="text-sm font-semibold text-slate-800">{titulo}</h2>
                {aside && <span className="text-xs text-slate-400">{aside}</span>}
            </div>
            <div className="space-y-4">{children}</div>
        </section>
    );
}

function Campo({ label, obrigatorio, erro, children }) {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
                {label}{obrigatorio && <span className="text-rose-500"> *</span>}
            </label>
            {children}
            {erro && <p className="text-rose-600 text-xs mt-1">{erro}</p>}
        </div>
    );
}

function Linha({ rotulo, valor }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-slate-400 shrink-0">{rotulo}</dt>
            <dd className={`text-right ${valor ? 'text-slate-800 font-medium' : 'text-slate-300'}`}>
                {valor || '—'}
            </dd>
        </div>
    );
}

/** "qua, 05/08 · 09:00 → 09:30" — o suficiente pra conferir antes de salvar. */
function resumoQuando(inicio, fim) {
    if (!inicio) return null;
    const d = new Date(inicio);
    if (isNaN(d)) return null;
    const dia = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
    return `${dia} · ${inicio.slice(11, 16)}${fim ? ` → ${fim.slice(11, 16)}` : ''}`;
}
