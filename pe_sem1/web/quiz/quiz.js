const byId = (id) => document.getElementById(id);
const form = byId("quiz-form");
const question = byId("question");
const choices = byId("choices");
const feedback = byId("feedback");
const check = byId("check");
const next = byId("next");
const results = byId("results");
const score = byId("score");
const loading = byId("loading");

let questions;
let index = 0;
let correct = 0;

function showQuestion() {
  const { topic, prompt, options } = questions[index];
  byId("quiz-progress").textContent = `第 ${index + 1} / ${questions.length} 題 · ${topic}`;
  question.textContent = prompt;
  choices.replaceChildren(...options.map((option, optionIndex) => {
    const label = document.createElement("label");
    label.className = "quiz-choice";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "answer";
    radio.value = optionIndex;
    label.append(radio, option);
    return label;
  }));
  choices.disabled = false;
  feedback.textContent = "";
  feedback.removeAttribute("data-mark");
  check.hidden = false;
  check.disabled = true;
  next.hidden = true;
}

choices.addEventListener("change", () => { check.disabled = false; });
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const selected = choices.querySelector("input:checked");
  if (!selected || check.disabled) return;

  const { answer, options, explanation } = questions[index];
  const isCorrect = Number(selected.value) === answer;
  if (isCorrect) {
    correct += 1;
  } else {
    selected.parentElement.dataset.mark = "incorrect";
  }
  choices.children[answer].dataset.mark = "correct";
  feedback.dataset.mark = isCorrect ? "correct" : "incorrect";
  feedback.textContent = isCorrect
    ? `答對了！${explanation}`
    : `正確答案是「${options[answer]}」。${explanation}`;

  choices.disabled = true;
  check.disabled = true;
  check.hidden = true;
  next.textContent = index + 1 === questions.length ? "查看成績" : "下一題";
  next.hidden = false;
  next.focus();
});

next.addEventListener("click", () => {
  index += 1;
  if (index < questions.length) {
    showQuestion();
    question.focus();
    return;
  }
  form.hidden = true;
  results.hidden = false;
  score.textContent = `答對 ${correct} / ${questions.length} 題`;
  byId("result-note").textContent = correct === questions.length
    ? "全部答對了！"
    : "可以重溫朱婷故事或排球規則，再試一次。";
  score.focus();
});

byId("restart").addEventListener("click", () => {
  index = 0;
  correct = 0;
  results.hidden = true;
  form.hidden = false;
  showQuestion();
  question.focus();
});

try {
  const response = await fetch("/assets/quiz/questions.json");
  if (!response.ok) throw new Error("Could not load quiz questions");
  questions = await response.json();
  showQuestion();
  loading.hidden = true;
  form.hidden = false;
} catch (error) {
  loading.textContent = "未能載入題目，請重新載入此頁。";
  console.error(error);
}

