-- Create the contracts bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', true)
on conflict (id) do nothing;

-- Set up bucket policies
create policy "Allow public uploads"
on storage.objects for insert
to public
with check (bucket_id = 'contracts');

create policy "Allow public downloads"
on storage.objects for select
to public
using (bucket_id = 'contracts'); 