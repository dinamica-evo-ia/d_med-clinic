import ComingSoon from '@/Components/ComingSoon';

export default function Suggestions() {
  return (
    <ComingSoon
      title="Sugestões"
      description="Canal direto pra você mandar ideias, pedidos de feature e relatar problemas — vamos priorizar pelo que mais médicos pedirem."
      features={[
        'Enviar sugestão (categoria, título, descrição, prints opcionais)',
        'Ver suas sugestões enviadas e o status',
        'Mural público das mais pedidas, com voto',
        'Acompanhamento: enviada → analisando → no roadmap → entregue',
      ]}
    />
  );
}
