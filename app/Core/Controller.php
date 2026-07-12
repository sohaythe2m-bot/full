<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Controller
 *
 * Base controller. Concrete controllers extend this for shared helpers.
 */
abstract class Controller
{
    protected function validate(array $data, array $rules): array
    {
        return Validator::make($data, $rules);
    }
}
