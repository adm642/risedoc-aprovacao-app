-- Vincula o cliente (project) a um container do ClickUp (pasta ou lista),
-- para escolher o card numa lista em vez de colar o link a cada post.
-- Guarda no formato "folder:<id>" ou "list:<id>".
alter table projects
  add column if not exists clickup_folder_id text;
