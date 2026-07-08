<?php

namespace App\Support;

use App\Models\Doctor;
use Carbon\CarbonInterface;
use Carbon\Carbon;

/**
 * Helper de horário de atendimento por médico.
 *
 * Estrutura do JSON salvo em doctors.schedule:
 * {
 *   "days": {
 *     "mon": {"active": true,  "open": "08:00", "close": "18:00", "lunch": {"start": "12:00", "end": "13:30"}},
 *     "tue": {...}, "wed": {...}, "thu": {...}, "fri": {...},
 *     "sat": {"active": false, "open": "08:00", "close": "12:00", "lunch": null},
 *     "sun": {"active": false, ...}
 *   },
 *   "slot_minutes": 30,
 *   "min_lead_minutes": 0,
 *   "max_lead_days": 90
 * }
 */
class DoctorSchedule
{
    public const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    public static function defaults(): array
    {
        $weekday = [
            'active' => true,
            'open'   => '08:00',
            'close'  => '18:00',
            'lunch'  => ['start' => '12:00', 'end' => '13:30'],
        ];
        $weekend = [
            'active' => false,
            'open'   => '08:00',
            'close'  => '12:00',
            'lunch'  => null,
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

    /** Mescla o schedule salvo com os defaults (compatibilidade futura). */
    public static function normalize(?array $schedule): array
    {
        $defaults = self::defaults();
        if (! $schedule) return $defaults;

        $days = [];
        foreach (self::DAYS as $d) {
            $days[$d] = array_merge($defaults['days'][$d], $schedule['days'][$d] ?? []);
        }

        return [
            'days' => $days,
            'slot_minutes'     => (int)($schedule['slot_minutes']     ?? $defaults['slot_minutes']),
            'min_lead_minutes' => (int)($schedule['min_lead_minutes'] ?? $defaults['min_lead_minutes']),
            'max_lead_days'    => (int)($schedule['max_lead_days']    ?? $defaults['max_lead_days']),
        ];
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

        $open  = self::timeOn($start, $day['open']);
        $close = self::timeOn($start, $day['close']);

        if ($start->lessThan($open) || $end->greaterThan($close)) {
            return "Fora do expediente ({$day['open']}–{$day['close']}).";
        }

        $lunch = $day['lunch'] ?? null;
        if ($lunch && ! empty($lunch['start']) && ! empty($lunch['end'])) {
            $ls = self::timeOn($start, $lunch['start']);
            $le = self::timeOn($start, $lunch['end']);
            // Overlap se start < le && end > ls
            if ($start->lessThan($le) && $end->greaterThan($ls)) {
                return "Conflita com a pausa de almoço ({$lunch['start']}–{$lunch['end']}).";
            }
        }

        return null;
    }

    /**
     * Enumera os horários LIVRES de um médico a partir de $from, por $days dias.
     * Respeita expediente, almoço, antecedência mínima/máxima e subtrai as consultas
     * já ocupadas ($busy = lista de ['start'=>..., 'end'=>...], Carbon ou string ISO).
     * Devolve [ ['start'=>ISO8601, 'end'=>ISO8601], ... ] no fuso de $from.
     * Não toca no banco (puro) — quem consulta as consultas ocupadas é o controller.
     */
    public static function freeSlots(Doctor $doctor, CarbonInterface $from, int $days, array $busy = []): array
    {
        $cfg     = self::normalize($doctor->schedule);
        $slotMin = max(5, (int) $cfg['slot_minutes']);
        $tz      = $from->getTimezone();
        $now     = Carbon::now($tz);
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
            if (! $conf || empty($conf['active'])) continue;

            $open  = self::timeOn($day, $conf['open']);
            $close = self::timeOn($day, $conf['close']);
            $lunch = (! empty($conf['lunch']['start']) && ! empty($conf['lunch']['end']))
                ? ['start' => self::timeOn($day, $conf['lunch']['start']), 'end' => self::timeOn($day, $conf['lunch']['end'])]
                : null;

            $cursor = $open->copy();
            while ($cursor->copy()->addMinutes($slotMin)->lessThanOrEqualTo($close)) {
                $slotStart = $cursor->copy();
                $slotEnd   = $cursor->copy()->addMinutes($slotMin);

                $free = $slotStart->greaterThanOrEqualTo($earliest)
                    && (! $latest || $slotStart->lessThanOrEqualTo($latest))
                    && ! ($lunch && $slotStart->lessThan($lunch['end']) && $slotEnd->greaterThan($lunch['start']));

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
     * - open = menor open dos ativos
     * - close = maior close dos ativos
     * - lunch = só se TODOS os ativos têm exatamente o mesmo almoço (senão null)
     * - slot_minutes = menor entre os schedules (mais granular)
     * - antecedências = mais permissivas (menor min, maior max)
     */
    public static function union(array $schedules): array
    {
        if (empty($schedules)) return self::defaults();

        $schedules = array_map([self::class, 'normalize'], $schedules);
        $out = self::defaults();
        $slots = array_map(fn ($s) => $s['slot_minutes'], $schedules);
        $minL  = array_map(fn ($s) => $s['min_lead_minutes'], $schedules);
        $maxL  = array_map(fn ($s) => $s['max_lead_days'], $schedules);
        $out['slot_minutes']     = min($slots);
        $out['min_lead_minutes'] = min($minL);
        $out['max_lead_days']    = max($maxL);

        foreach (self::DAYS as $d) {
            $actives = array_filter($schedules, fn ($s) => ! empty($s['days'][$d]['active']));
            if (empty($actives)) {
                $out['days'][$d] = array_merge($out['days'][$d], ['active' => false, 'lunch' => null]);
                continue;
            }
            $opens  = array_map(fn ($s) => $s['days'][$d]['open'],  $actives);
            $closes = array_map(fn ($s) => $s['days'][$d]['close'], $actives);
            sort($opens); rsort($closes);
            $lunches = array_map(fn ($s) => $s['days'][$d]['lunch'] ?? null, $actives);
            $allSame = count(array_unique(array_map('json_encode', $lunches))) === 1;
            $lunch = $allSame ? reset($lunches) : null;

            $out['days'][$d] = [
                'active' => true,
                'open'   => $opens[0],
                'close'  => $closes[0],
                'lunch'  => $lunch,
            ];
        }
        return $out;
    }
}
