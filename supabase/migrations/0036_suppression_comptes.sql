-- Suppression de compte utilisateur depuis le back-office admin (au lieu
-- d'une manipulation directe dans Supabase).
--
-- Un compte qui a de l'historique (courses, paiements, avis, messages,
-- litiges, notifications...) ne peut pas être réellement supprimé sans
-- casser ces données : la quasi-totalité des colonnes qui référencent
-- utilisateurs(id) sont en ON DELETE RESTRICT (par défaut), volontairement
-- — seules coursiers.utilisateur_id et commercants.utilisateur_id sont en
-- CASCADE. La logique "tenter une suppression réelle, sinon anonymiser" vit
-- côté serveur (apps/admin/app/api/utilisateurs/[id]/route.ts, qui a besoin
-- de la clé service-role pour appeler l'API Admin Supabase Auth — c'est la
-- première route serveur de ce projet, jusqu'ici entièrement sans backend).
--
-- Cette migration ne fait que préparer le terrain côté base : une table
-- d'audit (qui a été supprimé/anonymisé, par qui, quand, pourquoi).

create table historique_suppressions_compte (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null,
  nom_original text not null,
  telephone_original text not null,
  type_compte user_type not null,
  mode text not null check (mode in ('anonymisation', 'suppression_definitive')),
  administrateur_id uuid not null references utilisateurs(id),
  motif text,
  created_at timestamptz not null default now()
);

create index historique_suppressions_compte_utilisateur_idx
  on historique_suppressions_compte (utilisateur_id);

alter table historique_suppressions_compte enable row level security;

-- Lecture admin uniquement. Aucune policy insert/update/delete : cette
-- table n'est écrite que par la route serveur, via la clé service-role
-- (qui contourne RLS), jamais par un client authentifié classique.
create policy "historique_suppressions_compte_select_admin"
  on historique_suppressions_compte for select
  using (current_user_type() = 'admin');
