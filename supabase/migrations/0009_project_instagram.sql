-- @ do Instagram do cliente, exibido no preview do post no fluxo de aprovação
-- (em vez do "@cliente" fixo). Guardamos sem o "@" e normalizado.
alter table projects
  add column if not exists instagram_handle text;
