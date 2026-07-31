-- Détail d'un signalement de litige : motif choisi dans une liste fermée,
-- commentaire libre, et preuves (photos/vidéos) uploadées dans le bucket
-- privé "documents" (même politique de lecture que les pièces d'identité :
-- propriétaire du dossier + admin).
do $$
begin
  if not exists (select 1 from pg_type where typname = 'litige_motif') then
    create type litige_motif as enum (
      'produit_manquant',
      'produit_endommage',
      'erreur_commande',
      'comportement_inapproprie',
      'colis_non_recu',
      'autre'
    );
  end if;
end $$;

create table if not exists litiges (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  auteur_id uuid not null references utilisateurs (id),
  motif litige_motif not null,
  commentaire text,
  preuve_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table litiges enable row level security;

drop policy if exists "litiges_select_participants_or_admin" on litiges;
create policy "litiges_select_participants_or_admin"
  on litiges for select
  using (
    auteur_id = auth.uid()
    or current_user_type() = 'admin'
    or exists (
      select 1 from courses c
      where c.id = course_id
        and (c.client_id = auth.uid() or c.coursier_id = auth.uid())
    )
  );

drop policy if exists "litiges_insert_participant" on litiges;
create policy "litiges_insert_participant"
  on litiges for insert
  with check (
    auteur_id = auth.uid()
    and exists (
      select 1 from courses c
      where c.id = course_id
        and (c.client_id = auth.uid() or c.coursier_id = auth.uid())
    )
  );
