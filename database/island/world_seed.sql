-- database/island_world_seed.sql
-- Island zone names, the nine mini-game levels, the nine NPCs (what they say and how they test) and the shop (names, prices).
-- Where things stand on the map (x, y), the building art and the walking areas stay in the JS files.
-- Safe to run again: it updates what is already there. Run schema.sql first.


insert into island_zones (id, name, sort) values
  ('neighbourhood', 'Neighbourhood', 1),
  ('hawker', 'Hawker Centre', 2),
  ('transport', 'Public Transport', 3)
on conflict (id) do update set name = excluded.name, sort = excluded.sort;

insert into island_levels (level, zone, name, sub) values
  (1, 'neighbourhood', 'Provision Shop', 'The neighbourhood mama shop'),
  (2, 'neighbourhood', 'Dragon Playground', 'The classic dragon playground'),
  (3, 'neighbourhood', 'Void Deck', 'HDB void deck'),
  (4, 'hawker', 'Wet Market', 'Morning wet market'),
  (5, 'hawker', 'Kopitiam', 'Traditional coffee shop'),
  (6, 'hawker', 'Hawker Centre', 'Neighbourhood food court'),
  (7, 'transport', 'Bus Interchange', 'Bus interchange'),
  (8, 'transport', 'Taxi Stand', 'Taxi stand'),
  (9, 'transport', 'MRT Station', 'Elevated MRT station')
on conflict (level) do update set zone = excluded.zone, name = excluded.name, sub = excluded.sub;

insert into island_npcs (id, zone, name, role, kind, greeting, sort) values
  ('teacher', 'neighbourhood', 'Ms Chen', 'Primary school teacher', 'pinyin', 'Class is in session! Read these words for me.', 1),
  ('ccAuntie', 'neighbourhood', 'Auntie Mei', 'Community club volunteer', 'meaning', 'Welcome to the club! Do you know what these words mean?', 2),
  ('officer', 'neighbourhood', 'Officer Lim', 'Neighbourhood police', 'listening', 'Listen carefully. Which word did you hear?', 3),
  ('stallUncle', 'hawker', 'Uncle Ah Huat', 'Chicken rice seller', 'pinyin', 'Order up! First, read the menu to me.', 4),
  ('tehAuntie', 'hawker', 'Auntie Teh', 'Drinks stall', 'meaning', 'Thirsty? Tell me what these words mean.', 5),
  ('fruitSeller', 'hawker', 'Fruit Seller', 'Fruit stall', 'listening', 'Fresh and sweet! Which word do you hear?', 6),
  ('stationMaster', 'transport', 'Station Master', 'MRT ticket office', 'pinyin', 'Before you board, a quick check of your Chinese.', 7),
  ('busCaptain', 'transport', 'Bus Captain', 'Bus driver', 'meaning', 'All aboard! What do these words mean?', 8),
  ('taxiDriver', 'transport', 'Taxi Uncle', 'Taxi driver', 'listening', 'Where to? First, listen to this word.', 9)
on conflict (id) do update set zone = excluded.zone, name = excluded.name, role = excluded.role, kind = excluded.kind, greeting = excluded.greeting, sort = excluded.sort;

insert into island_shop_categories (id, name, sort) values
  ('all', 'All', 1),
  ('fun', 'Rides & fun', 2),
  ('building', 'Buildings', 3),
  ('decor', 'Decor', 4)
on conflict (id) do update set name = excluded.name, sort = excluded.sort;

insert into island_shop_items (id, name, cat, price, sort) values
  ('bounce', 'Bouncy castle', 'fun', 40, 1),
  ('arch', 'Fairy-light arch', 'decor', 30, 2),
  ('icecream', 'Ice-cream truck', 'decor', 50, 3),
  ('fountain', 'Fountain', 'decor', 60, 4),
  ('windmill', 'Windmill', 'building', 70, 5),
  ('treehouse', 'Treehouse', 'building', 80, 6),
  ('pool', 'Swimming pool', 'fun', 80, 7),
  ('lighthouse', 'Lighthouse', 'building', 90, 8),
  ('cafe', 'Café', 'building', 90, 9),
  ('carousel', 'Carousel', 'fun', 100, 10),
  ('arcade', 'Game arcade', 'building', 100, 11),
  ('balloon', 'Hot-air balloon', 'fun', 120, 12),
  ('ferris', 'Ferris wheel', 'fun', 150, 13)
on conflict (id) do update set name = excluded.name, cat = excluded.cat, price = excluded.price, sort = excluded.sort;