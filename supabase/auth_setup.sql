-- B REDDY SALES V5 - AUTHENTICATION SETUP
--
-- 1) In Supabase Dashboard -> Authentication -> Users:
--    Create the Admin user and Receiver users with Email + Password.
--    Example:
--      admin@breddysales.com
--      receiver1@breddysales.com
--
-- 2) Copy each user's UUID from Authentication -> Users.
--
-- 3) Create the matching profiles below by replacing the UUID/email/name.
--
-- ADMIN PROFILE
insert into public.user_profiles (id, full_name, email, role, receiver_id, status)
values (
  'PASTE-ADMIN-AUTH-USER-UUID-HERE'::uuid,
  'Admin',
  'admin@breddysales.com',
  'admin',
  null,
  true
)
on conflict (id) do update set
  full_name=excluded.full_name,
  email=excluded.email,
  role='admin',
  receiver_id=null,
  status=true,
  updated_at=now();

-- RECEIVER PROFILE
-- Replace 000000 with the ID of the receiver from Master -> Receivers.
insert into public.user_profiles (id, full_name, email, role, receiver_id, status)
values (
  'PASTE-RECEIVER-AUTH-USER-UUID-HERE'::uuid,
  'Receiver 1',
  'receiver1@breddysales.com',
  'receiver',
  000000,
  true
)
on conflict (id) do update set
  full_name=excluded.full_name,
  email=excluded.email,
  role='receiver',
  receiver_id=excluded.receiver_id,
  status=true,
  updated_at=now();

-- Check configured users
select id, full_name, email, role, receiver_id, status
from public.user_profiles
order by role, full_name;

-- IMPORTANT:
-- Passwords are stored/managed by Supabase Auth, not user_profiles.
-- Do not put passwords in this SQL file.
--
-- Recommended:
-- Authentication -> Providers -> Email should be enabled.
-- If you don't want public sign-up, disable public email sign-ups.
-- Admin/Receiver accounts should be created by an authorized administrator.
