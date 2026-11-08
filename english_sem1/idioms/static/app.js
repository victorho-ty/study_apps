"use strict";

const $ = (id) => document.getElementById(id);
let material;
let round = [];
let position = 0;
let firstTryCorrect = 0;
let missed = [];
let hadMistake = false;
let resolved = false;
let busy = false;

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function showMeaning(phrase) {
  $("meaning-kind").textContent = phrase.kind;
  $("meaning-title").textContent = phrase.phrase;
  $("meaning-text").textContent = phrase.meaning;
  $("meaning-dialog").showModal();
}

function renderPool() {
  for (const phrase of material.phrases) {
    const row = document.createElement("div");
    row.className = "phrase";
    const label = document.createElement("span");
    label.textContent = phrase.phrase;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "meaning";
    button.textContent = "Meaning";
    button.setAttribute("aria-label", `Meaning of ${phrase.phrase}`);
    button.addEventListener("click", () => showMeaning(phrase));
    row.append(label, button);
    $("phrase-pool").append(row);
  }
}

function startRound(questions) {
  round = shuffle(questions);
  position = 0;
  firstTryCorrect = 0;
  missed = [];
  $("summary").hidden = true;
  $("quiz").hidden = false;
  renderQuestion();
}

function renderQuestion() {
  hadMistake = false;
  resolved = false;
  const question = round[position];
  $("question-number").textContent = `QUESTION ${position + 1} OF ${round.length}`;
  $("score").textContent = `${firstTryCorrect} correct on first try`;
  $("progress").max = round.length;
  $("progress").value = position;
  const [before, after] = question.sentence.split("____");
  const blank = document.createElement("span");
  blank.className = "blank";
  blank.textContent = "?";
  blank.setAttribute("aria-label", "blank");
  $("sentence").replaceChildren(document.createTextNode(before), blank, document.createTextNode(after));
  $("answer").value = "";
  $("answer").disabled = false;
  $("check").hidden = false;
  $("reveal").hidden = false;
  $("next").hidden = true;
  $("next").textContent = position + 1 === round.length ? "See results →" : "Next question →";
  feedback("", "");
  $("answer").focus({ preventScroll: true });
}

function feedback(message, kind) {
  $("feedback").textContent = message;
  $("feedback").className = `feedback ${kind}`;
}

function finishQuestion(correct, answer) {
  resolved = true;
  if (correct && !hadMistake) firstTryCorrect++;
  else missed.push(round[position]);
  $("answer").disabled = true;
  $("check").hidden = true;
  $("reveal").hidden = true;
  $("next").hidden = false;
  $("score").textContent = `${firstTryCorrect} correct on first try`;
  $("progress").value = position + 1;
  feedback(correct ? `Well done! “${answer}” fits this sentence.` : `The answer is “${answer}”. Read the sentence again with this phrase.`, correct ? "correct" : "retry");
  const phrase = material.phrases.find((item) => item.id === round[position].phrase_id);
  const explanation = document.createElement("p");
  explanation.textContent = phrase.meaning;
  $("feedback").append(explanation);
  $("next").focus({ preventScroll: true });
}

async function submitAnswer(reveal = false) {
  if (busy || resolved) return;
  if (!reveal && !$("answer").value.trim()) {
    feedback("Type a phrase before checking your answer.", "retry");
    $("answer").focus();
    return;
  }
  busy = true;
  $("check").disabled = true;
  $("reveal").disabled = true;
  try {
    const response = await fetch(`/api/questions/${round[position].id}/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: reveal ? "" : $("answer").value }),
    });
    if (!response.ok) throw new Error(`Answer check failed (${response.status})`);
    const result = await response.json();
    if (reveal || result.correct) finishQuestion(!reveal && result.correct, result.answer);
    else {
      hadMistake = true;
      feedback("Not quite yet. Check the phrase, spelling, tense and words such as him, her or it. Try again, or use Show answer.", "retry");
      $("answer").focus();
      $("answer").select();
    }
  } catch (error) {
    feedback("Could not check your answer. Make sure the Python server is running, then try again.", "error");
  } finally {
    busy = false;
    $("check").disabled = false;
    $("reveal").disabled = false;
  }
}

$("answer-form").addEventListener("submit", (event) => {
  event.preventDefault();
  submitAnswer();
});
$("reveal").addEventListener("click", () => submitAnswer(true));
$("next").addEventListener("click", () => {
  if (!resolved || busy) return;
  position++;
  if (position < round.length) renderQuestion();
  else {
    $("quiz").hidden = true;
    $("summary").hidden = false;
    $("summary-score").textContent = `${firstTryCorrect} / ${round.length} on the first try`;
    $("summary-detail").textContent = missed.length
      ? `${missed.length} question${missed.length === 1 ? " needs" : "s need"} another look. Practise them again to make the phrases stick.`
      : "You answered every question correctly on your first try. Start a fresh round whenever you like!";
    $("review").hidden = missed.length === 0;
    $("summary-title").focus({ preventScroll: true });
  }
});
$("review").addEventListener("click", () => startRound(missed));
$("restart").addEventListener("click", () => startRound(material.questions));

async function init() {
  try {
    const response = await fetch("/api/material");
    if (!response.ok) throw new Error(`Load failed (${response.status})`);
    material = await response.json();
    renderPool();
    startRound(material.questions);
  } catch (error) {
    $("error").hidden = false;
  } finally {
    $("loading").hidden = true;
  }
}
init();
