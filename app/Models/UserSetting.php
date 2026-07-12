<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

final class UserSetting extends Model
{
    protected string $table = 'user_settings';
    protected bool $softDeletes = false;
    protected array $fillable = [
        'user_id', 'email_notifications', 'push_notifications', 'profile_visibility',
    ];

    public function findByUserId(int $userId): ?array
    {
        return $this->findBy('user_id', $userId);
    }
}
