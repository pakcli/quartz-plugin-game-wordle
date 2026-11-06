interface WordItem {
  id: string;
  word: string;
  clue: string;
  explanation: string;
  slug: string;
  folder: string;
  tags: string[];
  level: "short" | "medium" | "long";
}

interface WordleManifest {
  generator: string;
  folders: string[];
  totalWords: number;
  words: WordItem[];
}

interface LetterNode {
  char: string;
  origIndex: number;
  x: number;
  y: number;
}

// Fallback vocabulary in case fetch is delayed or used standalone
const FALLBACK_WORDS: WordItem[] = [
  {
    id: "fb_oksigen",
    word: "OKSIGEN",
    clue: "Unsur gas yang sangat dibutuhkan makhluk hidup untuk respirasi.",
    explanation: "Oksigen (O2) adalah gas tidak berwarna dan tidak berbau pembentuk 21% atmosfer bumi.",
    slug: "/",
    folder: "Kimia",
    tags: ["unsur"],
    level: "long",
  },
  {
    id: "fb_atom",
    word: "ATOM",
    clue: "Partikel terkecil dari suatu unsur kimia yang mempertahankan sifat kimiawinya.",
    explanation: "Atom terdiri dari inti atom (proton dan neutron) yang dikelilingi oleh awan elektron.",
    slug: "/",
    folder: "Fisika",
    tags: ["materi"],
    level: "short",
  },
  {
    id: "fb_sel",
    word: "SEL",
    clue: "Unit struktural dan fungsional terkecil dari organisme hidup.",
    explanation: "Semua makhluk hidup tersusun atas satu atau lebih sel dengan membran pelindung.",
    slug: "/",
    folder: "Biologi",
    tags: ["sel"],
    level: "short",
  },
];

document.addEventListener("nav", () => {
  const roots = document.querySelectorAll<HTMLElement>(".quartz-game-wordle-root");
  roots.forEach(initWordleWidget);
});

async function initWordleWidget(root: HTMLElement) {
  const dataUrl = root.dataset.dataUrl || "/static/wordle-words.json";
  const initialFolder = root.dataset.initialFolder || "";
  const enableBoth = root.dataset.enableBoth !== "false";
  let currentMode = (root.dataset.defaultMode === "connect" ? "connect" : "typing") as
    | "typing"
    | "connect";

  let wordsPool: WordItem[] = [];
  let availableFolders: string[] = [];

  try {
    const res = await fetch(dataUrl);
    if (res.ok) {
      const manifest: WordleManifest = await res.json();
      wordsPool = manifest.words || [];
      availableFolders = manifest.folders || [];
    } else {
      wordsPool = FALLBACK_WORDS;
      availableFolders = ["Kimia", "Fisika", "Biologi"];
    }
  } catch (_e) {
    wordsPool = FALLBACK_WORDS;
    availableFolders = ["Kimia", "Fisika", "Biologi"];
  }

  if (wordsPool.length === 0) {
    wordsPool = FALLBACK_WORDS;
  }

  // Active filters
  let selectedFolder = initialFolder && availableFolders.includes(initialFolder) ? initialFolder : "ALL";
  let selectedLength = "ALL";
  let activeWordIndex = 0;
  let activeWord: WordItem = wordsPool[0];

  // Mode 1: Typing state
  let typingGuesses: string[] = [];
  let currentInput = "";
  const maxAttempts = 6;
  const keyboardStatus: Record<string, "right" | "wrong-pos" | "wrong"> = {};
  let isChecking = false;

  // Mode 2: Connect state
  let connectNodes: LetterNode[] = [];
  let selectedIndices: number[] = [];
  let isDragging = false;
  let pointerPos: { x: number; y: number } | null = null;

  function filterWords(): WordItem[] {
    return wordsPool.filter((w) => {
      if (selectedFolder !== "ALL" && w.folder.toLowerCase() !== selectedFolder.toLowerCase()) {
        return false;
      }
      if (selectedLength === "3-4" && (w.word.length < 3 || w.word.length > 4)) return false;
      if (selectedLength === "5-6" && (w.word.length < 5 || w.word.length > 6)) return false;
      if (selectedLength === "7+" && w.word.length < 7) return false;
      return true;
    });
  }

  function pickNewWord() {
    const pool = filterWords();
    const finalPool = pool.length > 0 ? pool : wordsPool;
    const nextIdx = Math.floor(Math.random() * finalPool.length);
    activeWord = finalPool[nextIdx];
    activeWordIndex = nextIdx;

    // Reset states
    typingGuesses = [];
    currentInput = "";
    isChecking = false;
    for (const k in keyboardStatus) delete keyboardStatus[k];

    setupConnectWheel();
    render();
  }

  function setupConnectWheel() {
    const chars = activeWord.word.split("");
    // Shuffle chars
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    const cx = 130;
    const cy = 130;
    const radius = 86;
    const len = chars.length;
    connectNodes = [];

    if (len === 7) {
      // 6 on perimeter, 1 in center
      for (let i = 0; i < 6; i++) {
        const angle = (i * 60 - 90) * (Math.PI / 180);
        connectNodes.push({
          char: chars[i],
          origIndex: i,
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
        });
      }
      connectNodes.push({
        char: chars[6],
        origIndex: 6,
        x: cx,
        y: cy,
      });
    } else {
      for (let i = 0; i < len; i++) {
        const angle = (i * (360 / len) - 90) * (Math.PI / 180);
        connectNodes.push({
          char: chars[i],
          origIndex: i,
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
        });
      }
    }

    selectedIndices = [];
    pointerPos = null;
  }

  // Evaluate guess in Wordle two-pass check
  function evaluateGuess(guess: string, target: string) {
    const statuses: ("right" | "wrong-pos" | "wrong")[] = Array(guess.length).fill("wrong");
    const targetChars = target.split("");
    const guessChars = guess.split("");

    // Pass 1: exact matches
    for (let i = 0; i < guessChars.length; i++) {
      if (guessChars[i] === targetChars[i]) {
        statuses[i] = "right";
        targetChars[i] = "#";
      }
    }

    // Pass 2: wrong position
    for (let i = 0; i < guessChars.length; i++) {
      if (statuses[i] !== "right") {
        const found = targetChars.indexOf(guessChars[i]);
        if (found !== -1) {
          statuses[i] = "wrong-pos";
          targetChars[found] = "#";
        }
      }
    }

    return statuses;
  }

  // Calculate SDM Meter Score
  function computeCloseness(guess: string, target: string) {
    const statuses = evaluateGuess(guess, target);
    let score = 0;
    statuses.forEach((s) => {
      if (s === "right") score += 2;
      else if (s === "wrong-pos") score += 1;
    });
    const percent = Math.round((score / (target.length * 2)) * 100);
    let label = "SDM Revisi (Masih Jauh)";
    if (percent === 100) label = "SDM Mengerikan (Tepat!)";
    else if (percent >= 40) label = "SDM Tinggi (Hampir Dekat)";
    return { percent, label };
  }

  // Handle Typing submission
  function handleTypingSubmit() {
    if (isChecking) return;
    const targetLen = activeWord.word.length;
    if (currentInput.length !== targetLen) {
      shakeCurrentRow();
      return;
    }

    const guess = currentInput;
    const statuses = evaluateGuess(guess, activeWord.word);

    // Update keyboard statuses
    guess.split("").forEach((char, idx) => {
      const st = statuses[idx];
      const prev = keyboardStatus[char];
      if (st === "right") keyboardStatus[char] = "right";
      else if (st === "wrong-pos" && prev !== "right") keyboardStatus[char] = "wrong-pos";
      else if (!prev) keyboardStatus[char] = "wrong";
    });

    typingGuesses.push(guess);
    currentInput = "";

    if (guess === activeWord.word) {
      showVictoryModal(true);
    } else if (typingGuesses.length >= maxAttempts) {
      showVictoryModal(false);
    } else {
      render();
    }
  }

  function shakeCurrentRow() {
    const row = root.querySelector(".qgw-row.active");
    if (row) {
      row.classList.add("qgw-shake");
      setTimeout(() => row.classList.remove("qgw-shake"), 450);
    }
  }

  // Handle Connect submission
  function handleConnectCheck() {
    const target = activeWord.word;
    const constructed = selectedIndices.map((i) => connectNodes[i].char).join("");

    if (constructed.length !== target.length) return;

    if (constructed === target) {
      showVictoryModal(true);
    } else {
      const slots = root.querySelector(".qgw-word-slots");
      if (slots) {
        slots.classList.add("qgw-shake");
        setTimeout(() => {
          slots.classList.remove("qgw-shake");
          selectedIndices = [];
          pointerPos = null;
          render();
        }, 500);
      }
    }
  }

  function showVictoryModal(won: boolean) {
    const modal = document.createElement("div");
    modal.className = "qgw-modal-backdrop";
    modal.innerHTML = `
      <div class="qgw-modal-card">
        <span class="qgw-modal-badge">${won ? "🎉 BERHASIL DITEBAK!" : "💡 BELUM TEPAT"}</span>
        <h2>${won ? "HEBAT SEKALI!" : "JAWABANNYA ADALAH:"}</h2>
        <div class="qgw-target-word-display">${activeWord.word}</div>
        <div class="qgw-explanation-box">
          <strong>Petunjuk:</strong> ${activeWord.clue}<br/><br/>
          <strong>Penjelasan Lengkap:</strong> ${activeWord.explanation}
        </div>
        <div class="qgw-modal-actions">
          <a class="qgw-btn-read-note" href="${activeWord.slug}">
            <span>📖 Baca Catatan Lengkap di Vault</span>
            <span>↗</span>
          </a>
          <button class="qgw-chiclet-btn qgw-btn-next-round">➔ Tebak Kata Berikutnya</button>
        </div>
      </div>
    `;

    modal.querySelector(".qgw-btn-next-round")?.addEventListener("click", () => {
      modal.remove();
      pickNewWord();
    });

    root.appendChild(modal);
  }

  // Render Full UI
  function render() {
    const targetWord = activeWord.word;
    const targetLen = targetWord.length;

    let sdmHtml = "";
    if (currentMode === "typing" && typingGuesses.length > 0) {
      const lastGuess = typingGuesses[typingGuesses.length - 1];
      const { percent, label } = computeCloseness(lastGuess, targetWord);
      sdmHtml = `
        <div class="qgw-sdm-meter">
          <div class="qgw-sdm-header">
            <span>Meter Kedekatan</span>
            <span class="qgw-sdm-label">${label} (${percent}%)</span>
          </div>
          <div class="qgw-sdm-bar-bg">
            <div class="qgw-sdm-bar-fill" style="width: ${percent}%;"></div>
          </div>
        </div>
      `;
    }

    root.innerHTML = `
      <div class="qgw-header">
        <div class="qgw-title-row">
          <h3>🎮 ${root.dataset.title || "Tebak Kata Vault"}</h3>
          <span class="qgw-stats-badge">Folder: ${activeWord.folder}</span>
        </div>

        <div class="qgw-filter-row">
          <label>Topik:</label>
          <select class="qgw-select-folder">
            <option value="ALL" ${selectedFolder === "ALL" ? "selected" : ""}>Semua Topik (${wordsPool.length} kata)</option>
            ${availableFolders
              .map(
                (f) =>
                  `<option value="${f}" ${selectedFolder.toLowerCase() === f.toLowerCase() ? "selected" : ""}>📁 ${f}</option>`,
              )
              .join("")}
          </select>

          <label>Panjang:</label>
          <select class="qgw-select-length">
            <option value="ALL" ${selectedLength === "ALL" ? "selected" : ""}>Semua</option>
            <option value="3-4" ${selectedLength === "3-4" ? "selected" : ""}>3-4 Huruf</option>
            <option value="5-6" ${selectedLength === "5-6" ? "selected" : ""}>5-6 Huruf</option>
            <option value="7+" ${selectedLength === "7+" ? "selected" : ""}>7+ Huruf</option>
          </select>
        </div>

        ${
          enableBoth
            ? `
          <div class="qgw-mode-switch">
            <button class="${currentMode === "typing" ? "active" : ""}" data-mode="typing">⌨️ Tebak Ketik (Wordle)</button>
            <button class="${currentMode === "connect" ? "active" : ""}" data-mode="connect">🎡 Tebak Sambung (Wheel)</button>
          </div>
        `
            : ""
        }
      </div>

      <div class="qgw-clue-card">
        <span class="qgw-clue-tag">Clue (${targetLen} Huruf)</span>
        <div class="qgw-clue-text">${activeWord.clue}</div>
      </div>

      ${
        currentMode === "typing"
          ? `
        <div class="qgw-typing-view">
          ${sdmHtml}
          <div class="qgw-grid">
            ${renderWordleGrid(targetLen)}
          </div>
          <div class="qgw-tools-row">
            <button class="qgw-chiclet-btn qgw-btn-reveal">💡 Buka 1 Huruf</button>
            <button class="qgw-chiclet-btn qgw-btn-skip">Lewati ➔</button>
          </div>
          <div class="qgw-keyboard">
            ${renderVirtualKeyboard()}
          </div>
        </div>
      `
          : `
        <div class="qgw-connect-view">
          <div class="qgw-word-slots">
            ${Array.from({ length: targetLen })
              .map((_, i) => {
                const char = selectedIndices[i] !== undefined ? connectNodes[selectedIndices[i]].char : "";
                return `<div class="qgw-slot ${char ? "filled" : ""}">${char}</div>`;
              })
              .join("")}
          </div>
          <div class="qgw-wheel-wrap">
            <div class="qgw-wheel-platter"></div>
            <svg class="qgw-svg-layer">
              ${renderSvgLines()}
            </svg>
            ${connectNodes
              .map((node, idx) => {
                const isSelected = selectedIndices.includes(idx);
                return `
                  <div class="qgw-letter-node ${isSelected ? "selected" : ""}"
                       style="left: ${node.x}px; top: ${node.y}px;"
                       data-index="${idx}">
                    ${node.char}
                  </div>
                `;
              })
              .join("")}
          </div>
          <div class="qgw-connect-actions">
            <button class="qgw-chiclet-btn qgw-btn-shuffle">🔀 Acak</button>
            <button class="qgw-chiclet-btn qgw-btn-clear">↩️ Hapus</button>
            <button class="qgw-chiclet-btn qgw-btn-skip">Lewati ➔</button>
          </div>
        </div>
      `
      }
    `;

    attachEventListeners();
  }

  function renderWordleGrid(wordLen: number): string {
    let rows = "";
    for (let r = 0; r < maxAttempts; r++) {
      if (r < typingGuesses.length) {
        const guess = typingGuesses[r];
        const statuses = evaluateGuess(guess, activeWord.word);
        rows += `<div class="qgw-row">`;
        for (let c = 0; c < wordLen; c++) {
          rows += `<div class="qgw-tile ${statuses[c]} flip">${guess[c]}</div>`;
        }
        rows += `</div>`;
      } else if (r === typingGuesses.length) {
        rows += `<div class="qgw-row active">`;
        for (let c = 0; c < wordLen; c++) {
          const char = currentInput[c] || "";
          rows += `<div class="qgw-tile ${char ? "active" : ""}">${char}</div>`;
        }
        rows += `</div>`;
      } else {
        rows += `<div class="qgw-row">`;
        for (let c = 0; c < wordLen; c++) {
          rows += `<div class="qgw-tile"></div>`;
        }
        rows += `</div>`;
      }
    }
    return rows;
  }

  function renderVirtualKeyboard(): string {
    const row1 = ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"];
    const row2 = ["A", "S", "D", "F", "G", "H", "J", "K", "L"];
    const row3 = ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"];

    const renderKey = (k: string) => {
      const st = keyboardStatus[k] || "";
      const isWide = k === "ENTER" || k === "⌫";
      return `<button class="qgw-key ${isWide ? "qgw-key-wide" : ""} ${st}" data-key="${k}">${k}</button>`;
    };

    return `
      <div class="qgw-kb-row">${row1.map(renderKey).join("")}</div>
      <div class="qgw-kb-row">${row2.map(renderKey).join("")}</div>
      <div class="qgw-kb-row">${row3.map(renderKey).join("")}</div>
    `;
  }

  function renderSvgLines(): string {
    if (selectedIndices.length === 0) return "";
    let lines = "";
    for (let i = 0; i < selectedIndices.length - 1; i++) {
      const from = connectNodes[selectedIndices[i]];
      const to = connectNodes[selectedIndices[i + 1]];
      lines += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" />`;
    }
    if (pointerPos && selectedIndices.length > 0) {
      const last = connectNodes[selectedIndices[selectedIndices.length - 1]];
      lines += `<line x1="${last.x}" y1="${last.y}" x2="${pointerPos.x}" y2="${pointerPos.y}" />`;
    }
    return lines;
  }

  function attachEventListeners() {
    // Mode switch
    root.querySelectorAll(".qgw-mode-switch button").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const mode = (e.currentTarget as HTMLElement).dataset.mode as "typing" | "connect";
        if (mode && mode !== currentMode) {
          currentMode = mode;
          render();
        }
      });
    });

    // Folder & length filter
    root.querySelector(".qgw-select-folder")?.addEventListener("change", (e) => {
      selectedFolder = (e.target as HTMLSelectElement).value;
      pickNewWord();
    });

    root.querySelector(".qgw-select-length")?.addEventListener("change", (e) => {
      selectedLength = (e.target as HTMLSelectElement).value;
      pickNewWord();
    });

    // Skip word
    root.querySelectorAll(".qgw-btn-skip").forEach((btn) => {
      btn.addEventListener("click", () => pickNewWord());
    });

    // Reveal letter (Powerup)
    root.querySelector(".qgw-btn-reveal")?.addEventListener("click", () => {
      const target = activeWord.word;
      for (let i = 0; i < target.length; i++) {
        if (currentInput[i] !== target[i]) {
          currentInput = currentInput.slice(0, i) + target[i] + currentInput.slice(i + 1);
          render();
          break;
        }
      }
    });

    if (currentMode === "typing") {
      // Virtual keys
      root.querySelectorAll(".qgw-key").forEach((keyEl) => {
        keyEl.addEventListener("click", (e) => {
          const k = (e.currentTarget as HTMLElement).dataset.key;
          if (!k) return;
          if (k === "ENTER") {
            handleTypingSubmit();
          } else if (k === "⌫") {
            currentInput = currentInput.slice(0, -1);
            render();
          } else if (currentInput.length < activeWord.word.length) {
            currentInput += k;
            render();
          }
        });
      });
    } else {
      // Connect Wheel interactions
      const wheelWrap = root.querySelector<HTMLElement>(".qgw-wheel-wrap");
      if (wheelWrap) {
        wheelWrap.addEventListener("pointerdown", (e) => {
          isDragging = true;
          const rect = wheelWrap.getBoundingClientRect();
          const px = e.clientX - rect.left;
          const py = e.clientY - rect.top;
          pointerPos = { x: px, y: py };

          // Hit test initial node
          connectNodes.forEach((node, idx) => {
            const dist = Math.hypot(node.x - px, node.y - py);
            if (dist < 32 && !selectedIndices.includes(idx)) {
              selectedIndices.push(idx);
            }
          });
          render();
        });

        window.addEventListener("pointermove", (e) => {
          if (!isDragging || !wheelWrap) return;
          const rect = wheelWrap.getBoundingClientRect();
          const px = e.clientX - rect.left;
          const py = e.clientY - rect.top;
          pointerPos = { x: px, y: py };

          connectNodes.forEach((node, idx) => {
            const dist = Math.hypot(node.x - px, node.y - py);
            if (dist < 30 && !selectedIndices.includes(idx)) {
              selectedIndices.push(idx);
              if (selectedIndices.length === activeWord.word.length) {
                isDragging = false;
                pointerPos = null;
                handleConnectCheck();
              }
            }
          });
          render();
        });

        window.addEventListener("pointerup", () => {
          if (isDragging) {
            isDragging = false;
            pointerPos = null;
            if (selectedIndices.length === activeWord.word.length) {
              handleConnectCheck();
            } else {
              render();
            }
          }
        });

        // Click / tap fallback
        root.querySelectorAll(".qgw-letter-node").forEach((nodeEl) => {
          nodeEl.addEventListener("click", (e) => {
            const idx = Number((e.currentTarget as HTMLElement).dataset.index);
            if (!isNaN(idx) && !selectedIndices.includes(idx)) {
              selectedIndices.push(idx);
              if (selectedIndices.length === activeWord.word.length) {
                handleConnectCheck();
              } else {
                render();
              }
            }
          });
        });

        root.querySelector(".qgw-btn-shuffle")?.addEventListener("click", () => {
          setupConnectWheel();
          render();
        });

        root.querySelector(".qgw-btn-clear")?.addEventListener("click", () => {
          selectedIndices = [];
          pointerPos = null;
          render();
        });
      }
    }
  }

  // Physical keyboard listener
  window.addEventListener("keydown", (e) => {
    if (currentMode !== "typing") return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    if (e.key === "Enter") {
      handleTypingSubmit();
    } else if (e.key === "Backspace") {
      currentInput = currentInput.slice(0, -1);
      render();
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      if (currentInput.length < activeWord.word.length) {
        currentInput += e.key.toUpperCase();
        render();
      }
    }
  });

  pickNewWord();
}
