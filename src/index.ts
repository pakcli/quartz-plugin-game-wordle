export { WordleGameEmitter } from "./emitter";
export { default as WordleGame } from "./components/WordleGame";

export type {
  WordItem,
  WordleManifest,
  WordleEmitterOptions,
  WordleComponentOptions,
  WordleGameMode,
  WordLengthLevel,
} from "./types";

// Re-export shared types from @quartz-community/types
export type {
  QuartzComponent,
  QuartzComponentProps,
  QuartzComponentConstructor,
  StringResource,
  QuartzTransformerPlugin,
  QuartzFilterPlugin,
  QuartzEmitterPlugin,
  QuartzPageTypePlugin,
  QuartzPageTypePluginInstance,
  PageMatcher,
  PageGenerator,
  VirtualPage,
} from "@quartz-community/types";
