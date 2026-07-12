import { Link, router, usePage } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';

export default function Index({ patients, filters }) {
    const { auth } = usePage().props;
    const isReceptionist = auth?.role === 'receptionist';
    const [search, setSearch] = useState(filters?.search || '');
    const status = filters?.status || 'active';
    const direction = filters?.direction || 'asc';

    const go = (params) => {
        router.get('/patients', { search, status, direction, ...params }, { preserveState: true, replace: true, preserveScroll: true });
    };

    const submitSearch = (e) => { e.preventDefault(); go({ search }); };
    const toggleDirection = () => go({ direction: direction === 'asc' ? 'desc' : 'asc' });
    const setStatus = (s) => go({ status: s });

    // Busca automática enquanto digita (debounce ~350ms; não dispara no 1º render)
    const firstSearch = useRef(true);
    useEffect(() => {
        if (firstSearch.current) { firstSearch.current = false; return; }
        const t = setTimeout(() => {
            router.get('/patients', { search, status, direction }, { preserveState: true, replace: true, preserveScroll: true });
        }, 350);
        return () => clearTimeout(t);
    }, [search]);

    const rows = patients.data || [];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
                <div className="flex items-center gap-2">
                    <Link href="/patients-import" className="px-3 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50">
                        Importar CSV
                    </Link>
                    <Link href="/patients/create" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                        + Novo Paciente
                    </Link>
                </div>
            </div>

            {/* Barra: busca + ordem + filtro de status */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <form onSubmit={submitSearch} className="relative flex-1 min-w-[220px] max-w-md">
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nome, e-mail, telefone ou CPF..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                    <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </form>

                <button onClick={toggleDirection} title="Alternar ordem"
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h11M3 12h7M3 17h4M17 7v10m0 0l-3-3m3 3l3-3" />
                    </svg>
                    {direction === 'asc' ? 'A–Z' : 'Z–A'}
                </button>

                <div className="inline-flex rounded-lg border border-slate-200 bg-white overflow-hidden text-sm">
                    {[['active', 'Ativos'], ['inactive', 'Inativos']].map(([val, label]) => (
                        <button key={val} onClick={() => setStatus(val)}
                            className={`px-3 py-2 font-medium ${status === val ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fone</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {rows.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-400">Nenhum paciente encontrado.</td></tr>
                        ) : rows.map((p) => (
                            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <div className="flex items-center gap-3">
                                        <PatientAvatar patient={p} />
                                        <Link href={`/patients/${p.id}`} className="text-blue-600 hover:text-blue-800 font-medium">{p.name}</Link>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.phone || p.whatsapp || '—'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <StatusBadge status={p.status} />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <RowActions patient={p} isReceptionist={isReceptionist} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {patients.links && (
                    <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                        <span className="text-sm text-gray-500">Mostrando {patients.from || 0} a {patients.to || 0} de {patients.total || 0}</span>
                        <div className="flex gap-1">
                            {patients.links.map((link, i) => (
                                <Link key={i} href={link.url || '#'} disabled={!link.url}
                                    className={`px-3 py-1 text-sm rounded ${link.active ? 'bg-blue-600 text-white' : link.url ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400 cursor-default'}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function PatientAvatar({ patient }) {
    const inputRef = useRef(null);
    const [busy, setBusy] = useState(false);
    const pick = (e) => { e.preventDefault(); e.stopPropagation(); inputRef.current?.click(); };
    const upload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setBusy(true);
        router.post(`/patients/${patient.id}/photo`, { photo: file }, {
            forceFormData: true, preserveScroll: true, preserveState: true,
            onFinish: () => { setBusy(false); if (inputRef.current) inputRef.current.value = ''; },
        });
    };
    return (
        <button type="button" onClick={pick} title={patient.photo_url ? 'Trocar foto' : 'Adicionar / tirar foto'}
            className="relative group w-9 h-9 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0 grid place-items-center">
            {patient.photo_url
                ? <img src={patient.photo_url} alt="" className="w-full h-full object-cover" />
                : <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5z" /></svg>}
            <span className="absolute inset-0 hidden group-hover:grid place-items-center bg-black/40 rounded-full">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 7l1-1.5A2 2 0 019.2 4.5h5.6a2 2 0 011.7 1L17.5 7H20a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1h2.5z" />
                    <circle cx="12" cy="13" r="3.2" />
                </svg>
            </span>
            {busy && <span className="absolute inset-0 grid place-items-center bg-white/70"><span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" /></span>}
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={upload} />
        </button>
    );
}

function StatusBadge({ status }) {
    const inactive = status === 'inactive';
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${inactive ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${inactive ? 'bg-gray-400' : 'bg-green-500'}`} />
            {inactive ? 'Inativo' : 'Ativo'}
        </span>
    );
}

function IconBtn({ href, title, children }) {
    return (
        <Link href={href} title={title}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition">
            {children}
        </Link>
    );
}

function RowActions({ patient, isReceptionist }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const toggleStatus = () => {
        setOpen(false);
        const next = patient.status === 'inactive' ? 'active' : 'inactive';
        router.patch(`/patients/${patient.id}/status`, { status: next }, { preserveScroll: true });
    };

    const photoRef = useRef(null);
    const uploadPhoto = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        router.post(`/patients/${patient.id}/photo`, { photo: file }, {
            forceFormData: true, preserveScroll: true, preserveState: true,
            onFinish: () => { if (photoRef.current) photoRef.current.value = ''; },
        });
    };

    return (
        <div className="inline-flex items-center justify-end gap-1" ref={ref}>
            {/* Prontuário — clínico, oculto pra secretária */}
            {!isReceptionist && (
                <IconBtn href={`/patients/${patient.id}?tab=evolucoes`} title="Prontuário">
                    <svg className="w-4.5 h-4.5 w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                </IconBtn>
            )}

            {/* Visualizar */}
            <IconBtn href={`/patients/${patient.id}`} title="Visualizar">
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
                    <circle cx="12" cy="12" r="3" />
                </svg>
            </IconBtn>

            {/* Três pontinhos */}
            <div className="relative">
                <button onClick={() => setOpen((o) => !o)} title="Mais"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition">
                    <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" />
                    </svg>
                </button>
                {open && (
                    <div className="absolute right-0 mt-1 w-48 rounded-xl bg-white border border-slate-200 shadow-xl py-1 z-20 text-left">
                        <MItem href={`/patients/${patient.id}/edit`} onClick={() => setOpen(false)} label="Editar" />
                        <button onClick={() => { setOpen(false); photoRef.current?.click(); }} className="flex w-full items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left">
                            {patient.photo_url ? 'Trocar foto' : 'Adicionar foto'}
                        </button>
                        <button onClick={toggleStatus} className="flex w-full items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left">
                            {patient.status === 'inactive' ? 'Reativar paciente' : 'Marcar como inativo'}
                        </button>
                        <MItem href={`/appointments/create?patient_id=${patient.id}`} onClick={() => setOpen(false)} label="Agendamento" />
                        <MItem href={`/patients/${patient.id}?tab=anotacoes`} onClick={() => setOpen(false)} label="Anotações" />
                    </div>
                )}
            </div>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
        </div>
    );
}

function MItem({ href, onClick, label }) {
    return (
        <Link href={href} onClick={onClick} className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            {label}
        </Link>
    );
}
