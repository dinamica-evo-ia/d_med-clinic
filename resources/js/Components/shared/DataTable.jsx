import { Link } from '@inertiajs/react';
import EmptyState from './EmptyState';

export default function DataTable({ columns, data, resourceUrl, createRoute, createLabel = 'Novo' }) {
    if (!data || data.data?.length === 0) {
        return (
            <EmptyState
                title={`Nenhum registro encontrado`}
                description="Comece cadastrando um novo registro."
                action={
                    createRoute ? (
                        <Link href={createRoute} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                            + {createLabel}
                        </Link>
                    ) : null
                }
            />
        );
    }

    return (
        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {columns.map((col) => (
                            <th key={col.key} className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${col.className || ''}`}>
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {(data.data || data).map((row, idx) => (
                        <tr key={row.id || idx} className="hover:bg-gray-50 transition-colors">
                            {columns.map((col) => (
                                <td key={col.key} className={`px-6 py-4 whitespace-nowrap text-sm ${col.className || ''}`}>
                                    {col.render ? col.render(row) : row[col.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Pagination */}
            {data.links && (
                <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                        Mostrando {data.from || 0} a {data.to || 0} de {data.total || 0}
                    </span>
                    <div className="flex gap-1">
                        {data.links.map((link, i) => (
                            <Link
                                key={i}
                                href={link.url || '#'}
                                disabled={!link.url}
                                className={`px-3 py-1 text-sm rounded ${
                                    link.active
                                        ? 'bg-blue-600 text-white'
                                        : link.url
                                        ? 'text-gray-700 hover:bg-gray-100'
                                        : 'text-gray-400 cursor-default'
                                }`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
