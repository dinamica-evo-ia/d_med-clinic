export default function ErrorState({ message = 'Ocorreu um erro ao carregar os dados.', onRetry }) {
    return (
        <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="mt-2 text-sm font-semibold text-red-900">Erro</h3>
            <p className="mt-1 text-sm text-gray-500">{message}</p>
            {onRetry && (
                <button onClick={onRetry} className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-500">
                    Tentar novamente
                </button>
            )}
        </div>
    );
}
