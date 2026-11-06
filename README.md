# @quartz-community/plugin-game-wordle

> **Interactive Wordle (Tebak Ketik) & Word Connect (Tebak Sambung) Dual-Mode Educational Game Plugin for Quartz**

Turn your Quartz digital garden and Obsidian vault into an interactive learning game! Notes are automatically parsed into active-recall puzzle words with clues, categories, and direct links back to your notes.

---

## 🌟 Key Features

1. **Dual Gameplay Engines in 1 Plugin**:
   - ⌨️ **Tebak Ketik (Wordle Mode)**: Classic Wordle 6-attempt grid, on-screen chiclet keyboard, flip animations, and closeness/SDM feedback meter.
   - 🎡 **Tebak Sambung (Connect Mode)**: Anagram letter platter with geometric polygon distribution, drag/swipe lines, and instant validation.
2. **Context & Selected Stuff Filtering**:
   - Visitors can filter by **Folder** (e.g. `/Unsur`, `/Senyawa`, `/Biologi`) or **Word Length**.
   - Embeddable as a standalone page (`/game`) or as a contextual widget in existing layouts.
3. **Active Recall & Direct Note Linking**:
   - When a word is solved, the explanation card presents a **"Baca Catatan Lengkap di Vault ↗"** button linking directly to the source note's slug.
4. **Zero-Config Automatic Extraction**:
   - Target words are derived from `frontmatter.word`, `title`, or filename.
   - Clues are taken from `frontmatter.clue`, `description`, or the first sentence of the article.

---

## 🚀 Quick Setup

### 1. Register in `quartz.config.ts`

Add both the **Emitter** (which builds the word bank JSON) and optionally the **Component**:

```ts
import { WordleGameEmitter } from "@quartz-community/plugin-game-wordle";

export const config: QuartzConfig = {
  plugins: {
    emitters: [
      // ... default Quartz emitters
      WordleGameEmitter({
        manifestSlug: "static/wordle-words",
        minWordLength: 3,
        maxWordLength: 8,
        sourceFolders: ["Unsur", "Senyawa", "Biologi"], // Optional folder whitelist
      }),
    ],
  },
};
```

### 2. Add Component to `quartz.layout.ts`

To display the game on a custom page or in the footer / center body:

```ts
import { WordleGame } from "@quartz-community/plugin-game-wordle";

export const defaultContentPageLayout: PageLayout = {
  // ...
  afterBody: [
    WordleGame({
      title: "Tebak Kata Vault",
      defaultMode: "typing",      // 'typing' | 'connect'
      enableBothModes: true,       // Show switcher button
      allowFolderSelect: true,     // Allow visitor to pick folder
    }),
  ],
};
```

---

## 📝 Markdown Note Formatting (Optional Customization)

While words and clues are auto-generated from your standard Markdown notes, you can customize them with frontmatter:

```markdown
---
title: Oksigen
clue: Unsur gas yang kita hirup untuk respirasi sel.
explanation: Oksigen (O2) adalah unsur kimia nomor 8 dan pembentuk 21% atmosfer bumi.
tags: [kimia, unsur]
---

Oksigen adalah gas tidak berwarna dan tidak berbau...
```

---

## ⚙️ Configuration Reference

### Emitter Options (`WordleGameEmitter`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `manifestSlug` | `string` | `"static/wordle-words"` | Relative output path for the JSON word bank |
| `sourceFolders` | `string[]` | `undefined` | Only include notes located in these folders |
| `excludeFolders` | `string[]` | `undefined` | Exclude notes from these folders |
| `minWordLength` | `number` | `3` | Minimum word length allowed |
| `maxWordLength` | `number` | `8` | Maximum word length allowed |
| `allowedTags` | `string[]` | `undefined` | Filter notes requiring at least one matching tag |

### Component Options (`WordleGame`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `title` | `string` | `"Tebak Kata Vault"` | Widget header title |
| `defaultMode` | `"typing" \| "connect"` | `"typing"` | Default starting game mode |
| `enableBothModes` | `boolean` | `true` | Allows players to toggle between both modes |
| `allowFolderSelect` | `boolean` | `true` | Displays folder dropdown filter |
| `dataUrl` | `string` | `"/static/wordle-words.json"` | JSON endpoint to fetch word bank from |

---

## 📄 License

MIT © Quartz Community
