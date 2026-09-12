export interface CallLog {
  id: string;
  user_id: string;
  lead_id: string;
  /** Matches a CallOutcome.id in @/server/playbook/data */
  outcome: string;
  notes: string | null;
  created_at: string;
}

export interface PlaybookNoteRow {
  id: string;
  user_id: string;
  /** Matches a ScriptBlock.key or Objection.key in @/server/playbook/data */
  item_key: string;
  note: string;
  updated_at: string;
}
