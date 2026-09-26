const sql = require("mssql");
const dbConfig = require("../config/config");

// Retrieves all vocabulary entries needed for this request and returns the resulting data.
async function getAll() {
  const connection = await sql.connect(dbConfig);
  const result = await connection.request().query(`SELECT * FROM Vocabulary ORDER BY CreatedAt DESC;`);
  return result.recordset;
}

// Creates a vocabulary entry using validated inputs and persists the result for downstream use.
async function saveEntry(entry) {
  const connection = await sql.connect(dbConfig);
  const request = connection.request();

  request.input("Word", sql.NVarChar(255), entry.word);
  request.input("Language", sql.VarChar(10), entry.language);
  request.input("Romanization", sql.NVarChar(255), entry.romanization || null);
  request.input("EnglishMeaning", sql.NVarChar(500), entry.englishMeaning || null);
  request.input("ContextSentence", sql.NVarChar(1000), entry.contextSentence || null);
  request.input("Source", sql.VarChar(20), entry.source || "text");

  const result = await request.query(`
    INSERT INTO Vocabulary (Word, Language, Romanization, EnglishMeaning, ContextSentence, Source)
    OUTPUT INSERTED.*
    VALUES (@Word, @Language, @Romanization, @EnglishMeaning, @ContextSentence, @Source);
  `);

  return result.recordset[0];
}

module.exports = { getAll, saveEntry };