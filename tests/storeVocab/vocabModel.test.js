jest.mock("mssql", () => ({
  connect: jest.fn(),
  NVarChar: jest.fn(() => "NVarChar"),
  VarChar: jest.fn(() => "VarChar"),
}));

const sql = require("mssql");
const vocabModel = require("../../model/storeVocab/vocabModel");

describe("vocabModel", () => {
  let mockRequest;
  let mockConnection;

  beforeEach(() => {
    mockRequest = {
      input: jest.fn().mockReturnThis(),
      query: jest.fn(),
    };

    mockConnection = {
      request: jest.fn(() => mockRequest),
    };

    sql.connect.mockResolvedValue(mockConnection);

    jest.clearAllMocks();
    sql.connect.mockResolvedValue(mockConnection);
  });

  describe("getAll", () => {
    test("returns all vocabulary entries from the database", async () => {
      const fakeEntries = [
        { VocabID: 1, Word: "开心", Language: "zh", EnglishMeaning: "happy" },
        { VocabID: 2, Word: "suka", Language: "ms", EnglishMeaning: "like" },
      ];
      mockRequest.query.mockResolvedValue({ recordset: fakeEntries });

      const result = await vocabModel.getAll();

      expect(sql.connect).toHaveBeenCalled();
      expect(mockRequest.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM Vocabulary"),
      );
      expect(result).toEqual(fakeEntries);
    });

    test("returns an empty array when no entries exist", async () => {
      mockRequest.query.mockResolvedValue({ recordset: [] });

      const result = await vocabModel.getAll();

      expect(result).toEqual([]);
    });
  });

  describe("saveEntry", () => {
    test("inserts a new vocabulary entry and returns the inserted row", async () => {
      const inputEntry = {
        word: "谢谢",
        language: "zh",
        romanization: "xiè xiè",
        englishMeaning: "thank you",
        contextSentence: "谢谢你的帮忙",
        source: "text",
      };
      const insertedRow = {
        VocabID: 3,
        Word: "谢谢",
        Language: "zh",
        Romanization: "xiè xiè",
        EnglishMeaning: "thank you",
        ContextSentence: "谢谢你的帮忙",
        Source: "text",
        CreatedAt: "2026-09-28T00:00:00.000Z",
      };
      mockRequest.query.mockResolvedValue({ recordset: [insertedRow] });

      const result = await vocabModel.saveEntry(inputEntry);

      expect(mockRequest.input).toHaveBeenCalledWith(
        "Word",
        expect.anything(),
        "谢谢",
      );
      expect(mockRequest.input).toHaveBeenCalledWith(
        "Language",
        expect.anything(),
        "zh",
      );
      expect(mockRequest.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO Vocabulary"),
      );
      expect(result).toEqual(insertedRow);
    });

    test("defaults optional fields to null when not provided", async () => {
      const inputEntry = {
        word: "makan",
        language: "ms",
        englishMeaning: "eat",
      };
      mockRequest.query.mockResolvedValue({
        recordset: [{ VocabID: 4, Word: "makan" }],
      });

      await vocabModel.saveEntry(inputEntry);

      expect(mockRequest.input).toHaveBeenCalledWith(
        "Romanization",
        expect.anything(),
        null,
      );
      expect(mockRequest.input).toHaveBeenCalledWith(
        "ContextSentence",
        expect.anything(),
        null,
      );
    });
  });
});