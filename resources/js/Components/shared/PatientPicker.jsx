import { useState, useEffect, useRef } from 'react';

/*
 * Escolher paciente: busca por nome/telefone/CPF e, se não achar, CADASTRA NA HORA.
 *
 * Antes era um <select> com TODOS os pacientes — 2466 na Clínica RF, carregados a cada
 * abertura da tela — e não havia como marcar consulta pra quem ainda não era paciente:
 * a recepção tinha que sair do form, cadastrar, e voltar (perdendo o que já tinha digitado).
 *
 * O cadastro rápido pede só o nome; telefone e CPF são opcionais porque quem liga nem sempre
 * tem em mãos. Com CPF, o backend devolve o cadastro EXISTENTE em vez de duplicar.
 */
export default function PatientPicker({ value, initial = null, onChange }) {
  const [selected, setSelected] = useState(initial);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [novo, setNovo] = useState(null); // {name, phone, document} quando cadastrando
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const boxRef = useRef(null);

  useEffect(() => {
    const fora = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  // busca com respiro de 300ms pra não disparar a cada tecla
  useEffect(() => {
    if (novo) return undefined;
    const termo = q.trim();
    if (termo.length < 2) { setResults([]); return undefined; }
    const id = setTimeout(async () => {
      setBuscando(true);
      try {
        const { data } = await window.axios.get('/api/patients/search', { params: { q: termo } });
        setResults(data || []);
      } catch { setResults([]); }
      setBuscando(false);
    }, 300);
    return () => clearTimeout(id);
  }, [q, novo]);

  // entrega o paciente INTEIRO (não só o id): o agendamento precisa do convênio do
  // cadastro pra pré-preencher particular/convênio.
  const escolher = (p) => {
    setSelected(p);
    onChange(p.id, p);
    setOpen(false);
    setQ('');
  };

  const limpar = () => { setSelected(null); onChange('', null); setQ(''); setOpen(true); };

  const abrirCadastro = () => {
    setNovo({ name: q.trim(), phone: '', document: '' });
    setErro(null);
  };

  const cadastrar = async () => {
    if (!novo.name.trim()) { setErro('Informe o nome.'); return; }
    setSalvando(true); setErro(null);
    try {
      const { data } = await window.axios.post('/api/patients/quick', novo);
      escolher(data.patient);
      setNovo(null);
      if (data.ja_existia) {
        setErro(null);
        // não é erro: só avisa que reaproveitou em vez de duplicar
        setAviso(`Já existia cadastro com esse CPF: ${data.patient.name}. Usei o existente.`);
      }
    } catch (e) {
      setErro(e.response?.data?.message || 'Não consegui cadastrar. Tente de novo.');
    }
    setSalvando(false);
  };

  const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none';

  // ── já escolhido: mostra quem é, com opção de trocar
  if (selected && !novo) {
    return (
      <div>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2">
          <span className="text-sm text-gray-900 truncate">
            {selected.name}
            {selected.phone ? <span className="text-gray-400"> · {selected.phone}</span> : null}
          </span>
          <button type="button" onClick={limpar} className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800">
            trocar
          </button>
        </div>
        {aviso && <p className="mt-1 text-xs text-amber-600">{aviso}</p>}
      </div>
    );
  }

  // ── cadastro rápido
  if (novo) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-2">
        <p className="text-xs font-semibold text-blue-800">Cadastrar paciente novo</p>
        <input autoFocus value={novo.name} onChange={(e) => setNovo({ ...novo, name: e.target.value })}
          className={input} placeholder="Nome completo *" />
        <div className="grid grid-cols-2 gap-2">
          <input value={novo.phone} onChange={(e) => setNovo({ ...novo, phone: e.target.value })}
            className={input} placeholder="Telefone" />
          <input value={novo.document} onChange={(e) => setNovo({ ...novo, document: e.target.value })}
            className={input} placeholder="CPF (evita duplicar)" />
        </div>
        {erro && <p className="text-xs text-red-600">{erro}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={cadastrar} disabled={salvando}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {salvando ? 'Cadastrando…' : 'Cadastrar e usar'}
          </button>
          <button type="button" onClick={() => { setNovo(null); setErro(null); }}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100">
            Cancelar
          </button>
        </div>
        <p className="text-[11px] text-blue-700/70">
          Só o nome é obrigatório — dá pra completar a ficha depois, em Pacientes.
        </p>
      </div>
    );
  }

  // ── busca
  return (
    <div className="relative" ref={boxRef}>
      <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        className={input} placeholder="Buscar por nome, telefone ou CPF…" />
      {open && q.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          {buscando && <p className="px-3 py-2 text-xs text-gray-400">Buscando…</p>}
          {!buscando && results.map((p) => (
            <button key={p.id} type="button" onClick={() => escolher(p)}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50">
              <span className="text-gray-900">{p.name}</span>
              {p.phone ? <span className="text-gray-400"> · {p.phone}</span> : null}
              {p.document ? <span className="text-gray-300"> · {p.document}</span> : null}
            </button>
          ))}
          {!buscando && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400">Nenhum paciente com esse termo.</p>
          )}
          <button type="button" onClick={abrirCadastro}
            className="block w-full border-t border-gray-100 bg-gray-50 px-3 py-2 text-left text-sm font-medium text-blue-600 hover:bg-blue-50">
            + Cadastrar “{q.trim()}” como paciente novo
          </button>
        </div>
      )}
      <p className="mt-1 text-[11px] text-gray-400">Digite 2 letras pra buscar. Não é paciente ainda? Dá pra cadastrar aqui mesmo.</p>
    </div>
  );
}
