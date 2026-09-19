# B Reddy Sales V7 – Custom Login

This version removes the application's dependency on Supabase Authentication. Login uses `app_users` + secure server sessions.

## 1. Supabase SQL
Run `supabase/v7_custom_auth.sql` in the Supabase SQL Editor.

## 2. Vercel environment variables
Keep:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Add **server-only**:
- `SUPABASE_SERVICE_ROLE_KEY`

Do NOT prefix the service-role key with `NEXT_PUBLIC_`. Do not put it in browser code.

## 3. Create the Admin user
Run this in SQL Editor, changing the password to one you choose:

select public.create_or_update_app_user('singarisurendra@gmail.com','YOUR-NEW-PASSWORD','Surendra','admin',null,true);

## 4. Create the Receiver user
Receiver ID 2 is the merged B Reddy receiver in the current data model:

select public.create_or_update_app_user('receiver1@breddysales.com','YOUR-NEW-PASSWORD','B Reddy','receiver',2,true);

## 5. Deploy
Push the project to GitHub and deploy it in Vercel. The browser never receives the service-role key.

## Security model
- Passwords are bcrypt hashes in `app_users`.
- Sessions use random 256-bit tokens; only their SHA-256 hashes are stored in `app_sessions`.
- Session cookie is HttpOnly and SameSite=Lax.
- Business tables are accessed through the Next.js server API, not directly from browser Supabase queries.
- The server API checks the logged-in user's role before mutations.
- The service-role key is server-only.
- Audit entries are written by the server API with user name and role.


## V7.1 build fix
The server-only session and Supabase admin helpers are now located under `app/api/server/` so Next.js/Vercel resolves them reliably from API routes.
