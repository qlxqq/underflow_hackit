const { useDefault } = require("segmentit");
const segmentit = useDefault();

function segmentText(text, language) {
  if (language === "zh") {
    const result = segmentit.doSegment(text, { simple: true });
    return result;
  }
  return text.split(/[\s,，。！？.!?]+/).filter(Boolean);
}

module.exports = { segmentText };