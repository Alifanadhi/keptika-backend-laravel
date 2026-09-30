<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Account Admin
        User::create([
            'name'     => 'Administrator Keptika',
            'username' => 'admin',
            'email'    => 'admin@keptika.com',
            'password' => Hash::make('password123'),
            'role'     => 'admin',
        ]);

        // Account Guru
        User::create([
            'name'     => 'Guru Pembimbing',
            'username' => 'guru1',
            'email'    => 'guru@keptika.com',
            'password' => Hash::make('password123'),
            'role'     => 'guru',
        ]);
    }
}
