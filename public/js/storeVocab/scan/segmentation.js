// Splits captured text into individual words.
// Chinese has no spaces between words, so it needs a real segmenter
// (segmentit, loaded as an ES module from a CDN in index.html).
// Malay and Tamil already have spaces between words, so a simple split works.
const NOISE_ONLY = /^[\p{P}\p{S}\p{N}\s]+$/u;

function cleanWords(rawWords) {
  const cleaned = rawWords
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w && !NOISE_ONLY.test(w));
  return [...new Set(cleaned)];
}

async function segmentText(text, language) {
  if (language === "zh") {
    // segmentitModule is set up in index.html via a dynamic import,
    // since segmentit is an npm package loaded through a CDN (esm.sh).
    const words = window.segmentitInstance.doSegment(text, { simple: true });
    return cleanWords(words);
  }
  // Malay and Tamil: already space-separated, like English.
  return cleanWords(text.split(/[\s,，。！？.!?;:"()]+/));
}