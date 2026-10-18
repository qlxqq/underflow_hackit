-- database/profile_seed.sql
-- Profile pictures a player can choose (the drawings themselves stay in avatars.js).
-- Safe to run again: it updates what is already there. Run schema.sql first.

insert into avatar_defs (id, label, sort) values
  ('merlion', 'Merlion', 1),
  ('chicken-rice', 'Chicken rice', 2),
  ('laksa', 'Laksa', 3),
  ('kopi', 'Kopi', 4),
  ('hdb', 'HDB flats', 5),
  ('durian', 'Durian', 6),
  ('orchid', 'Orchid', 7),
  ('mrt', 'MRT train', 8)
on conflict (id) do update set label = excluded.label, sort = excluded.sort;