const byId = (id) => document.getElementById(id);
const audio = byId("narration");
const play = byId("play");
const pause = byId("pause");
const speed = byId("speed");
const position = byId("position");
const status = byId("status");
const timeLabel = byId("time");
const rates = [1, 0.85, 0.7, 1.15];
let rateIndex = 0;
let animationFrame;
let words = [];
let scenes = [];
let activeWord;
let activeScene;
let activePhoto;
let renderCourt;

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

function renderWords(container, text, start, tokens) {
  const end = start + text.length;
  let cursor = start;
  for (const token of tokens) {
    if (token.start >= end || token.end <= start) continue;
    const wordStart = Math.max(token.start, start);
    const wordEnd = Math.min(token.end, end);
    container.append(text.slice(cursor - start, wordStart - start));
    const span = document.createElement("span");
    span.className = "word";
    span.textContent = text.slice(wordStart - start, wordEnd - start);
    container.append(span);
    token.elements.push(span);
    cursor = wordEnd;
  }
  container.append(text.slice(cursor - start));
}

function renderStory(story, tokens) {
  words = tokens.map((token) => ({ ...token, elements: [] }));
  const photos = new Map();
  for (const [key, photo] of Object.entries(story.photos ?? {})) {
    const image = document.createElement("img");
    image.alt = photo.alt;
    image.hidden = true;
    image.src = `/assets/photos/${photo.file}`;
    byId("photos").append(image);
    photos.set(key, image);
  }
  renderWords(byId("story-title"), story.title, 0, words);
  const passage = byId("passage");
  const biography = document.createElement("p");
  if (!renderCourt) passage.append(biography);
  let start = story.title.length + 1; // The recording inserts a full stop after the title.
  scenes = story.scenes.map((scene) => {
    const timeAt = (index) => words.find((word) => word.end > index).offset;
    const offset = timeAt(start);
    const photoCues = (scene.photoCues ?? []).map((cue) => {
      const cueStart = start + scene.text.indexOf(cue.text);
      return {
        offset: timeAt(cueStart),
        image: photos.get(cue.photo),
      };
    });
    const visualCues = (scene.visuals ?? []).map(([text, mode]) => ({
      mode,
      offset: timeAt(start + scene.text.indexOf(text)),
    }));
    if (renderCourt) {
      const group = document.createElement("section");
      let lineStart = start;
      for (const [index, line] of scene.text.match(/[^。]+。/g).entries()) {
        const element = document.createElement(index === 0 ? "h3" : "p");
        // Keep the spoken section name as a heading without its timing separator.
        renderWords(element, index === 0 ? line.slice(0, -1) : line, lineStart, words);
        group.append(element);
        lineStart += line.length;
      }
      passage.append(group);
    } else {
      renderWords(biography, scene.text, start, words);
    }
    start += scene.text.length;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = scene.label;
    button.disabled = true;
    button.addEventListener("click", () => {
      audio.currentTime = offset;
      renderFrame();
    });
    byId("chapters").append(button);
    return { ...scene, offset, image: photos.get(scene.photo), photoCues, visualCues, button };
  });
}

function formatTime(seconds) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function renderFrame() {
  const now = audio.currentTime;
  const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
  position.value = now;
  timeLabel.textContent = `${formatTime(now)} / ${formatTime(duration)}`;

  const word = audio.ended ? undefined : words.findLast(
    (item) => item.offset <= now && now < item.offset + item.duration
  );
  if (word !== activeWord) {
    activeWord?.elements.forEach((element) => element.classList.remove("active"));
    word?.elements.forEach((element) => element.classList.add("active"));
    activeWord = word;
  }

  const scene = scenes.findLast((item) => item.offset <= now) ?? scenes[0];
  if (!scene) return;
  if (scene !== activeScene) {
    activeScene?.button.removeAttribute("aria-current");
    scene.button.setAttribute("aria-current", "step");
    byId("chapter").textContent = `${scene.chapter} / ${String(scenes.length).padStart(2, "0")}`;
    byId("scene-title").textContent = scene.label;
    byId("badge").textContent = scene.badge;
    activeScene = scene;
  }

  if (renderCourt) {
    const cue = scene.visualCues.findLast((item) => item.offset <= now);
    renderCourt(cue?.mode ?? scene.visual, Math.max(0, now - (cue?.offset ?? scene.offset)));
    return;
  }

  const photo = scene.photoCues.findLast((cue) => cue.offset <= now)?.image ?? scene.image;
  if (photo !== activePhoto) {
    if (activePhoto) activePhoto.hidden = true;
    photo.hidden = false;
    activePhoto = photo;
  }
}

function tick() {
  renderFrame();
  if (!audio.paused && !audio.ended) animationFrame = requestAnimationFrame(tick);
}

function updateControls() {
  const ready = Number.isFinite(audio.duration) && !audio.error;
  const playing = ready && !audio.paused && !audio.ended;
  play.disabled = !ready || playing;
  pause.disabled = !playing;
  speed.disabled = !ready;
  position.disabled = !ready;
  scenes.forEach(({ button }) => { button.disabled = !ready; });
}

play.addEventListener("click", async () => {
  try {
    if (audio.ended) audio.currentTime = 0;
    await audio.play();
  } catch (error) {
    if (error.name !== "AbortError") status.textContent = "未能播放朗讀，請重新載入此頁。";
  }
});
pause.addEventListener("click", () => audio.pause());
speed.addEventListener("click", () => {
  rateIndex = (rateIndex + 1) % rates.length;
  audio.playbackRate = rates[rateIndex];
  speed.querySelector("span").textContent = `${audio.playbackRate}×`;
});
position.addEventListener("input", () => {
  audio.currentTime = Number(position.value);
  renderFrame();
});
audio.addEventListener("loadedmetadata", () => {
  position.max = audio.duration;
  status.textContent = "按 Play 開始，跟著金色標記朗讀。";
  updateControls();
  renderFrame();
});
audio.addEventListener("play", () => {
  status.textContent = "正在朗讀…";
  updateControls();
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(tick);
});
audio.addEventListener("pause", () => {
  cancelAnimationFrame(animationFrame);
  if (!audio.ended) status.textContent = "已暫停。";
  updateControls();
  renderFrame();
});
audio.addEventListener("ended", () => {
  status.textContent = "朗讀完畢。按 Play 再讀一遍。";
  updateControls();
  renderFrame();
});
audio.addEventListener("seeked", renderFrame);
audio.addEventListener("error", () => {
  status.textContent = "未能載入粵語錄音，請重新載入此頁。";
  updateControls();
});

try {
  const isRules = document.body.dataset.lesson === "rules";
  const directory = isRules ? "/assets/rules" : "/assets";
  const [story, timing, court] = await Promise.all([
    loadJson(`${directory}/story.json`), loadJson(`${directory}/timing.json`),
    isRules ? import("./rules/court.js") : undefined,
  ]);
  renderCourt = court?.renderCourt;
  renderStory(story, timing.tokens);
  audio.src = `${directory}/narration.mp3`;
  renderFrame();
} catch (error) {
  status.textContent = "未能載入故事，請重新載入此頁。";
  console.error(error);
}

