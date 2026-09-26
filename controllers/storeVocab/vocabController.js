const { segmentText } = require("../services/segmentationService");
const { getMeaning } = require("../services/translationService");
const vocabularyModel = require("../model/Vocabulary");

// Captures submitted text, segments it into words, fetches meanings, and saves each as a vocabulary entry.
async function captureText(req, res) {
  try {
    const { text, language, contextSentence } = req.body;

    const words = segmentText(text, language);

    const savedEntries = [];
    for (const word of words) {
      const meaning = await getMeaning(word, language);
      const entry = vocabularyModel.saveEntry({
        word,
        language,
        romanization: meaning.romanization,
        englishMeaning: meaning.englishMeaning,
        contextSentence: contextSentence || text,
        source: "text",
      });
      savedEntries.push(entry);
    }

    return res.status(201).json({ savedEntries });
  } catch (error) {
    console.error("Error capturing text:", error);
    return res
      .status(500)
      .json({ message: error.message || "Failed to process text." });
  }
}

// Retrieves all saved vocabulary entries.
function listVocabulary(req, res) {
  try {
    const entries = vocabularyModel.getAll();
    return res.status(200).json(entries);
  } catch (error) {
    console.error("Error listing vocabulary:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = { captureText, listVocabulary };