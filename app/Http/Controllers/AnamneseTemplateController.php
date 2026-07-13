<?php

namespace App\Http\Controllers;

use App\Models\AnamneseTemplate;
use App\Models\Doctor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AnamneseTemplateController extends Controller
{
    public function index(Request $request)
    {
        $doctors = Doctor::where('is_active', true)->orderBy('name')->get();

        $selectedId = $request->get('doctor_id') ?: optional($doctors->first())->id;
        $selected = $doctors->firstWhere('id', $selectedId);

        $templates = $selected
            ? AnamneseTemplate::where('doctor_id', $selected->id)
                ->orderByDesc('is_default')
                ->orderBy('name')
                ->get()
            : collect();

        // Se o médico ainda não tem template, cria o padrão do sistema
        if ($selected && $templates->isEmpty()) {
            $this->ensureDefault($selected);
            $templates = AnamneseTemplate::where('doctor_id', $selected->id)
                ->orderByDesc('is_default')
                ->orderBy('name')
                ->get();
        }

        return Inertia::render('Account/Settings/AnamneseTemplates', [
            'doctors' => $doctors->map(fn ($d) => ['id' => $d->id, 'name' => $d->name])->values(),
            'doctor' => $selected ? ['id' => $selected->id, 'name' => $selected->name] : null,
            'templates' => $templates->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'description' => $t->description,
                'fields' => $t->fields,
                'is_default' => $t->is_default,
            ])->values(),
            'defaultFields' => AnamneseTemplate::defaultFields(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request);
        DB::transaction(function () use ($data) {
            if ($data['is_default']) {
                AnamneseTemplate::where('doctor_id', $data['doctor_id'])
                    ->update(['is_default' => false]);
            }
            AnamneseTemplate::create($data);
        });

        return back()->with('success', 'Modelo criado.');
    }

    public function update(Request $request, AnamneseTemplate $anamneseTemplate)
    {
        $data = $this->validateData($request);

        DB::transaction(function () use ($data, $anamneseTemplate) {
            if ($data['is_default']) {
                AnamneseTemplate::where('doctor_id', $data['doctor_id'])
                    ->where('id', '!=', $anamneseTemplate->id)
                    ->update(['is_default' => false]);
            }
            $anamneseTemplate->update($data);
        });

        return back()->with('success', 'Modelo atualizado.');
    }

    public function destroy(AnamneseTemplate $anamneseTemplate)
    {
        // Não deixa apagar o único template do médico (senão nada seria enviado pro EVO)
        $count = AnamneseTemplate::where('doctor_id', $anamneseTemplate->doctor_id)->count();
        if ($count <= 1) {
            return back()->withErrors(['delete' => 'Você precisa manter pelo menos um modelo. Crie outro antes de remover este.']);
        }

        $wasDefault = $anamneseTemplate->is_default;
        $doctorId = $anamneseTemplate->doctor_id;
        $anamneseTemplate->delete();

        // Se apagou o default, promove o mais recente a default
        if ($wasDefault) {
            AnamneseTemplate::where('doctor_id', $doctorId)
                ->orderByDesc('created_at')
                ->first()
                ?->update(['is_default' => true]);
        }

        return back()->with('success', 'Modelo removido.');
    }

    public function setDefault(AnamneseTemplate $anamneseTemplate)
    {
        DB::transaction(function () use ($anamneseTemplate) {
            AnamneseTemplate::where('doctor_id', $anamneseTemplate->doctor_id)
                ->update(['is_default' => false]);
            $anamneseTemplate->update(['is_default' => true]);
        });

        return back()->with('success', 'Modelo definido como padrão.');
    }

    protected function validateData(Request $request): array
    {
        $data = $request->validate([
            'doctor_id' => 'required|exists:doctors,id',
            'name' => 'required|string|max:120',
            'description' => 'nullable|string|max:500',
            'fields' => 'required|array|min:1',
            'fields.*.label' => 'required|string|max:120',
            'fields.*.key' => 'nullable|string|max:60',
            'fields.*.hint' => 'nullable|string|max:200',
            'is_default' => 'nullable|boolean',
        ]);

        // Normaliza: gera key a partir do label quando ausente/vazio, remove duplicatas
        $seen = [];
        $data['fields'] = collect($data['fields'])->map(function ($f) use (&$seen) {
            $label = trim($f['label']);
            $key = ! empty($f['key']) ? $this->slugKey($f['key']) : $this->slugKey($label);
            while (isset($seen[$key])) {
                $key = $key.'_';
            }
            $seen[$key] = true;
            return array_filter([
                'key' => $key,
                'label' => $label,
                'hint' => ! empty($f['hint']) ? trim($f['hint']) : null,
            ], fn ($v) => $v !== null);
        })->values()->all();

        $data['is_default'] = (bool) ($data['is_default'] ?? false);

        return $data;
    }

    protected function slugKey(string $s): string
    {
        $s = preg_replace('/[^A-Za-z0-9À-ÿ ]+/', '', $s);
        $s = mb_strtolower($s ?: '');
        $s = str_replace([' ', 'ã', 'á', 'à', 'â', 'é', 'ê', 'í', 'ó', 'ô', 'õ', 'ú', 'ç'],
                          ['_', 'a', 'a', 'a', 'a', 'e', 'e', 'i', 'o', 'o', 'o', 'u', 'c'], $s);
        return trim($s, '_') ?: 'campo';
    }

    /**
     * Garante que o médico tem pelo menos 1 template (o padrão do sistema).
     * Chamado por AccountController@index e ao criar médico novo.
     */
    public function ensureDefault(Doctor $doctor): AnamneseTemplate
    {
        return AnamneseTemplate::firstOrCreate(
            ['doctor_id' => $doctor->id, 'name' => 'Anamnese padrão'],
            [
                'description' => 'Modelo padrão do sistema — 10 campos clínicos gerais.',
                'fields' => AnamneseTemplate::defaultFields(),
                'is_default' => true,
            ]
        );
    }
}
