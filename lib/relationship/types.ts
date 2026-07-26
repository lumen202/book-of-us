export type Relationship = {
  id: true;
  started_at: string;
  partner_a_name: string;
  partner_b_name: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};
