import path from "node:path";
import fs from "node:fs/promises";
import type {
  QuartzEmitterPlugin,
  ProcessedContent,
  BuildCtx,
  FilePath,
  FullSlug,
} from "@quartz-community/types";
import type {
  WordItem,
  WordleEmitterOptions,
  WordleManifest,
  WordLengthLevel,
} from "./types";

const defaultOptions: WordleEmitterOptions = {
  manifestSlug: "static/wordle-words",
  buildMode: "production",
  modes: "both",
  includeTitle: true,
  includeAliases: true,
  language: "all",
  minWordLength: 3,
  maxWordLength: 8,
};

const joinSegments = (...segments: string[]) =>
  segments
    .filter((segment) => segment.length > 0)
    .join("/")
    .replace(/\/+/g, "/") as FilePath;

const writeFile = async (
  outputDir: string,
  slug: FullSlug,
  ext: `.${string}` | "",
  content: string,
) => {
  const outputPath = joinSegments(outputDir, `${slug}${ext}`) as FilePath;
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, content);
  return outputPath;
};

/**
 * Normalizes text to uppercase ASCII letters only (A-Z).
 * Strips diacritics and removes symbols/spaces.
 */
function normalizeWord(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();
}

/**
 * Extracts a concise snippet/first sentence from note body text as fallback clue.
 */
function extractBodySnippet(tree: unknown): string {
  if (!tree || typeof tree !== "object") return "";
  let extracted = "";

  const visit = (node: Record<string, unknown>) => {
    if (extracted.length >= 140) return;
    if (node.type === "text" && typeof node.value === "string") {
      extracted += (node.value as string).trim() + " ";
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        visit(child as Record<string, unknown>);
        if (extracted.length >= 140) break;
      }
    }
  };

  visit(tree as Record<string, unknown>);
  return extracted.trim().slice(0, 140);
}

/**
 * Parses aliases from frontmatter (supports array or comma-separated string).
 */
function parseAliases(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map(String).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Quartz Emitter Plugin that scans the vault's processed content
 * and generates a structured Word Bank JSON manifest for the Wordle & Connect games.
 */
export const WordleGameEmitter: QuartzEmitterPlugin<Partial<WordleEmitterOptions>> = (
  userOptions?: Partial<WordleEmitterOptions>,
) => {
  const options = { ...defaultOptions, ...userOptions };

  const emitManifest = async (ctx: BuildCtx, content: ProcessedContent[]) => {
    const wordItems: WordItem[] = [];
    const seenWords = new Set<string>();

    let totalScanned = 0;
    let skippedDrafts = 0;
    let skippedLength = 0;
    let skippedFolder = 0;
    let aliasCount = 0;

    for (const [tree, vfile] of content) {
      totalScanned++;
      const frontmatter = (vfile.data?.frontmatter ?? {}) as Record<string, unknown>;
      if (frontmatter.draft === true) {
        skippedDrafts++;
        continue;
      }

      const slug = (vfile.data?.slug ?? "") as string;
      if (!slug || slug.startsWith("static/")) continue;

      // Determine folder / category
      const slugParts = slug.split("/").filter(Boolean);
      const folder = slugParts.length > 1 ? slugParts[0] : "Umum";

      // Apply folder filters
      if (options.sourceFolders && options.sourceFolders.length > 0) {
        if (!options.sourceFolders.some((f) => folder.toLowerCase() === f.toLowerCase())) {
          skippedFolder++;
          continue;
        }
      }
      if (options.excludeFolders && options.excludeFolders.length > 0) {
        if (options.excludeFolders.some((f) => folder.toLowerCase() === f.toLowerCase())) {
          skippedFolder++;
          continue;
        }
      }

      // Check note language (frontmatter.lang or 'id')
      const noteLang = String(frontmatter.lang ?? frontmatter.language ?? "id").toLowerCase();
      if (options.language !== "all" && noteLang !== options.language.toLowerCase()) {
        continue;
      }

      // Apply tag filter
      const rawTags = (frontmatter.tags as string[] | undefined) ?? [];
      const tags = Array.isArray(rawTags) ? rawTags.map(String) : [];
      if (options.allowedTags && options.allowedTags.length > 0) {
        const matches = tags.some((t) =>
          options.allowedTags?.some((allowed) => allowed.toLowerCase() === t.toLowerCase()),
        );
        if (!matches) continue;
      }

      // Base Clue and Explanation
      const noteTitle = String(frontmatter.title ?? slugParts[slugParts.length - 1] ?? "");
      const clue =
        typeof frontmatter.clue === "string" && frontmatter.clue.trim()
          ? frontmatter.clue.trim()
          : typeof frontmatter.description === "string" && frontmatter.description.trim()
            ? frontmatter.description.trim()
            : extractBodySnippet(tree) || `Istilah penting terkait materi ${folder}.`;

      const explanation =
        typeof frontmatter.explanation === "string" && frontmatter.explanation.trim()
          ? frontmatter.explanation.trim()
          : typeof frontmatter.description === "string" && frontmatter.description.trim()
            ? frontmatter.description.trim()
            : clue;

      // 1. Process Main Title/Word
      if (options.includeTitle) {
        const rawWord = String(frontmatter.word ?? frontmatter.title ?? slugParts[slugParts.length - 1] ?? "");
        const cleanWord = options.cleanWord ? options.cleanWord(rawWord) : normalizeWord(rawWord);

        if (cleanWord.length < options.minWordLength || cleanWord.length > options.maxWordLength) {
          skippedLength++;
        } else if (!seenWords.has(cleanWord)) {
          seenWords.add(cleanWord);
          const level: WordLengthLevel =
            cleanWord.length <= 4 ? "short" : cleanWord.length <= 6 ? "medium" : "long";

          wordItems.push({
            id: `word_${slug.replace(/[^a-zA-Z0-9]/g, "_")}_${cleanWord.toLowerCase()}`,
            word: cleanWord,
            clue,
            explanation,
            slug: `/${slug}`,
            folder,
            tags,
            level,
            lang: noteLang,
            isAlias: false,
            parentTitle: noteTitle,
          });
        }
      }

      // 2. Process Frontmatter Aliases (e.g. aliases: [Air, H2O, Aqua])
      if (options.includeAliases && frontmatter.aliases) {
        const aliases = parseAliases(frontmatter.aliases);
        for (const alias of aliases) {
          const cleanAlias = options.cleanWord ? options.cleanWord(alias) : normalizeWord(alias);
          if (
            cleanAlias.length >= options.minWordLength &&
            cleanAlias.length <= options.maxWordLength &&
            !seenWords.has(cleanAlias)
          ) {
            seenWords.add(cleanAlias);
            aliasCount++;
            const level: WordLengthLevel =
              cleanAlias.length <= 4 ? "short" : cleanAlias.length <= 6 ? "medium" : "long";

            wordItems.push({
              id: `alias_${slug.replace(/[^a-zA-Z0-9]/g, "_")}_${cleanAlias.toLowerCase()}`,
              word: cleanAlias,
              clue: `${clue} (Sinonim / Alias dari ${noteTitle})`,
              explanation: `Alias dari ${noteTitle}. ${explanation}`,
              slug: `/${slug}`,
              folder,
              tags,
              level,
              lang: noteLang,
              isAlias: true,
              parentTitle: noteTitle,
            });
          }
        }
      }
    }

    const uniqueFolders = Array.from(new Set(wordItems.map((item) => item.folder))).sort();
    const uniqueLangs = Array.from(new Set(wordItems.map((item) => item.lang || "id"))).sort();

    const manifest: WordleManifest = {
      generator: "@quartz-community/plugin-game-wordle",
      buildMode: options.buildMode,
      generatedAt: new Date().toISOString(),
      folders: uniqueFolders,
      languages: uniqueLangs,
      allowedModes: options.modes,
      totalWords: wordItems.length,
      words: wordItems,
      ...(options.buildMode === "dev"
        ? {
            devStats: {
              totalScannedNotes: totalScanned,
              skippedDrafts,
              skippedInvalidLength: skippedLength,
              skippedExcludedFolder: skippedFolder,
              aliasCount,
            },
          }
        : {}),
    };

    if (options.buildMode === "dev") {
      console.log(
        `\x1b[36m[WordleGameEmitter:dev]\x1b[0m Extracted ${wordItems.length} words (${aliasCount} aliases) from ${totalScanned} notes across ${uniqueFolders.length} folders. Allowed modes: ${options.modes}.`,
      );
    }

    const output = await writeFile(
      ctx.argv.output,
      options.manifestSlug as FullSlug,
      ".json",
      options.buildMode === "dev" ? JSON.stringify(manifest, null, 2) : JSON.stringify(manifest),
    );

    return [output];
  };

  return {
    name: "WordleGameEmitter",
    async emit(ctx, content, _resources) {
      return emitManifest(ctx, content);
    },
    async *partialEmit(ctx, content, _resources, _changeEvents) {
      const outputPaths = await emitManifest(ctx, content);
      for (const outputPath of outputPaths) {
        yield outputPath;
      }
    },
  };
};
