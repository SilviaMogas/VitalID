-- Vital ID: member profile photo shown in the app shell and on the credential card.
-- Stored on the existing onboarding profile row; same server-only access rules apply.

alter table public.vital_id_user_profiles add column if not exists photo_url text;

comment on column public.vital_id_user_profiles.photo_url is
  'Member profile photo: a small data URL (client-resized JPEG, max 256px square) or an https URL.';
