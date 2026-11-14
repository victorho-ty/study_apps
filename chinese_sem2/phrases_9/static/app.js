import { draw } from "./art.js";

const byId = (id) => document.getElementById(id);
const learn = byId("learn");
const quiz = byId("quiz");
const tabs = [byId("learn-tab"), byId("quiz-tab")];
const audio = byId("audio");
const term = byId("term");
const pause = byId("pause");
const status = byId("audio-status");
const example = byId("example");
const questionForm = byId("question-form");
const answer = byId("answer");
const check = byId("check");
const nextQuestion = byId("next-question");
const rates = [1, .85, .7, 1.15];

let lessons;
let timings;
let lessonIndex = 0;
let rateIndex = 0;
let frame;
let sentenceWords;
let words = [];
let currentTrack;
let activeWord;
let quizOrder;
let quizIndex;
let correct;

async function load(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(path);
  return response.json();
}

function selectTab(selected) {
  if (!lessons) return;
  tabs.forEach((tab, index) => {
    const active = index === selected;
    tab.setAttribute("aria-selected", active);
    tab.tabIndex = active ? 0 : -1;
  });
  learn.hidden = selected !== 0;
  quiz.hidden = selected !== 1;
  if (selected === 1) audio.pause();
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectTab(index));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const selected = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index;
    selectTab(selected);
    tabs[selected].focus();
  });
});

function highlight() {
  const time = audio.currentTime;
  const word = audio.ended ? undefined : words.findLast(
    ({ offset, duration }) => offset <= time && time < offset + duration
  );
  if (word !== activeWord) {
    activeWord?.element.classList.remove("spoken");
    word?.element.classList.add("spoken");
    activeWord = word;
  }
}

function tick() {
  highlight();
  if (!audio.paused) frame = requestAnimationFrame(tick);
}

function syncButtons() {
  pause.disabled = audio.paused;
}

function renderWords(container, text, tokens, target = "") {
  let cursor = 0;
  const targetStart = text.indexOf(target);
  container.replaceChildren();
  const rendered = tokens.map((token) => {
    container.append(text.slice(cursor, token.start));
    const element = document.createElement("span");
    element.textContent = text.slice(token.start, token.end);
    element.classList.toggle(
      "target", Boolean(target) && token.start < targetStart + target.length && token.end > targetStart
    );
    container.append(element);
    cursor = token.end;
    return { ...token, element };
  });
  container.append(text.slice(cursor));
  return rendered;
}

function showLesson() {
  currentTrack = undefined;
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  cancelAnimationFrame(frame);
  const lesson = lessons[lessonIndex];
  const timing = timings[lessonIndex];
  byId("page").textContent = `${lesson.category} · ${lessonIndex + 1} / ${lessons.length}`;
  byId("meaning").textContent = lesson.meaning;
  byId("picture").setAttribute("aria-label", lesson.alt);
  draw(lesson.term);

  activeWord = undefined;
  words = [];
  term.textContent = lesson.term;
  sentenceWords = renderWords(example, lesson.example, timing.sentence, lesson.term);
  status.textContent = "";
  syncButtons();
  byId("previous").disabled = lessonIndex === 0;
  byId("forward").disabled = lessonIndex + 1 === lessons.length;
}

for (const [id, step] of [["previous", -1], ["forward", 1]]) {
  byId(id).addEventListener("click", () => {
    lessonIndex += step;
    showLesson();
    byId("term").focus();
  });
}

async function playTrack(track) {
  if (currentTrack !== track || audio.error) {
    const timing = timings[lessonIndex];
    const termWords = renderWords(term, lessons[lessonIndex].term, track === "term" ? timing.term : timing.intro);
    words = track === "term" ? termWords : [...termWords, ...sentenceWords];
    activeWord?.element.classList.remove("spoken");
    activeWord = undefined;
    currentTrack = track;
    audio.src = `/static/audio/${lessonIndex + 1}-${track}.mp3`;
    audio.playbackRate = rates[rateIndex];
  }
  try {
    if (audio.ended) audio.currentTime = 0;
    await audio.play();
  } catch (error) {
    if (error.name !== "AbortError") status.textContent = "未能播放錄音，請再試。";
  }
}

byId("play-term").addEventListener("click", () => playTrack("term"));
byId("play-example").addEventListener("click", () => playTrack("example"));
pause.addEventListener("click", () => audio.pause());
byId("speed").addEventListener("click", () => {
  rateIndex = (rateIndex + 1) % rates.length;
  audio.playbackRate = rates[rateIndex];
  byId("speed").querySelector("span").textContent = `${rates[rateIndex]}×`;
});
audio.addEventListener("play", () => {
  status.textContent = "正在朗讀…";
  syncButtons();
  cancelAnimationFrame(frame);
  tick();
});
audio.addEventListener("pause", () => {
  cancelAnimationFrame(frame);
  if (currentTrack) status.textContent = audio.ended ? "朗讀完畢。" : "已暫停。";
  syncButtons();
  highlight();
});
audio.addEventListener("ended", () => {
  status.textContent = "朗讀完畢。";
  syncButtons();
  highlight();
});
audio.addEventListener("error", () => {
  status.textContent = "未能載入錄音。";
  syncButtons();
});

function showQuestion() {
  byId("quiz-page").textContent = `第 ${quizIndex + 1} / ${quizOrder.length} 題`;
  byId("question").textContent = quizOrder[quizIndex].question.replace("____", "＿＿＿");
  answer.value = "";
  answer.readOnly = false;
  byId("word-bank").removeAttribute("inert");
  check.hidden = false;
  nextQuestion.hidden = true;
  byId("feedback").textContent = "";
}

function startQuiz() {
  quizOrder = [...lessons];
  for (let i = quizOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [quizOrder[i], quizOrder[j]] = [quizOrder[j], quizOrder[i]];
  }
  quizIndex = 0;
  correct = 0;
  byId("results").hidden = true;
  questionForm.hidden = false;
  showQuestion();
}

questionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = answer.value.normalize("NFKC").replace(/\s/g, "");
  if (!input || answer.readOnly) return;
  const { term, meaning } = quizOrder[quizIndex];
  const matched = input === term;
  correct += Number(matched);
  byId("feedback").textContent = matched
    ? `答對了！${meaning}`
    : `參考答案是「${term}」。${meaning}`;
  answer.readOnly = true;
  byId("word-bank").setAttribute("inert", "");
  check.hidden = true;
  nextQuestion.textContent = quizIndex + 1 === quizOrder.length ? "查看成績" : "下一題";
  nextQuestion.hidden = false;
  nextQuestion.focus();
});

nextQuestion.addEventListener("click", () => {
  quizIndex += 1;
  if (quizIndex < quizOrder.length) {
    showQuestion();
    byId("question").focus();
    return;
  }
  questionForm.hidden = true;
  byId("results").hidden = false;
  byId("score").textContent = `答對 ${correct} / ${quizOrder.length} 題`;
  byId("score").focus();
});
byId("restart").addEventListener("click", () => {
  startQuiz();
  byId("question").focus();
});

try {
  [lessons, timings] = await Promise.all([
    load("/static/lessons.json"), load("/static/audio/readings.json"),
  ]);
  const termButtons = [...lessons]
    .sort((first, second) => first.term.localeCompare(second.term, "zh-HK"))
    .map(({ term }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = term;
      button.addEventListener("click", () => {
        if (!answer.readOnly) answer.value = term;
      });
      return button;
    });
  byId("word-bank").replaceChildren(...termButtons);
  showLesson();
  startQuiz();
  selectTab(0);
  byId("loading").hidden = true;
} catch (error) {
  byId("loading").textContent = "未能載入字詞，請重新載入此頁。";
  console.error(error);
}
