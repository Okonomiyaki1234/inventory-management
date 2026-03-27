/*
  # 在庫管理システムの初期セットアップ

  1. 新しいテーブル
    - `organizations` (組織)
      - `id` (uuid, primary key)
      - `name` (text) - 組織名
      - `code` (text, unique) - 組織アクセスコード
      - `created_at` (timestamptz) - 作成日時
    
    - `warehouses` (倉庫)
      - `id` (uuid, primary key)
      - `organization_id` (uuid, FK) - 所属組織
      - `name` (text) - 倉庫名（部室、顧問の家、部用車など）
      - `created_at` (timestamptz) - 作成日時
    
    - `items` (アイテム)
      - `id` (uuid, primary key)
      - `warehouse_id` (uuid, FK) - 所属倉庫
      - `name` (text) - アイテム名
      - `quantity` (integer) - 数量
      - `description` (text, nullable) - 説明
      - `created_at` (timestamptz) - 作成日時
      - `updated_at` (timestamptz) - 更新日時

  2. セキュリティ
    - すべてのテーブルでRLSを有効化
    - 組織コードを知っていれば、その組織のデータにアクセス可能
    - 匿名ユーザーでも組織コードがあればアクセス可能
*/

-- organizations テーブル
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 誰でも組織を作成可能
CREATE POLICY "Anyone can create organization"
  ON organizations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 組織の閲覧は全員可能（組織コードで絞り込みはアプリ側で実施）
CREATE POLICY "Anyone can view organizations"
  ON organizations FOR SELECT
  TO anon, authenticated
  USING (true);

-- warehouses テーブル
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage warehouses"
  ON warehouses FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- items テーブル
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage items"
  ON items FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_warehouses_organization_id ON warehouses(organization_id);
CREATE INDEX IF NOT EXISTS idx_items_warehouse_id ON items(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_organizations_code ON organizations(code);
