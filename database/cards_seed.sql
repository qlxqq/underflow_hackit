-- database/cards_seed.sql
-- The three albums, how cards grow (Caught, Trained, Mastered), and which group each captured-word picture belongs to.
-- Safe to run again: it updates what is already there. Run schema.sql first.

insert into album_defs (id, name, sort) values
  ('neighbourhood', 'Neighbourhood', 1),
  ('hawker-centre', 'Hawker Centre', 2),
  ('public-transport', 'Public Transport', 3)
on conflict (id) do update set name = excluded.name, sort = excluded.sort;

-- A card grows a stage when it has been practised this many times.
insert into evolution_stages (stage, label, min_uses) values
  (0, 'Caught', 0),
  (1, 'Trained', 1),
  (2, 'Mastered', 3)
on conflict (stage) do update set label = excluded.label, min_uses = excluded.min_uses;

insert into theme_categories (theme, category) values
  ('food', 'Food & Drink'),
  ('drink', 'Food & Drink'),
  ('stall', 'Food & Drink'),
  ('fruit', 'Food & Drink'),
  ('cake', 'Food & Drink'),
  ('chilli', 'Food & Drink'),
  ('bus', 'Getting Around'),
  ('taxi', 'Getting Around'),
  ('train', 'Getting Around'),
  ('car', 'Getting Around'),
  ('bicycle', 'Getting Around'),
  ('plane', 'Getting Around'),
  ('home', 'Home & Family'),
  ('lift', 'Home & Family'),
  ('family', 'Home & Family'),
  ('bed', 'Home & Family'),
  ('key', 'Home & Family'),
  ('people', 'People & Feelings'),
  ('chat', 'People & Feelings'),
  ('smile', 'People & Feelings'),
  ('heart', 'People & Feelings'),
  ('park', 'Nature & Animals'),
  ('rain', 'Nature & Animals'),
  ('sun', 'Nature & Animals'),
  ('moon', 'Nature & Animals'),
  ('flower', 'Nature & Animals'),
  ('bird', 'Nature & Animals'),
  ('cat', 'Nature & Animals'),
  ('fish', 'Nature & Animals'),
  ('book', 'School & Ideas'),
  ('pencil', 'School & Ideas'),
  ('bulb', 'School & Ideas'),
  ('clock', 'School & Ideas'),
  ('shop', 'Shopping & Money'),
  ('card', 'Shopping & Money'),
  ('coin', 'Shopping & Money'),
  ('shirt', 'Shopping & Money'),
  ('bag', 'Shopping & Money'),
  ('gift', 'Shopping & Money'),
  ('shoe', 'Shopping & Money'),
  ('medical', 'Health & Body'),
  ('eye', 'Health & Body'),
  ('playground', 'Fun & Play'),
  ('chess', 'Fun & Play'),
  ('star', 'Fun & Play'),
  ('phone', 'Fun & Play')
on conflict (theme) do update set category = excluded.category;