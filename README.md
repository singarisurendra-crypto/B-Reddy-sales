# B Reddy Sales

Retail Sales & Inventory Management application built with Next.js and Supabase.

## Deploy

1. Upload all files in this repository to GitHub.
2. In Supabase SQL Editor, run `supabase/schema.sql`.
3. In Vercel Project Settings → Environment Variables add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Redeploy on Vercel.

The current version includes Dashboard, Sales, Create Sale, Customers, Customer Due, Collections/Make Payment, Stock, Procurement/Purchase, Reports and Master screens.

## Important security note

The supplied SQL uses anonymous read/write policies so the first prototype works with the publishable browser key. Before real business use, add authentication and replace these policies with authenticated, user/role-based RLS.
