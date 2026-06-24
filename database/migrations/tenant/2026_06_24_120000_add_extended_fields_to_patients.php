<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->string('social_name')->nullable()->after('name');
            $table->string('marital_status')->nullable()->after('gender');
            $table->string('mother_name')->nullable()->after('marital_status');
            $table->string('father_name')->nullable()->after('mother_name');
            $table->string('spouse_name')->nullable()->after('father_name');
            $table->string('whatsapp')->nullable()->after('phone');
            $table->boolean('is_foreign')->default(false)->after('document');
            $table->string('rg')->nullable()->after('is_foreign');
            $table->string('rg_issuer')->nullable()->after('rg');
            $table->string('rg_state', 2)->nullable()->after('rg_issuer');
            $table->date('rg_issued_at')->nullable()->after('rg_state');
            $table->string('photo_path')->nullable()->after('rg_issued_at');
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn([
                'social_name', 'marital_status', 'mother_name', 'father_name', 'spouse_name',
                'whatsapp', 'is_foreign', 'rg', 'rg_issuer', 'rg_state', 'rg_issued_at', 'photo_path',
            ]);
        });
    }
};
