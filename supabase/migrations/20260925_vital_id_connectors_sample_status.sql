alter table public.vital_id_user_connectors drop constraint if exists vital_id_user_connectors_status_check;
alter table public.vital_id_user_connectors add constraint vital_id_user_connectors_status_check
  check (status in ('connected','sample_data','waiting_implementation','coming_soon','disconnected'));
