async function getMeaning(word, language) {
  return {
    englishMeaning: `[meaning of "${word}" - placeholder]`,
    romanization: `[romanization - placeholder]`,
  };
}

module.exports = { getMeaning };