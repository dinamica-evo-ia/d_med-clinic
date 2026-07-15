import { useEffect, useState, useRef } from 'react';
import { Link, router } from '@inertiajs/react';

const EVO_ORIGIN = 'https://app.dmedevo.com.br';

const VINCULOS = ['Mãe', 'Pai', 'Cônjuge', 'Filho(a)', 'Irmão(ã)', 'Cuidador(a)', 'Outro'];

export default function Index({ patients, templates = [], defaultTemplateId = null }) {
    const [patientId, setPatientId] = useState('');
    const [templateId, setTemplateId] = useState(defaultTemplateId || (templates[0]?.id ?? ''));
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);

    // --- Acompanhante ---
    const [hasCompanion, setHasCompanion] = useState(false);
    const [companionName, setCompanionName] = useState('');
    const [companionRel, setCompanionRel] = useState('Mãe');
    const [companionRelOther, setCompanionRelOther] = useState('');

    const [studioUrl, setStudioUrl] = useState(null);
    const [teste, setTeste] = useState(false);
    const [templateName, setTemplateName] = useState(null);
    const templateSnapshotRef = useRef(null);
    const templateInfoRef = useRef({ id: null, name: null });
    const acompanhanteSnapshotRef = useRef(null);
    const selectedTemplate = templates.find((t) => t.id === templateId);
    const hasChoice = templates.length > 1;

    const patientObj = patients.find((p) => p.id === patientId);
    const patientFirstName = (patientObj?.name || '').split(' ')[0] || 'Maria';
    const companionFirstName = companionName.trim().split(' ')[0] || 'Ana';
    const companionRelFinal = companionRel === 'Outro' ? companionRelOther.trim() : companionRel;

    async function abrir(idOuTeste) {
        const acompanhante =
            hasCompanion && companionName.trim()
                ? { nome: companionName.trim(), vinculo: companionRelFinal || 'Acompanhante' }
                : null;

        const { data } = await window.axios.post('/studio-med/token', {
            pacienteId: idOuTeste,
            templateId: templateId || null,
            acompanhante,
        });
        setTeste(data.teste);
        setStudioUrl(data.studioUrl);
        setTemplateName(data.templateName || null);
        templateSnapshotRef.current = data.templateSnapshot || null;
        templateInfoRef.current = { id: templateId || null, name: data.templateName || null };
        acompanhanteSnapshotRef.current = data.acompanhanteSnapshot || null;
    }

    useEffect(() => {
        const pid = new URLSearchParams(window.location.search).get('patient_id');
        if (pid) setPatientId(pid);
    }, []);

    useEffect(() => {
        function onMsg(e) {
            if (e.origin !== EVO_ORIGIN) return;
            if (e.data?.type === 'dmed:anamnese') {
                const payload = {
                    ...e.data,
                    templateSnapshot: templateSnapshotRef.current,
                    templateId: templateInfoRef.current.id,
                    templateName: templateInfoRef.current.name,
                    acompanhanteSnapshot: acompanhanteSnapshotRef.current,
                    terceiraVozNaoIdentificada: !!e.data.terceiraVozNaoIdentificada,
                    identificacaoPorVoz: !!e.data.identificacaoPorVoz,
                };
                window.axios.post('/studio-med/anamnese-ia', payload).then((r) => {
                    if (r.data.teste) alert('Gravação de teste concluída (não foi salva).');
                    else router.visit(`/patients/${e.data.pacienteId}/records/${r.data.id}`);
                });
            }
        }
        window.addEventListener('message', onMsg);
        return () => window.removeEventListener('message', onMsg);
    }, []);

    if (!studioUrl) {
        return (
            <div className="mx-auto max-w-xl space-y-4 p-6">
                <h1 className="text-2xl font-semibold">Studio Med — nova consulta gravada</h1>

                <label className="block">
                    <span className="text-sm font-medium">Paciente</span>
                    <select
                        value={patientId}
                        onChange={(e) => setPatientId(e.target.value)}
                        className="mt-1 w-full rounded-lg border px-3 py-2"
                    >
                        <option value="">Selecione…</option>
                        {patients.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </label>

                {/* Acompanhante */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={hasCompanion}
                            onChange={(e) => setHasCompanion(e.target.checked)}
                            className="rounded border-slate-300"
                        />
                        <span className="text-sm font-medium">Há acompanhante nesta consulta?</span>
                    </label>
                    {hasCompanion && (
                        <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    placeholder="Nome do acompanhante"
                                    value={companionName}
                                    onChange={(e) => setCompanionName(e.target.value)}
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                                />
                                <select
                                    value={companionRel}
                                    onChange={(e) => setCompanionRel(e.target.value)}
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                                >
                                    {VINCULOS.map((v) => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                            {companionRel === 'Outro' && (
                                <input
                                    type="text"
                                    placeholder="Especifique o vínculo"
                                    value={companionRelOther}
                                    onChange={(e) => setCompanionRelOther(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                                />
                            )}
                            <div className="rounded-md bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-800">
                                💡 <strong>Dica pra IA identificar melhor:</strong> comece a consulta cumprimentando primeiro o paciente pelo nome, depois o acompanhante pelo nome e vínculo. Exemplo:<br />
                                <em className="block mt-1 text-blue-900">"Bom dia, {patientFirstName}. Bom dia, {companionFirstName}, {companionRelFinal || 'acompanhante'} d{['a','e','i','o','u'].includes(patientFirstName[0]?.toLowerCase()) ? 'e ' : 'o(a) '}{patientFirstName}."</em>
                                <span className="block mt-1 text-blue-700">Se esquecer, a IA tenta identificar pelo conteúdo — a saudação só melhora a precisão.</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modelo de anamnese */}
                {selectedTemplate && !showTemplatePicker && (
                    <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                        <span>
                            Modelo: <strong className="text-slate-700">{selectedTemplate.name}</strong>
                            {selectedTemplate.is_default && ' · padrão'}
                            {' '}({selectedTemplate.fields?.length || 0} campos)
                        </span>
                        {hasChoice && (
                            <button
                                type="button"
                                onClick={() => setShowTemplatePicker(true)}
                                className="text-blue-600 hover:text-blue-800"
                            >
                                trocar
                            </button>
                        )}
                    </div>
                )}
                {selectedTemplate && showTemplatePicker && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Modelo de anamnese</span>
                            <Link href="/account/settings/anamnese-templates" className="text-xs text-blue-600 hover:text-blue-800">gerenciar</Link>
                        </div>
                        <select
                            value={templateId}
                            onChange={(e) => setTemplateId(e.target.value)}
                            className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
                        >
                            {templates.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name}{t.is_default ? ' · padrão' : ''} — {t.fields?.length || 0} campos
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                {!selectedTemplate && templates.length === 0 && (
                    <p className="text-xs text-slate-500 italic px-1">
                        Nenhum modelo cadastrado — o padrão do sistema será usado.{' '}
                        <Link href="/account/settings/anamnese-templates" className="text-blue-600 hover:text-blue-800">Criar modelo</Link>
                    </p>
                )}

                <button
                    disabled={!patientId || (hasCompanion && !companionName.trim())}
                    onClick={() => abrir(patientId)}
                    className="w-full rounded-lg bg-teal-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
                >
                    Iniciar gravação
                </button>
                <div className="text-center text-sm text-gray-500">ou</div>
                <button
                    onClick={() => abrir('teste')}
                    className="w-full rounded-lg border px-4 py-3 font-medium"
                >
                    Gravação de teste (sem paciente)
                </button>
            </div>
        );
    }

    return (
        <div className="p-4">
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">{teste ? 'Gravação de teste' : 'Consulta gravada'}</h1>
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                        {templateName && <span>Modelo: <strong>{templateName}</strong></span>}
                        {acompanhanteSnapshotRef.current && (
                            <span>· 👥 Acompanhante: <strong>{acompanhanteSnapshotRef.current.nome}</strong> ({acompanhanteSnapshotRef.current.vinculo})</span>
                        )}
                    </div>
                </div>
                <button onClick={() => setStudioUrl(null)} className="text-sm text-gray-500 underline">
                    Trocar paciente
                </button>
            </div>
            <iframe
                src={studioUrl}
                allow="microphone"
                className="w-full rounded-xl border-0"
                style={{ height: '80vh' }}
            />
        </div>
    );
}
