-- Run this once in your Supabase project's SQL Editor.
-- It creates a private storage bucket called "files" and locks it down
-- so each signed-in user can only see and touch their own folder
-- (paths look like: <user-id>/<filename>).

insert into storage.buckets (id, name, public)
values ('files', 'files', false)
on conflict (id) do nothing;

create policy "Users can read their own files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can upload to their own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their own files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Needed for the vault-unlock check file, which is written with "upsert".
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
