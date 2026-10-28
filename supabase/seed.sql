-- Pacity : données de démonstration (salles du brief).
-- Les comptes de démo (Léa, Hugo, Sami, Mathieu) sont créés par scripts/seed-users.mjs.

insert into public.rooms (name, capacity, usage, credits_per_hour, description, sort_order) values
  ('Phone Booth', 1, 'Appels', 1,
   'Une cabine acoustique pour vos appels et visios en toute discrétion. Isolée du bruit, éclairée, avec tablette et prise.', 1),
  ('Small Room', 4, 'Réunion', 2,
   'Une petite salle chaleureuse pour vos points d''équipe et rendez-vous clients, jusqu''à 4 personnes, avec écran.', 2),
  ('Medium Room', 8, 'Réunion', 3,
   'Une salle lumineuse autour d''une grande table ovale pour vos réunions et ateliers, jusqu''à 8 personnes, avec écran et tableau blanc.', 3),
  ('Large Room', 16, 'Conférence', 5,
   'Notre plus grand espace pour vos présentations, formations et conférences, jusqu''à 16 personnes, avec vidéoprojecteur.', 4)
on conflict (name) do nothing;

-- Photos des salles (Unsplash, licence libre), servies depuis public/rooms/.
update public.rooms set photo_url = '/rooms/' || lower(replace(name, ' ', '-')) || '.jpg'
 where photo_url is null;
