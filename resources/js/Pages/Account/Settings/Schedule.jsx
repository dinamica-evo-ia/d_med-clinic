import ComingSoon from '@/Components/ComingSoon';

export default function Schedule() {
  return (
    <ComingSoon
      title="Configurações da Agenda"
      description="Definir dias e horários de atendimento, blocos de almoço e duração padrão de cada tipo de consulta."
      features={[
        'Dias da semana atendidos',
        'Horário de início e fim por dia',
        'Bloqueios fixos (almoço, reunião)',
        'Duração padrão por tipo de consulta',
        'Antecedência mínima e máxima para agendamento',
      ]}
      back="/account/settings/doctor"
    />
  );
}
