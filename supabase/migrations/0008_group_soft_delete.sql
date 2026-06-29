-- Soft-delete de lote de aprovação. Não usamos DELETE porque feedbacks e
-- reviewer_sessions têm FK on delete cascade (excluir o lote apagaria o
-- histórico de feedback). Com deleted_at, escondemos o lote e invalidamos o
-- link público, preservando os posts e o histórico.
alter table approval_groups
  add column if not exists deleted_at timestamptz;
