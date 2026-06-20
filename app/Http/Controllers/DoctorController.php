<?php

namespace App\Http\Controllers;

use App\Models\Doctor;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DoctorController extends Controller
{
    public function index()
    {
        return Inertia::render('Doctors/Index', [
            'doctors' => Doctor::orderBy('name')->paginate(15),
        ]);
    }

    public function create()
    {
        return Inertia::render('Doctors/Form', [
            'doctor' => null,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'specialty' => 'nullable|string|max:255',
            'license_number' => 'nullable|string|max:20',
            'document' => 'nullable|string|max:14',
            'bio' => 'nullable|string',
            'schedule' => 'nullable|array',
        ]);

        Doctor::create($validated);

        return redirect()->route('doctors.index')
            ->with('success', 'Médico cadastrado com sucesso.');
    }

    public function edit(Doctor $doctor)
    {
        return Inertia::render('Doctors/Form', [
            'doctor' => $doctor,
        ]);
    }

    public function update(Request $request, Doctor $doctor)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'specialty' => 'nullable|string|max:255',
            'license_number' => 'nullable|string|max:20',
            'document' => 'nullable|string|max:14',
            'bio' => 'nullable|string',
            'schedule' => 'nullable|array',
        ]);

        $doctor->update($validated);

        return redirect()->route('doctors.index')
            ->with('success', 'Médico atualizado com sucesso.');
    }

    public function destroy(Doctor $doctor)
    {
        $doctor->delete();
        return redirect()->route('doctors.index')
            ->with('success', 'Médico removido com sucesso.');
    }
}
