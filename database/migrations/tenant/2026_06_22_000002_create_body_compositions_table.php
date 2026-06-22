<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('body_compositions', function (Blueprint $table) {
            $table->id();
            $table->uuid('patient_id')->index();
            $table->date('measured_at');
            $table->decimal('weight', 6, 2)->nullable();    // kg
            $table->decimal('height', 5, 2)->nullable();     // cm
            $table->decimal('bmi', 5, 2)->nullable();
            $table->decimal('body_fat', 5, 2)->nullable();   // %
            $table->decimal('lean_mass', 6, 2)->nullable();  // kg
            $table->decimal('waist', 6, 2)->nullable();      // cm
            $table->decimal('hip', 6, 2)->nullable();        // cm
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('body_compositions');
    }
};
