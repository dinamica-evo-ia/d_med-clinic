<?php

namespace App\Console\Commands;

use App\Mail\AppointmentReminder;
use App\Models\Appointment;
use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendAppointmentReminders extends Command
{
    protected $signature = 'appointments:send-reminders';
    protected $description = 'Send email reminders for tomorrow\'s appointments';

    public function handle(): int
    {
        $tomorrow = now()->addDay()->format('Y-m-d');
        $sent = 0;

        foreach (Tenant::all() as $tenant) {
            $tenant->run(function () use ($tomorrow, &$sent) {
                $appointments = Appointment::with(['patient', 'doctor'])
                    ->whereDate('starts_at', $tomorrow)
                    ->whereIn('status', ['scheduled', 'confirmed'])
                    ->get();

                foreach ($appointments as $appointment) {
                    if ($appointment->patient?->email) {
                        try {
                            Mail::to($appointment->patient->email)
                                ->send(new AppointmentReminder($appointment));
                            $sent++;
                        } catch (\Exception $e) {
                            $this->error("Failed to send to {$appointment->patient->email}: {$e->getMessage()}");
                        }
                    }
                }
            });
        }

        $this->info("Sent {$sent} reminder(s) for {$tomorrow}.");
        return Command::SUCCESS;
    }
}
