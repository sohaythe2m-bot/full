<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Model;
use App\Core\OwnedResourceController;
use App\Models\Experience;

final class ExperienceController extends OwnedResourceController
{
    protected function model(): Model
    {
        return new Experience();
    }

    protected function rules(bool $isUpdate): array
    {
        $req = $isUpdate ? '' : 'required|';
        return [
            'company_name'    => $req . 'max:200',
            'job_title'       => $req . 'max:150',
            'employment_type' => 'in:full_time,part_time,contract,internship,freelance',
            'start_date'      => 'date',
            'end_date'        => 'date',
            'is_current'      => 'boolean',
            'description'     => '',
        ];
    }
}
