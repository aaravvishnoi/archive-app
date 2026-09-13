-- Run this in Supabase's SQL Editor if you already ran supabase-setup.sql
-- before the encryption feature was added. It just adds the one missing
-- policy (UPDATE) that the vault's unlock-check file needs.
-- Safe to skip if you're setting up fresh — it's already included in
-- the current supabase-setup.sql.

create policy "Users can update their own files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'files'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'files'
  and (storage.foldername(name))[1] = auth.uid()::text
);
