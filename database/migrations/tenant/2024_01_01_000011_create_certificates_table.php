<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certificates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('patient_id')->constrained()->onDelete('cascade');
            $table->foreignUuid('doctor_id')->constrained()->onDelete('cascade');
            $table->string('type')->default('medical_certificate');
            $table->string('cid_code', 20)->nullable();
            $table->text('description');
            $table->integer('days')->nullable();
            $table->date('valid_from');
            $table->date('valid_until')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certificates');
    }
};
