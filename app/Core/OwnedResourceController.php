<?php

declare(strict_types=1);

namespace App\Core;

/**
 * OwnedResourceController
 *
 * Base for simple resources that belong to the authenticated user
 * (Skills, Education, Experience, Certificates, Projects). Each
 * concrete controller only needs to supply the Model instance and
 * validation rules — index/store/update/destroy are handled here,
 * always scoped to $request->user['id'] so users can never read or
 * modify another user's records.
 */
abstract class OwnedResourceController extends Controller
{
    abstract protected function model(): Model;

    /** @return array<string,string> Validator rules, e.g. ['name' => 'required|max:100'] */
    abstract protected function rules(bool $isUpdate): array;

    public function index(Request $request): void
    {
        $userId = $request->user['id'];
        $model = $this->model();

        $stmt = $model->db()->prepare(
            "SELECT * FROM {$model->tableName()} WHERE user_id = :user_id AND deleted_at IS NULL ORDER BY id DESC"
        );
        $stmt->execute(['user_id' => $userId]);

        Response::success($stmt->fetchAll(), 'Fetched successfully');
    }

    public function store(Request $request): void
    {
        $data = $request->only(array_keys($this->rules(false)));
        $errors = $this->validate($data, $this->rules(false));

        if (!empty($errors)) {
            Response::validationError($errors);
        }

        $data['user_id'] = $request->user['id'];
        $id = $this->model()->create($data);

        Response::success($this->model()->find($id), 'Created successfully', 201);
    }

    public function update(Request $request, string $id): void
    {
        $record = $this->authorizeOwnership($request, $id);

        $data = $request->only(array_keys($this->rules(true)));
        $errors = $this->validate($data, $this->rules(true));

        if (!empty($errors)) {
            Response::validationError($errors);
        }

        $this->model()->update((int) $id, $data);

        Response::success($this->model()->find((int) $id), 'Updated successfully');
    }

    public function destroy(Request $request, string $id): void
    {
        $this->authorizeOwnership($request, $id);
        $this->model()->delete((int) $id);

        Response::success([], 'Deleted successfully');
    }

    private function authorizeOwnership(Request $request, string $id): array
    {
        $record = $this->model()->find((int) $id);

        if (!$record) {
            Response::notFound('Record not found');
        }

        if ((int) $record['user_id'] !== (int) $request->user['id']) {
            Response::forbidden('You do not own this resource');
        }

        return $record;
    }
}
