-- database/schema.sql
CREATE TABLE Vocabulary (
    VocabID INT IDENTITY(1,1) PRIMARY KEY,
    Word NVARCHAR(255) NOT NULL,
    Language VARCHAR(10) NOT NULL,
    Romanization NVARCHAR(255) NULL,
    EnglishMeaning NVARCHAR(500) NULL,
    ContextSentence NVARCHAR(1000) NULL,
    Source VARCHAR(20) NOT NULL DEFAULT 'text',
    CreatedAt DATETIME2 DEFAULT GETDATE()
);