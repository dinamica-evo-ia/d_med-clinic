import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';

const EVO_ORIGIN = 'https://app.dmedevo.com.br';

export default function Index({ patients }) {
    const [patientId, setPatientId] = useState('');
    const [studioUrl, setStudioUrl] = useState(null);
    const [teste, setTeste] = useState(false);

    async function abrir(idOuTeste) {
        const { data } = await window.axios.post('/studio-med/token', { pacienteId: idOuTeste });
        setTeste(data.teste);
        setStudioUrl(data.studioUrl);
    }

    useEffect(() => {
        function onMsg(e) {
            if (e.origin !== EVO_ORIGIN) return;
            if (e.data?.type === 'dmed:anamnese') {
                window.axios.post('/studio-med/anamnese-ia', e.data).then((r) => {
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
                <label className="block text-sm font-medium">Paciente</label>
                <select
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                >
                    <option value="">Selecione…</option>
                    {patients.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <button
                    disabled={!patientId}
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
                <h1 className="text-xl font-semibold">{teste ? 'Gravação de teste' : 'Consulta gravada'}</h1>
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
