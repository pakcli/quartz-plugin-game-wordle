import { describe, expect, it } from "vitest";
import path from "node:path";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { WordleGameEmitter } from "../src/emitter";
import { assertFilePath, assertFullSlug, createCtx, createProcessedContent } from "./helpers";

describe("WordleGameEmitter", () => {
  it("writes wordle word manifest with extracted vocabulary", async () => {
    const outputDir = await fs.mkdtemp(path.join(tmpdir(), "quartz-wordle-"));
    const ctx = createCtx({ argv: { output: outputDir } });
    const emitter = WordleGameEmitter({
      manifestSlug: "static/wordle-words",
      minWordLength: 3,
      maxWordLength: 8,
    });

    const content = [
      createProcessedContent({
        slug: assertFullSlug("Unsur/Oksigen"),
        filePath: assertFilePath("Unsur/Oksigen.md"),
        frontmatter: {
          title: "Oksigen",
          clue: "Gas untuk bernapas",
          explanation: "Oksigen adalah unsur kimia penting.",
          tags: ["kimia", "gas"],
        },
      }),
      createProcessedContent({
        slug: assertFullSlug("Senyawa/Air"),
        filePath: assertFilePath("Senyawa/Air.md"),
        frontmatter: {
          title: "Air",
          clue: "Senyawa H2O esensial",
          tags: ["cairan"],
        },
      }),
    ];

    const result = await emitter.emit(ctx, content, {
      css: [],
      js: [],
      additionalHead: [],
    });

    const outputPaths = Array.isArray(result) ? result : await collectAsync(result);
    const outputPath = outputPaths[0];
    if (!outputPath) {
      throw new Error("Expected emitter to return an output path");
    }

    const manifest = JSON.parse(await fs.readFile(outputPath, "utf8"));

    expect(outputPath).toContain("wordle-words.json");
    expect(manifest.totalWords).toBe(2);
    expect(manifest.folders).toContain("Unsur");
    expect(manifest.folders).toContain("Senyawa");
    expect(manifest.words[0].word).toBe("OKSIGEN");
    expect(manifest.words[0].clue).toBe("Gas untuk bernapas");
    expect(manifest.words[1].word).toBe("AIR");
  });
});

const collectAsync = async <T>(iterable: AsyncIterable<T>): Promise<T[]> => {
  const results: T[] = [];
  for await (const item of iterable) {
    results.push(item);
  }
  return results;
};
