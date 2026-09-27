-- database/seed.sql
INSERT INTO Vocabulary (Word, Language, Romanization, EnglishMeaning, ContextSentence, Source)
VALUES
('开心', 'zh', 'kāi xīn', 'happy', '我今天很开心', 'text'),
('谢谢', 'zh', 'xiè xiè', 'thank you', '谢谢你的帮忙', 'text'),
('suka', 'ms', NULL, 'like', 'saya suka makan nasi', 'text'),
('makan', 'ms', NULL, 'eat', 'saya suka makan nasi', 'text'),
('நன்றி', 'ta', 'nandri', 'thank you', 'உங்களுக்கு நன்றி', 'text'),
('மகிழ்ச்சி', 'ta', 'magizhchi', 'happiness', 'இன்று மகிழ்ச்சியாக இருக்கிறேன்', 'text');