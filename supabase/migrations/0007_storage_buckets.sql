-- Buckets pour les photos de profil (publiques) et les pièces d'identité
-- (privées). Convention de chemin : le premier segment du nom de fichier est
-- l'id de l'utilisateur propriétaire (ex: "<user_id>.jpg",
-- "<user_id>/piece.jpg"), utilisé par les policies ci-dessous.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- avatars : lecture publique, écriture réservée à son propre dossier
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_own_write"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_own_update"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- documents (pièces d'identité) : lecture réservée au propriétaire + admin
create policy "documents_own_or_admin_read"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or current_user_type() = 'admin')
  );

create policy "documents_own_write"
  on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
