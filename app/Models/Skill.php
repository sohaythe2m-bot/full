<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

final class Skill extends Model
{
    protected string $table = 'skills';
    protected array $fillable = ['user_id', 'name', 'proficiency'];
}
