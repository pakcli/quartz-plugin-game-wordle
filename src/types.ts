export type {
  BuildCtx,
  ChangeEvent,
  CSSResource,
  JSResource,
  ProcessedContent,
  QuartzEmitterPlugin,
  QuartzEmitterPluginInstance,
  QuartzFilterPlugin,
  QuartzFilterPluginInstance,
  QuartzPluginData,
  QuartzTransformerPlugin,
  QuartzTransformerPluginInstance,
  StaticResources,
  PageMatcher,
  PageGenerator,
  VirtualPage,
  QuartzPageTypePlugin,
  QuartzPageTypePluginInstance,
  QuartzComponent,
  QuartzComponentProps,
  QuartzComponentConstructor,
} from "@quartz-community/types";

export type WordLengthLevel = "short" | "medium" | "long";
export type WordleGameMode = "typing" | "connect";
export type WordleAllowedModes = "both" | "typing" | "connect";
export type WordleBuildMode = "dev" | "production";

export interface WordItem {
  id: string;
  word: string;
  clue: string;
  explanation: string;
  slug: string;
  folder: string;
  tags: string[];
  level: WordLengthLevel;
  lang?: string;
  isAlias?: boolean;
  parentTitle?: string;
}

export interface WordleManifest {
  generator: string;
  buildMode: WordleBuildMode;
  generatedAt: string;
  folders: string[];
  languages: string[];
  allowedModes: WordleAllowedModes;
  totalWords: number;
  words: WordItem[];
  devStats?: {
    totalScannedNotes: number;
    skippedDrafts: number;
    skippedInvalidLength: number;
    skippedExcludedFolder: number;
    aliasCount: number;
  };
}

export interface WordleEmitterOptions {
  /** Filename / slug to emit the JSON word bank manifest at (default: 'static/wordle-words') */
  manifestSlug: string;
  /** Build mode: 'dev' logs detailed extraction diagnostics; 'production' produces compact outputs */
  buildMode: WordleBuildMode;
  /** Which modes to allow on build: 'both' | 'typing' | 'connect' (default: 'both') */
  modes: WordleAllowedModes;
  /** Filter to include only notes located in specific folder prefixes (e.g. ['Unsur', 'Senyawa']) */
  sourceFolders?: string[];
  /** Exclude notes from specific folders (e.g. ['templates', 'archive']) */
  excludeFolders?: string[];
  /** Whether to parse and include note title/filename as a target word (default: true) */
  includeTitle: boolean;
  /** Whether to parse Obsidian frontmatter `aliases:` as additional target words (default: true) */
  includeAliases: boolean;
  /** Language filter ('id', 'en', or 'all'; default: 'all') */
  language: string;
  /** Minimum character length for valid words (default: 3) */
  minWordLength: number;
  /** Maximum character length for valid words (default: 8) */
  maxWordLength: number;
  /** Only include notes with at least one of these tags (optional) */
  allowedTags?: string[];
  /** Optional custom word cleaner function */
  cleanWord?: (rawWord: string) => string;
}

export interface WordleComponentOptions {
  /** Title displayed at the top of the game widget */
  title?: string;
  /** Default active mode when loaded: 'typing' (Wordle) or 'connect' (Wheel) */
  defaultMode?: WordleGameMode;
  /** Build/runtime allowed modes: 'both' | 'typing' | 'connect' (default: 'both') */
  modes?: WordleAllowedModes;
  /** In dev mode, show word count debug badges & reload toggles */
  devMode?: boolean;
  /** Allow visitors to pick which folder / selected stuff to practice (default: true) */
  allowFolderSelect?: boolean;
  /** Allow language filter toggle if multiple languages are detected (default: true) */
  allowLanguageSelect?: boolean;
  /** Relative URL to fetch the word bank JSON manifest from (default: '/static/wordle-words.json') */
  dataUrl?: string;
  /** Initial selected folder filter (optional) */
  initialFolder?: string;
  /** Initial selected language (optional, e.g. 'id') */
  initialLanguage?: string;
  /** Additional CSS class name */
  className?: string;
}
