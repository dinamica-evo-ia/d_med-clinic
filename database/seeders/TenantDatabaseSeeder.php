<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\Invoice;
use App\Models\MedicalRecord;
use App\Models\Patient;
use App\Models\CidCode;
use App\Models\TransactionCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class TenantDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Seed CID-10 codes
        $cidCodes = json_decode(file_get_contents(database_path('data/cid10_codes.json')), true);
        foreach (array_chunk($cidCodes, 50) as $chunk) {
            CidCode::insert($chunk);
        }

        // Seed transaction categories
        $categories = [
            ['name' => 'Consulta', 'type' => 'income', 'color' => '#3B82F6'],
            ['name' => 'Retorno', 'type' => 'income', 'color' => '#10B981'],
            ['name' => 'Exame', 'type' => 'income', 'color' => '#8B5CF6'],
            ['name' => 'Procedimento', 'type' => 'income', 'color' => '#F59E0B'],
            ['name' => 'Plano de Saúde', 'type' => 'income', 'color' => '#EC4899'],
            ['name' => 'Outras Receitas', 'type' => 'income', 'color' => '#6B7280'],
            ['name' => 'Aluguel', 'type' => 'expense', 'color' => '#EF4444'],
            ['name' => 'Salários', 'type' => 'expense', 'color' => '#F97316'],
            ['name' => 'Material', 'type' => 'expense', 'color' => '#EAB308'],
            ['name' => 'Equipamento', 'type' => 'expense', 'color' => '#22C55E'],
            ['name' => 'Marketing', 'type' => 'expense', 'color' => '#06B6D4'],
            ['name' => 'Impostos', 'type' => 'expense', 'color' => '#6366F1'],
            ['name' => 'Utilidades', 'type' => 'expense', 'color' => '#A855F7'],
            ['name' => 'Outras Despesas', 'type' => 'expense', 'color' => '#6B7280'],
        ];
        foreach ($categories as $data) {
            TransactionCategory::create($data);
        }

        // Create patients
        $patients = collect([
            ['name' => 'Maria Silva', 'email' => 'maria@email.com', 'phone' => '(11) 91234-5678', 'document' => '123.456.789-00', 'birth_date' => '1990-05-15', 'gender' => 'F'],
            ['name' => 'João Santos', 'email' => 'joao@email.com', 'phone' => '(11) 98765-4321', 'document' => '987.654.321-00', 'birth_date' => '1985-08-22', 'gender' => 'M'],
            ['name' => 'Ana Oliveira', 'email' => 'ana@email.com', 'phone' => '(11) 95555-1234', 'document' => '456.789.123-00', 'birth_date' => '1995-12-01', 'gender' => 'F'],
        ])->map(fn($data) => Patient::create($data + ['id' => (string) Str::uuid()]));

        // Create doctors
        $doctors = collect([
            ['name' => 'Dr. Carlos Mendes', 'email' => 'carlos@clinica.com', 'specialty' => 'Clínico Geral', 'license_number' => 'CRM-SP 123456'],
            ['name' => 'Dra. Juliana Costa', 'email' => 'juliana@clinica.com', 'specialty' => 'Pediatria', 'license_number' => 'CRM-SP 789012'],
            ['name' => 'Dr. Roberto Lima', 'email' => 'roberto@clinica.com', 'specialty' => 'Cardiologia', 'license_number' => 'CRM-SP 345678'],
        ])->map(fn($data) => Doctor::create($data + ['id' => (string) Str::uuid(), 'phone' => '(11) 3000-0001', 'is_active' => true]));

        // Create appointments
        $today = now();
        $appointments = collect([
            ['patient_id' => $patients[0]->id, 'doctor_id' => $doctors[0]->id, 'starts_at' => $today->copy()->setTime(9, 0), 'ends_at' => $today->copy()->setTime(9, 30), 'status' => 'confirmed', 'type' => 'consultation'],
            ['patient_id' => $patients[1]->id, 'doctor_id' => $doctors[0]->id, 'starts_at' => $today->copy()->setTime(10, 0), 'ends_at' => $today->copy()->setTime(10, 30), 'status' => 'scheduled', 'type' => 'consultation'],
            ['patient_id' => $patients[2]->id, 'doctor_id' => $doctors[2]->id, 'starts_at' => $today->copy()->setTime(14, 0), 'ends_at' => $today->copy()->setTime(14, 45), 'status' => 'confirmed', 'type' => 'followup'],
        ])->map(fn($data) => Appointment::create($data + ['id' => (string) Str::uuid(), 'user_id' => null, 'notes' => null]));

        // Create medical record for Maria
        MedicalRecord::create([
            'id' => (string) Str::uuid(),
            'patient_id' => $patients[0]->id,
            'doctor_id' => $doctors[0]->id,
            'appointment_id' => $appointments[0]->id,
            'chief_complaint' => 'Paciente relata dor de cabeça persistente há 3 dias, região frontal.',
            'anamnesis' => [
                'hda' => 'Dor de cabeça frontal, intensidade 7/10, piora com luz. Início há 3 dias após período de estresse.',
                'medicines' => 'Paracetamol 500mg (tomou 2 comprimidos ontem, sem melhora significativa)',
                'allergies' => 'Nega alergias medicamentosas conhecidas',
                'family_history' => 'Mãe hipertensa, pai diabético',
            ],
            'physical_exam' => [
                'PA' => '120/80', 'FC' => '78', 'FR' => '16', 'Temp' => '36.5',
                'SpO2' => '98', 'Peso' => '65', 'Altura' => '1.65', 'IMC' => '23.9',
                'description' => 'Paciente em bom estado geral, consciente e orientada. Pupilas isocóricas e fotoreagentes. PA normal.',
            ],
            'diagnosis' => [
                ['type' => 'principal', 'code' => 'G44.2', 'description' => 'Cefaleia tensional', 'notes' => 'Provavelmente relacionada ao estresse'],
                ['type' => 'secundario', 'code' => 'F41.2', 'description' => 'Ansiedade mista e depressiva', 'notes' => 'Paciente relata período de estresse'],
            ],
            'prescriptions' => [
                ['medication' => 'Ibuprofeno', 'dosage' => '600mg', 'route' => 'oral', 'frequency' => '8/8h', 'duration' => '5 dias', 'quantity' => '1 caixa', 'notes' => 'Tomar após refeições', 'ai_suggested' => false],
                ['medication' => 'Dipirona Sódica', 'dosage' => '1g', 'route' => 'oral', 'frequency' => '6/6h se dor', 'duration' => '3 dias', 'quantity' => '1 caixa', 'notes' => 'Caso ibuprofeno não seja suficiente', 'ai_suggested' => false],
            ],
            'exam_requests' => [
                ['name' => 'Hemograma completo'],
                ['name' => 'Glicemia em jejum'],
                ['name' => 'Colesterol total e frações'],
            ],
            'certificates' => [
                ['type' => 'Atestado Médico', 'cid_code' => 'G44.2', 'days' => 2, 'notes' => 'Afastamento por cefaleia tensional'],
            ],
            'notes' => 'Retorno em 7 dias se não houver melhora.',
        ]);

        // Create invoices
        collect([
            ['patient_id' => $patients[0]->id, 'amount' => 250.00, 'payment_method' => 'pix', 'status' => 'paid', 'due_date' => $today->copy()->subDays(2)],
            ['patient_id' => $patients[1]->id, 'amount' => 250.00, 'payment_method' => null, 'status' => 'pending', 'due_date' => $today->copy()->addDays(5)],
            ['patient_id' => $patients[2]->id, 'amount' => 350.00, 'payment_method' => 'credit', 'status' => 'pending', 'due_date' => $today->copy()->addDays(7)],
        ])->each(fn($data) => Invoice::create($data + ['id' => (string) Str::uuid()]));
    }
}
