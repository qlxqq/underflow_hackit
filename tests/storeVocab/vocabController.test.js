jest.mock("../../services/segmentationService", () => ({
  segmentText: jest.fn(),
}));

jest.mock("../../services/translationService", () => ({
  getMeaning: jest.fn(),
}));

jest.mock("../../model/storeVocab/vocabModel", () => ({
  saveEntry: jest.fn(),
  getAll: jest.fn(),
}));

const { segmentText } = require("../../services/segmentationService");
const { getMeaning } = require("../../services/translationService");
const vocabModel = require("../../model/storeVocab/vocabModel");
const vocabController = require("../../controllers/storeVocab/vocabController");

describe("vocabController", () => {
  let req;
  let res;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe("captureText", () => {
    test("segments text, fetches meanings, and saves each word", async () => {
      req.body = { text: "我很开心", language: "zh" };

      segmentText.mockReturnValue(["我", "很", "开心"]);
      getMeaning.mockResolvedValue({
        englishMeaning: "placeholder meaning",
        romanization: "placeholder romanization",
      });
      vocabModel.saveEntry.mockImplementation((entry) =>
        Promise.resolve({ VocabID: Math.random(), ...entry }),
      );

      await vocabController.captureText(req, res);

      expect(segmentText).toHaveBeenCalledWith("我很开心", "zh");
      expect(getMeaning).toHaveBeenCalledTimes(3);
      expect(vocabModel.saveEntry).toHaveBeenCalledTimes(3);
      expect(vocabModel.saveEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          word: "我",
          language: "zh",
          source: "text",
        }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          savedEntries: expect.arrayContaining([
            expect.objectContaining({ word: "我" }),
          ]),
        }),
      );
    });

    test("falls back to the full text as context when contextSentence is not given", async () => {
      req.body = { text: "suka makan", language: "ms" };

      segmentText.mockReturnValue(["suka", "makan"]);
      getMeaning.mockResolvedValue({
        englishMeaning: "placeholder",
        romanization: null,
      });
      vocabModel.saveEntry.mockImplementation((entry) =>
        Promise.resolve(entry),
      );

      await vocabController.captureText(req, res);

      expect(vocabModel.saveEntry).toHaveBeenCalledWith(
        expect.objectContaining({ contextSentence: "suka makan" }),
      );
    });

    test("returns a 500 error when something fails unexpectedly", async () => {
      req.body = { text: "开心", language: "zh" };
      segmentText.mockImplementation(() => {
        throw new Error("segmentation exploded");
      });

      await vocabController.captureText(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "segmentation exploded" }),
      );
    });
  });

  describe("listVocabulary", () => {
    test("returns all saved vocabulary entries", () => {
      const fakeEntries = [{ VocabID: 1, Word: "开心" }];
      vocabModel.getAll.mockReturnValue(fakeEntries);

      vocabController.listVocabulary(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(fakeEntries);
    });

    test("returns a 500 error if fetching fails", () => {
      vocabModel.getAll.mockImplementation(() => {
        throw new Error("db exploded");
      });

      vocabController.listVocabulary(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Internal server error" }),
      );
    });
  });
});