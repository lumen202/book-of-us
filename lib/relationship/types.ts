export type Relationship = {
  id: true;
  started_at: string;
  partner_a_name: string;
  partner_b_name: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

/** A couple-authored replacement for the ceremony's default letter — see `getLoveLetter`. */
export type LoveLetter = {
  salutation: string;
  body: string;
  signoff: string;
};
