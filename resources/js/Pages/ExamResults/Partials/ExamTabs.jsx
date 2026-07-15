import { Link } from '@inertiajs/react';

/**
 * Abas de Exames. Duas coisas diferentes que o médico confunde se ficarem na mesma lista:
 *   Solicitar  = o que a clínica PEDE ao laboratório (exam_requests)
 *   Resultados = o que VOLTA de lá, com o laudo anexado (exam_results)
 */
export default function ExamTabs({ active }) {
  const abas = [
    { key: 'solicitar', label: 'Solicitar', href: '/exam-requests' },
    { key: 'resultados', label: 'Resultados', href: '/exam-results' },
  ];

  return (
    <div className="mb-6 flex gap-1 border-b border-slate-200">
      {abas.map((a) => (
        <Link key={a.key} href={a.href}
          className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            active === a.key
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}>
          {a.label}
        </Link>
      ))}
    </div>
  );
}
