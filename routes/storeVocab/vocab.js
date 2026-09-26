const express = require("express");
const router = express.Router();
const { captureText, listVocabulary } = require("../controllers/vocabularyController");
const { validateCaptureText } = require("../middleware/vocabularyValidation");

router.post("/capture-text", validateCaptureText, captureText);
router.get("/", listVocabulary);

module.exports = router;