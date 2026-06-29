-- Marca quando a agência foi notificada por e-mail sobre a conclusão da revisão
-- do lote. Usado para idempotência (evita reenvio em refresh/duplo clique).
alter table approval_groups
  add column if not exists last_notified_at timestamptz;
