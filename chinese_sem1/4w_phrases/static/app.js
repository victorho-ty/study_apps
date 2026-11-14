"use strict";

const byId = (id) => document.getElementById(id);
const audio = byId("audio");
const playButton = byId("play");
const status = byId("status");
let questions = [];
let current = 0;
let tokens = [];
let characters = [];
let activeToken = -1;
let frame = 0;
let version = 0;
let requestController;
let ready = false;

function setStatus(message, error = false) {
  status.textContent = message;
  status.classList.toggle("error", error);
}

function highlight(tokenIndex) {
  if (tokenIndex === activeToken) return;
  activeToken = tokenIndex;
  const token = tokens[tokenIndex];
  characters.forEach((character, index) => {
    character.classList.toggle("active", Boolean(token && index >= token.start && index < token.end));
  });
}

function syncHighlight() {
  // Audio time stays accurate when paused, seeking, or changing playback speed.
  const time = audio.currentTime;
  highlight(tokens.findIndex((token) => time >= token.offset && time < token.offset + token.duration));
}

function tick() {
  syncHighlight();
  if (!audio.paused && !audio.ended) frame = requestAnimationFrame(tick);
}

async function play() {
  const expected = version;
  try {
    await audio.play();
  } catch (error) {
    if (expected !== version || error.name === "AbortError") return;
    if (error.name === "NotAllowedError") {
      setStatus("聲音已準備好，按「開始朗讀」便可以跟讀。");
      playButton.textContent = "▶ 開始朗讀";
    } else {
      setStatus("聲音未能播放，請按「重試朗讀」。", true);
      ready = false;
      playButton.textContent = "↻ 重試朗讀";
    }
  }
}

async function showQuestion(index) {
  const expected = ++version;
  requestController?.abort();
  requestController = new AbortController();
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  cancelAnimationFrame(frame);
  ready = false;
  tokens = [];
  activeToken = -1;
  current = index;
  const question = questions[index];
  const sentence = byId("sentence");
  sentence.replaceChildren();
  sentence.setAttribute("aria-label", question.text);
  characters = Array.from(question.text, (character, position) => {
    const span = document.createElement("span");
    span.textContent = character;
    span.className = "char";
    span.setAttribute("aria-hidden", "true");
    if (position >= question.answer_start && position < question.answer_end) span.classList.add("answer");
    sentence.append(span);
    return span;
  });
  byId("answer").textContent = question.answer;
  byId("exercise").textContent = `成語練習${question.exercise === 1 ? "一" : "二"} · 第 ${question.number} 題`;
  byId("counter").textContent = `${index + 1} / ${questions.length}`;
  byId("progress").max = questions.length;
  byId("progress").value = index + 1;
  byId("previous").disabled = index === 0;
  byId("next").disabled = false;
  byId("next").textContent = index === questions.length - 1 ? "再讀一遍 · Restart ↻" : "下一題 · Next →";
  document.querySelector(".reader").setAttribute("aria-busy", "true");
  playButton.disabled = true;
  playButton.textContent = "準備聲音中……";
  setStatus("正在準備粵語聲音，首次載入需要網絡連線。");
  const url = new URL(location.href);
  url.searchParams.set("question", question.id);
  history.replaceState(null, "", url);
  try {
    const response = await fetch(`/api/questions/${question.id}/speech`, {signal: requestController.signal});
    const data = await response.json();
    if (expected !== version) return;
    if (!response.ok) throw new Error(data.error || "未能載入聲音，請重試。");
    tokens = data.tokens;
    audio.src = data.audio_url;
    audio.playbackRate = Number(byId("speed").value);
    ready = true;
    playButton.disabled = false;
    playButton.textContent = "▶ 開始朗讀";
    setStatus("聲音已準備好，按「開始朗讀」便可以跟讀。");
    await play();
  } catch (error) {
    if (expected !== version || error.name === "AbortError") return;
    setStatus(error.message, true);
    playButton.disabled = false;
    playButton.textContent = "↻ 重試朗讀";
  } finally {
    if (expected === version) document.querySelector(".reader").setAttribute("aria-busy", "false");
  }
}

playButton.addEventListener("click", () => {
  if (!questions.length) {
    loadQuestions();
  } else if (!ready) {
    showQuestion(current);
  } else if (!audio.paused) {
    audio.pause();
  } else {
    if (audio.ended) audio.currentTime = 0;
    play();
  }
});

audio.addEventListener("play", () => {
  cancelAnimationFrame(frame);
  playButton.textContent = "Ⅱ 暫停朗讀";
  setStatus("跟着綠色標記，一起讀出句子。");
  tick();
});
audio.addEventListener("pause", () => {
  cancelAnimationFrame(frame);
  if (!ready || audio.ended) return;
  playButton.textContent = "▶ 繼續朗讀";
  setStatus("已暫停，按「繼續朗讀」便可以接着讀。");
});
audio.addEventListener("ended", () => {
  cancelAnimationFrame(frame);
  highlight(-1);
  playButton.textContent = "↻ 再聽一次";
  setStatus(current === questions.length - 1 ? "兩組練習都讀完了！可以再讀一遍，鞏固記憶。" : "讀完了！可以再聽一次，或按「下一題」繼續。");
});
audio.addEventListener("error", () => {
  if (!audio.getAttribute("src")) return;
  cancelAnimationFrame(frame);
  highlight(-1);
  ready = false;
  playButton.disabled = false;
  playButton.textContent = "↻ 重試朗讀";
  setStatus("聲音未能播放，請按「重試朗讀」。", true);
});
audio.addEventListener("seeked", syncHighlight);
byId("speed").addEventListener("change", () => { audio.playbackRate = Number(byId("speed").value); });
byId("next").addEventListener("click", () => showQuestion((current + 1) % questions.length));
byId("previous").addEventListener("click", () => showQuestion(Math.max(0, current - 1)));

async function loadQuestions() {
  playButton.disabled = true;
  try {
    const response = await fetch("/api/questions");
    if (!response.ok) throw new Error("未能載入題目，請確認本機伺服器仍在運行。");
    questions = await response.json();
    const initial = Number(new URLSearchParams(location.search).get("question"));
    await showQuestion(Number.isInteger(initial) && initial >= 1 && initial <= questions.length ? initial - 1 : 0);
  } catch (error) {
    document.querySelector(".reader").setAttribute("aria-busy", "false");
    setStatus(error.message, true);
    playButton.disabled = false;
    playButton.textContent = "↻ 重試載入";
  }
}

loadQuestions();
