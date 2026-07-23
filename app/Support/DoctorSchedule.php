<?php

namespace App\Support;

use App\Models\Doctor;
use Carbon\Carbon;
use Carbon\CarbonInterface;

/**
 * Helper de horário de atendimento por médico.
 *
 * Estrutura do JSON salvo em doctors.schedule:
 * {
 *   "days": {
 *     "mon": {"active": true, "periods": [
 *        {"start": "08:00", "end": "12:00"},     ← manhã
 *        {"start": "14:00", "end": "18:00"}      ← tarde
 *     ]},
 *     "sat": {"active": false, "periods": [{"start": "08:00", "end": "12:00"}]},
 *     ...
 *   },
 *   "slot_minutes": 30,
 *   "min_lead_minutes": 0,
 *   "max_lead_days": 90
 * }
 *
 * ⚠️ O ALMOÇO NÃO EXISTE MAIS como conceito próprio — ele é simplesmente o BURACO entre um
 * período e o próximo (12:00→14:00 acima). Isso cobre de graça a clínica com 3 períodos, ou a
 * que fecha 11h e volta 15h, que o modelo antigo (abre/fecha + 1 almoço) não conseguia expressar.
 *
 * 🔁 RETROCOMPATIBILIDADE: `normalize()` converte o formato antigo
 * ({open, close, lunch}) em períodos NA LEITURA — nenhum tenant precisou de migração, e quem
 * ainda não salvou pela tela nova continua funcionando. A conversão é idempotente.
 * O normalize também devolve `open`/`close` DERIVADOS (menor início / maior fim do dia) só pra
 * não quebrar consumidor que ainda lê esses campos. Eles são leitura — a verdade é `periods`.
 */
class DoctorSchedule
{
    public const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    public static function defaults(): array
    {
        $weekday = [
            'active' => true,
            'periods' => [
                ['start' => '08:00', 'end' => '12:00'],
                ['start' => '14:00', 'end' => '18:00'],
            ],
        ];
        $weekend = [
            'active' => false,
            'periods' => [['start' => '08:00', 'end' => '12:00']],
        ];

        return [
            'days' => [
                'mon' => $weekday,
                'tue' => $weekday,
                'wed' => $weekday,
                'thu' => $weekday,
                'fri' => $weekday,
                'sat' => $weekend,
                'sun' => $weekend,
            ],
            'slot_minutes'     => 30,
            'min_lead_minutes' => 0,
            'max_lead_days'    => 90,
        ];
    }

    /** Mescla o schedule salvo com os defaults e converte o formato antigo. */
    public static function normalize(?array $schedule): array
    {
        $defaults = self::defaults();
        if (! $schedule) {
            return self::withDerived($defaults);
        }

        $days = [];
        foreach (self::DAYS as $d) {
            $days[$d] = self::normalizeDay($schedule['days'][$d] ?? [], $defaults['days'][$d]);
        }

        return self::withDerived([
            'days' => $days,
            'slot_minutes'     => (int) ($schedule['slot_minutes']     ?? $defaults['slot_minutes']),
            'min_lead_minutes' => (int) ($schedule['min_lead_minutes'] ?? $defaults['min_lead_minutes']),
            'max_lead_days'    => (int) ($schedule['max_lead_days']    ?? $defaults['max_lead_days']),
        ]);
    }

    /** Um dia: aceita o formato novo (periods) e converte o antigo (open/close/lunch). */
    private static function normalizeDay(array $raw, array $default): array
    {
        $active = array_key_exists('active', $raw) ? (bool) $raw['active'] : (bool) $default['active'];
        $periods = [];

        if (! empty($raw['periods']) && is_array($raw['periods'])) {
            foreach ($raw['periods'] as $p) {
                $s = self::hhmm($p['start'] ?? null);
                $e = self::hhmm($p['end'] ?? null);
                if ($s && $e && $e > $s) {
                    $periods[] = ['start' => $s, 'end' => $e];
                }
            }
        } elseif (isset($raw['open']) || isset($raw['close'])) {
            // ---- FORMATO ANTIGO: abre/fecha (+ almoço) vira 1 ou 2 períodos ----
            $open  = self::hhmm($raw['open'] ?? null)  ?: $default['periods'][0]['start'];
            $close = self::hhmm($raw['close'] ?? null) ?: end($default['periods'])['end'];
            $ls = self::hhmm($raw['lunch']['start'] ?? null);
            $le = self::hhmm($raw['lunch']['end'] ?? null);

            if ($ls && $le && $ls > $open && $le < $close && $le > $ls) {
                $periods[] = ['start' => $open, 'end' => $ls];   // manhã
                $periods[] = ['start' => $le,   'end' => $close]; // tarde
            } elseif ($close > $open) {
                $periods[] = ['start' => $open, 'end' => $close];
            }
        }

        if (empty($periods)) {
            $periods = $default['periods'];
        }

        return ['active' => $active, 'periods' => self::mergePeriods($periods)];
    }

    /** Ordena e funde períodos que se sobrepõem ou se encostam (evita buraco fantasma). */
    private static function mergePeriods(array $periods): array
    {
        usort($periods, fn ($a, $b) => strcmp($a['start'], $b['start']));

        $out = [];
        foreach ($periods as $p) {
            $ultimo = count($out) - 1;
            if ($ultimo >= 0 && $p['start'] <= $out[$ultimo]['end']) {
                $out[$ultimo]['end'] = max($out[$ultimo]['end'], $p['end']);
            } else {
                $out[] = $p;
            }
        }

        return array_values($out);
    }

    /** Acrescenta open/close derivados por dia (compat de leitura — ver nota no topo). */
    private static function withDerived(array $cfg): array
    {
        foreach (self::DAYS as $d) {
            $p = $cfg['days'][$d]['periods'];
            $cfg['days'][$d]['open']  = $p[0]['start'];
            $cfg['days'][$d]['close'] = end($p)['end'];
        }

        return $cfg;
    }

    private static function hhmm(?string $v): ?string
    {
        if (! $v || ! preg_match('/^(\d{1,2}):(\d{2})$/', trim($v), $m)) {
            return null;
        }
        $h = (int) $m[1];
        if ($h > 23 || (int) $m[2] > 59) {
            return null;
        }

        return sprintf('%02d:%s', $h, $m[2]);
    }

    /** "08:00–12:00, 14:00–18:00" — usado na UI e no prompt da IA. */
    public static function describeDay(array $day): string
    {
        if (empty($day['active'])) {
            return 'não atende';
        }

        return implode(', ', array_map(fn ($p) => "{$p['start']}–{$p['end']}", $day['periods']));
    }

    /**
     * Valida se o intervalo [start, end] cabe no expediente do médico.
     * Retorna null se OK, ou string com motivo da rejeição.
     */
    public static function violation(Doctor $doctor, CarbonInterface $start, CarbonInterface $end): ?string
    {
        $cfg = self::normalize($doctor->schedule);

        if (! $start->isSameDay($end)) {
            return 'A consulta deve começar e terminar no mesmo dia.';
        }
        if ($end->lessThanOrEqualTo($start)) {
            return 'O horário final deve ser depois do inicial.';
        }

        $now = Carbon::now($start->getTimezone());
        if ($cfg['min_lead_minutes'] > 0 && $start->lessThan($now->copy()->addMinutes($cfg['min_lead_minutes']))) {
            return "Agendamento exige antecedência mínima de {$cfg['min_lead_minutes']} min.";
        }
        if ($cfg['max_lead_days'] > 0 && $start->greaterThan($now->copy()->addDays($cfg['max_lead_days']))) {
            return "Agendamento não pode ser feito com mais de {$cfg['max_lead_days']} dias de antecedência.";
        }

        $dayKey = self::DAYS[$start->dayOfWeekIso - 1]; // 1=mon..7=sun
        $day = $cfg['days'][$dayKey] ?? null;

        if (! $day || empty($day['active'])) {
            return 'O médico não atende neste dia da semana.';
        }

        // Tem que caber INTEIRO dentro de UM período. Cair no buraco entre eles (o antigo
        // "almoço") é o mesmo que estar fora do expediente.
        foreach ($day['periods'] as $p) {
            $ini = self::timeOn($start, $p['start']);
            $fim = self::timeOn($start, $p['end']);
            if ($start->greaterThanOrEqualTo($ini) && $end->lessThanOrEqualTo($fim)) {
                return null;
            }
        }

        return 'Fora dos horários de atendimento ('.self::describeDay($day).').';
    }

    /**
     * Enumera os horários LIVRES de um médico a partir de $from, por $days dias.
     * Respeita os períodos do dia, antecedência mínima/máxima e subtrai as consultas
     * já ocupadas ($busy = lista de ['start'=>..., 'end'=>...], Carbon ou string ISO).
     * Devolve [ ['start'=>ISO8601, 'end'=>ISO8601], ... ] no fuso de $from.
     * Não toca no banco (puro) — quem consulta as consultas ocupadas é o controller.
     */
    public static function freeSlots(Doctor $doctor, CarbonInterface $from, int $days, array $busy = []): array
    {
        $cfg      = self::normalize($doctor->schedule);
        $slotMin  = max(5, (int) $cfg['slot_minutes']);
        $tz       = $from->getTimezone();
        $now      = Carbon::now($tz);
        $earliest = $now->copy()->addMinutes($cfg['min_lead_minutes']);
        $latest   = $cfg['max_lead_days'] > 0 ? $now->copy()->addDays($cfg['max_lead_days']) : null;

        $busyIntervals = array_map(fn ($b) => [
            'start' => $b['start'] instanceof CarbonInterface ? $b['start'] : Carbon::parse($b['start'], $tz),
            'end'   => $b['end']   instanceof CarbonInterface ? $b['end']   : Carbon::parse($b['end'], $tz),
        ], $busy);

        $slots = [];
        $startDay = $from->copy()->startOfDay();

        for ($i = 0; $i < $days; $i++) {
            $day  = $startDay->copy()->addDays($i);
            $conf = $cfg['days'][self::DAYS[$day->dayOfWeekIso - 1]] ?? null;
            if (! $conf || empty($conf['active'])) {
                continue;
            }

            // Um cursor POR PERÍODO: assim a tarde recomeça no horário cheio dela em vez de
            // herdar o resto de slot da manhã.
            foreach ($conf['periods'] as $p) {
                $ini = self::timeOn($day, $p['start']);
                $fim = self::timeOn($day, $p['end']);

                $cursor = $ini->copy();
                while ($cursor->copy()->addMinutes($slotMin)->lessThanOrEqualTo($fim)) {
                    $slotStart = $cursor->copy();
                    $slotEnd   = $cursor->copy()->addMinutes($slotMin);

                    $free = $slotStart->greaterThanOrEqualTo($earliest)
                        && (! $latest || $slotStart->lessThanOrEqualTo($latest));

                    if ($free) {
                        foreach ($busyIntervals as $b) {
                            if ($slotStart->lessThan($b['end']) && $slotEnd->greaterThan($b['start'])) {
                                $free = false;
                                break;
                            }
                        }
                    }

                    if ($free) {
                        $slots[] = ['start' => $slotStart->toIso8601String(), 'end' => $slotEnd->toIso8601String()];
                    }
                    $cursor->addMinutes($slotMin);
                }
            }
        }

        return $slots;
    }

    private static function timeOn(CarbonInterface $day, string $hhmm): CarbonInterface
    {
        [$h, $m] = array_map('intval', explode(':', $hhmm));

        return $day->copy()->setTime($h, $m, 0);
    }

    /**
     * Consolida vários schedules em um único (pra agenda mostrar "todos os médicos"):
     * - dia ativo se QUALQUER médico atende nele
     * - períodos = UNIÃO dos períodos dos ativos (sobreposições fundidas). Assim, se um atende
     *   de manhã e outro à tarde, a agenda mostra os dois blocos — e o buraco só aparece se
     *   NINGUÉM atende naquele intervalo.
     * - slot_minutes = menor entre os schedules (mais granular)
     * - antecedências = mais permissivas (menor min, maior max)
     */
    public static function union(array $schedules): array
    {
        if (empty($schedules)) {
            return self::normalize(null);
        }

        $schedules = array_map([self::class, 'normalize'], $schedules);
        $out = self::defaults();

        $out['slot_minutes']     = min(array_map(fn ($s) => $s['slot_minutes'], $schedules));
        $out['min_lead_minutes'] = min(array_map(fn ($s) => $s['min_lead_minutes'], $schedules));
        $out['max_lead_days']    = max(array_map(fn ($s) => $s['max_lead_days'], $schedules));

        foreach (self::DAYS as $d) {
            $ativos = array_filter($schedules, fn ($s) => ! empty($s['days'][$d]['active']));

            if (empty($ativos)) {
                $out['days'][$d]['active'] = false;
                continue;
            }

            $todos = [];
            foreach ($ativos as $s) {
                foreach ($s['days'][$d]['periods'] as $p) {
                    $todos[] = $p;
                }
            }

            $out['days'][$d] = ['active' => true, 'periods' => self::mergePeriods($todos)];
        }

        return self::withDerived($out);
    }
}
