<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

final class Project extends Model
{
    protected string $table = 'projects';
    protected array $fillable = [
        'user_id', 'title', 'description', 'project_url',
        'repo_url', 'image_url', 'start_date', 'end_date',
    ];
}
