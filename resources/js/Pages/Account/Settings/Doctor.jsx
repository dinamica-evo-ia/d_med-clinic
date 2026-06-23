import ComingSoon from '@/Components/ComingSoon';

export default function Doctor() {
  return (
    <ComingSoon
      title="Configurações — Médico"
      description="Configurações específicas do perfil profissional do médico."
      features={[
        'Especialidades secundárias',
        'Modelos rápidos de prescrição (favoritos)',
        'Assinatura padrão (texto/imagem)',
        'Tempo padrão de consulta e retorno',
      ]}
    />
  );
}
