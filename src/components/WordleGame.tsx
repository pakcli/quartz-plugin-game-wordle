import type {
  QuartzComponent,
  QuartzComponentProps,
  QuartzComponentConstructor,
} from "@quartz-community/types";
import { classNames } from "../util/lang";
import type { WordleComponentOptions } from "../types";
import style from "./styles/wordle.scss";
// @ts-expect-error - inline script import handled by Quartz bundler / tsup inlineScriptPlugin
import script from "./scripts/wordle.inline";

export default ((opts?: WordleComponentOptions) => {
  const {
    title = "Tebak Kata Vault",
    defaultMode = "typing",
    modes = "both",
    devMode = false,
    allowFolderSelect = true,
    allowLanguageSelect = true,
    dataUrl = "/static/wordle-words.json",
    initialFolder = "",
    initialLanguage = "all",
    className = "quartz-wordle-container",
  } = opts ?? {};

  const WordleGame: QuartzComponent = (props: QuartzComponentProps) => {
    // Current note context (if user wants contextual mode)
    const currentSlug = String(props.fileData?.slug ?? "");
    const slugParts = currentSlug.split("/").filter(Boolean);
    const pageFolder = slugParts.length > 1 ? slugParts[0] : "";
    const activeFolder = initialFolder || pageFolder;

    return (
      <div
        class={classNames(className, "quartz-game-wordle-root")}
        data-title={title}
        data-default-mode={defaultMode}
        data-modes={modes}
        data-dev-mode={String(devMode)}
        data-allow-folder-select={String(allowFolderSelect)}
        data-allow-lang-select={String(allowLanguageSelect)}
        data-data-url={dataUrl}
        data-initial-folder={activeFolder}
        data-initial-lang={initialLanguage}
        data-current-slug={currentSlug}
      >
        <div class="qgw-loading">
          <div class="qgw-spinner" />
          <span>Memuat bank kata dari catatan Quartz...</span>
        </div>
      </div>
    );
  };

  WordleGame.css = style;
  WordleGame.afterDOMLoaded = script;

  return WordleGame;
}) satisfies QuartzComponentConstructor;
