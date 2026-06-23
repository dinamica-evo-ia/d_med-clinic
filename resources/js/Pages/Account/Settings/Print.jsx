import ComingSoon from '@/Components/ComingSoon';

export default function Print() {
  return (
    <ComingSoon
      title="Impressão do Prontuário"
      description="Personalizar o layout de impressão do prontuário, receitas e atestados. Você pode subir um modelo padrão depois."
      features={[
        'Cabeçalho/rodapé com logo e dados da clínica',
        'Templates por tipo de documento (prontuário, receita, atestado, exame)',
        'Marca d\'água opcional',
        'Tamanho do papel (A4/Carta) e margens',
      ]}
      back="/account/settings/doctor"
    />
  );
}
