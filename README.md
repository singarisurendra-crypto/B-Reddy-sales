# B Reddy Sales — V6

V6 includes the V5 login / role / audit-trail application plus:

- Invoice/Sales filters: invoice number, customer, status, from date, to date, and clear filters.
- Customer filters: name/mobile search, due status, and clear filters.
- Procurement filters: purchase number, supplier, status, from date, to date, and clear filters.
- Dashboard Net Profit summary for the selected Day / Week / This Month period.
- Profit formula shown in the dashboard:
  **Net Profit = Sales Revenue − Cost of Goods Sold (COGS) − Expenses**
- COGS is calculated as **sold quantity × current Item Master Purchase Rate**.
- The dashboard also shows Sales Revenue, COGS, Gross Profit, Expenses, and Net Profit separately.
- Fixed the V5 `user_profiles` loading query so User Profiles are loaded correctly.

No new Supabase SQL is required for these V6 UI/calculation changes. Continue using the V5 SQL already supplied for authentication and RLS.

## Purchase-rate stock costing (V6 update)
Run `supabase/v6_purchase_rate_profit.sql` once after the existing V5 SQL. Sales now select the actual available Purchased Rate / Cost for each item. The selected cost rate is saved on each invoice line, and invoice/dashboard profit uses that saved rate rather than the current Item Master purchase rate.
