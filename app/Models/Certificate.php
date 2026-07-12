<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

final class Certificate extends Model
{
    protected string $table = 'certificates';
    protected array $fillable = [
        'user_id', 'title', 'issuer', 'issue_date', 'expiry_date',
        'credential_url', 'file_url',
    ];
}
