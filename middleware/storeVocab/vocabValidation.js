const Joi = require("joi");
const validateSchema = require("./schemaValidation");

const captureTextSchema = Joi.object({
  text: Joi.string().trim().min(1).required().messages({
    "string.empty": "text is required.",
    "any.required": "text is required.",
  }),
  language: Joi.string().valid("zh", "ms", "ta").required().messages({
    "any.only": "language must be one of zh, ms, or ta.",
    "any.required": "language is required.",
  }),
  contextSentence: Joi.string().trim().optional(),
});

module.exports = {
  validateCaptureText: validateSchema(captureTextSchema),
};