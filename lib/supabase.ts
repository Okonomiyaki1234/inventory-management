import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Organization = {
  id: string;
  name: string;
  code: string;
  created_at: string;
};

export type Warehouse = {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
};

export type Item = {
  id: string;
  warehouse_id: string;
  name: string;
  quantity: number;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type ItemWithWarehouse = Item & {
  warehouse: Warehouse;
};
