-- =====================================================================
-- Vínculo do post com o card do ClickUp (para criar subtarefas de ajuste)
-- =====================================================================
begin;

alter table posts add column if not exists clickup_task_id text;

commit;
