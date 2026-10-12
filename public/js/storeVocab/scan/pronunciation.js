// Plays a word aloud using the browser's built-in speech synthesis.
// Free, no API key, no server - but voice quality/availability depends on
// the user's own device and browser. Test on a few devices before demoing.
const SPEECH_LANG_CODES = { zh: "zh-CN", ms: "ms-MY", ta: "ta-IN" };

function speakWord(word, language) {
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = SPEECH_LANG_CODES[language] || "en-US";
  window.speechSynthesis.speak(utterance);
}