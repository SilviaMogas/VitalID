-- Explicit SQL ACLs for VitalID's server-only public tables.
-- The server uses the Supabase secret/service-role key. No browser role gets
-- table privileges; existing RLS remains enabled and no user policies are added.
begin;

revoke all privileges on table public.vital_id_memberships,
  public.vital_id_user_profiles,
  public.vital_id_health_profiles,
  public.vital_id_health_goals,
  public.vital_id_health_baselines,
  public.vital_id_user_connectors,
  public.vital_id_profiles,
  public.vital_id_metrics,
  public.vital_id_events,
  public.vital_id_shares,
  public.vital_id_whoop_connections,
  public.vital_id_whoop_daily,
  public.vital_id_consents,
  public.vital_id_sol_payments,
  public.vital_id_wallet_nonces,
  public.vital_id_wearable_connections,
  public.vital_id_wearable_daily,
  public.vital_id_wearable_ingest_tokens from public, anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.vital_id_memberships,
  public.vital_id_user_profiles,
  public.vital_id_health_profiles,
  public.vital_id_health_goals,
  public.vital_id_health_baselines,
  public.vital_id_user_connectors,
  public.vital_id_profiles,
  public.vital_id_metrics,
  public.vital_id_events,
  public.vital_id_shares,
  public.vital_id_whoop_connections,
  public.vital_id_whoop_daily,
  public.vital_id_consents,
  public.vital_id_sol_payments,
  public.vital_id_wallet_nonces,
  public.vital_id_wearable_connections,
  public.vital_id_wearable_daily,
  public.vital_id_wearable_ingest_tokens to service_role;

commit;
