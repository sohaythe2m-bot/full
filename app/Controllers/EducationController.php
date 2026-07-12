<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Model;
use App\Core\OwnedResourceController;
use App\Models\Education;

final class EducationController extends OwnedResourceController
{
    protected function model(): Model
    {
        return new Education();
    }

    protected function rules(bool $isUpdate): array
    {
        $req = $isUpdate ? '' : 'required|';
        return [
            'institution'    => $req . 'max:200',
            'degree'         => 'max:150',
            'field_of_study' => 'max:150',
            'start_date'     => 'date',
            'end_date'       => 'date',
            'is_current'     => 'boolean',
            'description'    => '',
        ];
    }
}
