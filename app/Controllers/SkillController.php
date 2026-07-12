<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Model;
use App\Core\OwnedResourceController;
use App\Models\Skill;

final class SkillController extends OwnedResourceController
{
    protected function model(): Model
    {
        return new Skill();
    }

    protected function rules(bool $isUpdate): array
    {
        return [
            'name'        => $isUpdate ? 'max:100' : 'required|max:100',
            'proficiency' => 'in:beginner,intermediate,advanced,expert',
        ];
    }
}
