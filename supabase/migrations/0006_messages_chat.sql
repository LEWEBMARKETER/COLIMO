-- Chat par course entre le client et le coursier assignés.

create table messages (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  auteur_id uuid not null references utilisateurs (id),
  contenu text not null,
  created_at timestamptz not null default now()
);

create index messages_course_idx on messages (course_id, created_at);

alter table messages enable row level security;

create policy "messages_select_participants_or_admin"
  on messages for select
  using (
    current_user_type() = 'admin'
    or exists (
      select 1 from courses c
      where c.id = course_id
        and (c.client_id = auth.uid() or c.coursier_id = auth.uid())
    )
  );

create policy "messages_insert_participants"
  on messages for insert
  with check (
    auteur_id = auth.uid()
    and exists (
      select 1 from courses c
      where c.id = course_id
        and (c.client_id = auth.uid() or c.coursier_id = auth.uid())
    )
  );

-- Active le temps réel (diffusion des INSERT) sur la table messages.
alter publication supabase_realtime add table messages;
