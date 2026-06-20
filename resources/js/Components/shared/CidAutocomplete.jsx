import { useState, useEffect, useRef, useCallback } from 'react';

export default function CidAutocomplete({ onSelect, placeholder, disabled }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);
    const abortRef = useRef(null);
    const debounceRef = useRef(null);

    const search = useCallback(async (term) => {
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        if (term.length < 2) {
            setResults([]);
            setOpen(false);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/cid/search?q=${encodeURIComponent(term)}`, {
                signal: controller.signal,
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) throw new Error('Falha ao buscar CID-10');
            const data = await res.json();
            setResults(data);
            setOpen(true);
            setSelectedIndex(-1);
        } catch (err) {
            if (err.name === 'AbortError') return;
            setError('Erro de conexão');
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleChange = (value) => {
        setQuery(value);
        setSelectedIndex(-1);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(value), 250);
    };

    const selectItem = (item) => {
        setQuery(`${item.code} - ${item.description}`);
        setOpen(false);
        onSelect(item);
    };

    const handleKeyDown = (e) => {
        if (!open || results.length === 0) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const parts = query.split(' - ');
                const code = parts[0]?.trim();
                const description = parts.slice(1).join(' - ').trim() || code;
                if (code) {
                    onSelect({ code, description });
                    setQuery('');
                }
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex((prev) => Math.max(prev - 1, -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && results[selectedIndex]) {
                    selectItem(results[selectedIndex]);
                }
                break;
            case 'Escape':
                setOpen(false);
                break;
        }
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (abortRef.current) abortRef.current.abort();
        };
    }, []);

    return (
        <div ref={containerRef} className="relative">
            <input
                type="text"
                value={query}
                onChange={(e) => handleChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => results.length > 0 && setOpen(true)}
                placeholder={placeholder || 'Buscar CID-10 (código ou descrição)'}
                disabled={disabled}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {open && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {loading && (
                        <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Buscando...
                        </div>
                    )}
                    {error && (
                        <div className="px-3 py-2 text-sm text-red-500">{error}</div>
                    )}
                    {!loading && !error && results.length === 0 && query.length >= 2 && (
                        <div className="px-3 py-2 text-sm text-gray-500">Nenhum CID encontrado</div>
                    )}
                    {results.map((item, i) => (
                        <button
                            key={item.code}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); selectItem(item); }}
                            className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-blue-50 ${
                                i === selectedIndex ? 'bg-blue-50' : ''
                            }`}
                        >
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded shrink-0">
                                {item.code}
                            </span>
                            <span className="text-sm text-gray-700 truncate">{item.description}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
