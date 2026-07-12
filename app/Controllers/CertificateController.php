<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Model;
use App\Core\OwnedResourceController;
use App\Models\Certificate;

final class CertificateController extends OwnedResourceController
{
    protected function model(): Model
    {
        return new Certificate();
    }

    protected function rules(bool $isUpdate): array
    {
        $req = $isUpdate ? '' : 'required|';
        return [
            'title'          => $req . 'max:200',
            'issuer'         => 'max:200',
            'issue_date'     => 'date',
            'expiry_date'    => 'date',
            'credential_url' => 'url',
        ];
    }
}
