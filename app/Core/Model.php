<?php

declare(strict_types=1);

namespace App\Core;

use PDO;

/**
 * Model
 *
 * Base Active-Record-ish model providing safe, prepared-statement
 * CRUD helpers. Concrete models set $table and (optionally) $fillable.
 */
abstract class Model
{
    protected PDO $db;
    protected string $table;
    protected string $primaryKey = 'id';
    /** @var string[] Whitelist of mass-assignable columns */
    protected array $fillable = [];
    protected bool $softDeletes = true;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function db(): PDO
    {
        return $this->db;
    }

    public function tableName(): string
    {
        return $this->table;
    }

    public function find(int|string $id): ?array
    {
        $sql = "SELECT * FROM {$this->table} WHERE {$this->primaryKey} = :id";
        if ($this->softDeletes) {
            $sql .= " AND deleted_at IS NULL";
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function findBy(string $column, mixed $value): ?array
    {
        $sql = "SELECT * FROM {$this->table} WHERE {$column} = :value";
        if ($this->softDeletes) {
            $sql .= " AND deleted_at IS NULL";
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['value' => $value]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function all(int $limit = 50, int $offset = 0): array
    {
        $sql = "SELECT * FROM {$this->table}";
        if ($this->softDeletes) {
            $sql .= " WHERE deleted_at IS NULL";
        }
        $sql .= " ORDER BY {$this->primaryKey} DESC LIMIT :limit OFFSET :offset";
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function create(array $data): int
    {
        $data = $this->filterFillable($data);
        $columns = array_keys($data);
        $placeholders = array_map(fn($c) => ':' . $c, $columns);

        $sql = sprintf(
            "INSERT INTO %s (%s) VALUES (%s)",
            $this->table,
            implode(', ', $columns),
            implode(', ', $placeholders)
        );

        $stmt = $this->db->prepare($sql);
        $stmt->execute($data);

        return (int) $this->db->lastInsertId();
    }

    public function update(int|string $id, array $data): bool
    {
        $data = $this->filterFillable($data);
        if (empty($data)) {
            return false;
        }

        $assignments = implode(', ', array_map(fn($c) => "{$c} = :{$c}", array_keys($data)));
        $sql = "UPDATE {$this->table} SET {$assignments} WHERE {$this->primaryKey} = :id";

        $data['id'] = $id;
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($data);
    }

    public function delete(int|string $id): bool
    {
        if ($this->softDeletes) {
            $stmt = $this->db->prepare("UPDATE {$this->table} SET deleted_at = NOW() WHERE {$this->primaryKey} = :id");
        } else {
            $stmt = $this->db->prepare("DELETE FROM {$this->table} WHERE {$this->primaryKey} = :id");
        }
        return $stmt->execute(['id' => $id]);
    }

    public function paginate(int $page = 1, int $perPage = 15, string $orderBy = null): array
    {
        $page = max(1, $page);
        $offset = ($page - 1) * $perPage;

        $where = $this->softDeletes ? "WHERE deleted_at IS NULL" : "";
        $order = $orderBy ?? "{$this->primaryKey} DESC";

        $countStmt = $this->db->prepare("SELECT COUNT(*) as total FROM {$this->table} {$where}");
        $countStmt->execute();
        $total = (int) $countStmt->fetch()['total'];

        $stmt = $this->db->prepare("SELECT * FROM {$this->table} {$where} ORDER BY {$order} LIMIT :limit OFFSET :offset");
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return [
            'items'       => $stmt->fetchAll(),
            'total'       => $total,
            'page'        => $page,
            'per_page'    => $perPage,
            'total_pages' => (int) ceil($total / max(1, $perPage)),
        ];
    }

    protected function filterFillable(array $data): array
    {
        if (empty($this->fillable)) {
            return $data;
        }
        return array_intersect_key($data, array_flip($this->fillable));
    }
}
