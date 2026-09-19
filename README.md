# B Reddy Sales V6 – Receiver Merge & Payment Mode

This update changes the receiver model so **B Reddy Cash** and **B Reddy Phone Pe** are handled by one receiver/person. Cash vs PhonePe is now stored separately as the **payment mode**.

## One-time Supabase SQL
Run these in Supabase SQL Editor in this order:

1. V5 authentication SQL (if not already run)
2. `supabase/v6_purchase_rate_profit.sql` (if not already run)
3. `supabase/v6_receiver_merge_cash_phonepe.sql`

The receiver merge SQL is based on the current Receiver Master shown by the user:
- ID 2 = B Reddy Cash
- ID 3 = B Reddy Phone Pe
- ID 1 = Kiran (kept separate)

The migration:
- Adds `payment_mode` to collections, purchases and expenses.
- Converts old receiver ID 2 transactions to `CASH`.
- Converts old receiver ID 3 transactions to `PHONEPE`.
- Moves historical references from receiver 3 to receiver 2.
- Combines opening/current balances of receiver 2 and 3.
- Renames active receiver ID 2 to `B Reddy`.
- Marks old receiver ID 3 inactive so it no longer appears in the app.
- Updates user profiles previously linked to receiver 3 to receiver 2.

## Application changes
- Collection/payment screen asks **Received As: Cash / PhonePe**.
- Immediate invoice payments also save Cash/PhonePe.
- Procurement supplier payments ask **Paid As: Cash / PhonePe**.
- Business expenses paid from a receiver ask **Paid As: Cash / PhonePe**.
- Collection list/report shows the payment mode.
- Existing data keeps its original Cash/PhonePe classification during migration.
- Inactive user profiles can no longer log in.

## Receiver login
After the SQL migration, use one receiver Auth account for the person and make sure its `user_profiles.receiver_id` is **2**. If you created two Auth accounts, keep only the required one active in `user_profiles` by setting the other profile's `status=false`.
