<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->text('description')->nullable()->after('doctor_id');
            $table->foreignUuid('category_id')->nullable()->constrained('transaction_categories')->onDelete('set null')->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->dropColumn(['description', 'category_id']);
        });
    }
};
