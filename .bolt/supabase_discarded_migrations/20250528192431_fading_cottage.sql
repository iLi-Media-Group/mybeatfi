-- Create the bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('license-agreements', 'license-agreements', true)
on conflict (id) do nothing;

-- Policy to allow authenticated users to upload PDFs
create policy "Allow authenticated users to upload PDFs"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'license-agreements' 
  and (storage.extension(name) = 'pdf')
);

-- Policy to allow public read access to license agreements
create policy "Allow public read access to license agreements"
on storage.objects for select
to public
using (bucket_id = 'license-agreements');

-- Policy to allow authenticated users to delete their own uploads
create policy "Users can delete their own license agreements"
on storage.objects for delete
to authenticated
using (bucket_id = 'license-agreements' and auth.uid() = owner);
