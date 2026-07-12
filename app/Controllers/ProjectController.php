<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Model;
use App\Core\OwnedResourceController;
use App\Models\Project;

final class ProjectController extends OwnedResourceController
{
    protected function model(): Model
    {
        return new Project();
    }

    protected function rules(bool $isUpdate): array
    {
        $req = $isUpdate ? '' : 'required|';
        return [
            'title'       => $req . 'max:200',
            'description' => '',
            'project_url' => 'url',
            'repo_url'    => 'url',
            'start_date'  => 'date',
            'end_date'    => 'date',
        ];
    }
}
