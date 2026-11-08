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

function showFeedback(message, kind, example = "") {
  $("feedback").replaceChildren();
  $("feedback").className = `feedback ${kind}`;
  $("feedback").append(document.createTextNode(message));
  if (example) {
    const paragraph = document.createElement("p");
    paragraph.textContent = `One possible answer: ${example}`;
    $("feedback").append(paragraph);
  }
}

function renderPool() {
  for (const item of material.clauses) {
    const card = document.createElement("div");
    card.className = "clause-item";
    const clause = document.createElement("strong");
    clause.textContent = item.clause;
    const hint = document.createElement("span");
    hint.textContent = item.hint;
    card.append(clause, hint);
    $("clause-list").append(card);
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
  $("first-sentence").textContent = question.first;
  $("second-sentence").textContent = question.second;
  $("answer").value = "";
  $("answer").disabled = false;
  $("check").hidden = false;
  $("reveal").hidden = false;
  $("next").hidden = true;
  $("next").textContent = position + 1 === round.length ? "See results →" : "Next question →";
  showFeedback("", "");
  $("answer").focus({ preventScroll: true });
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
  showFeedback(correct ? "Well done! Your sentence is correct." : "Here is one possible correct way to join the sentences.", correct ? "correct" : "retry", answer);
  $("next").focus({ preventScroll: true });
}

async function submitAnswer(reveal = false) {
  if (busy || resolved) return;
  if (!reveal && !$("answer").value.trim()) {
    showFeedback("Write a complete sentence before checking your answer.", "retry");
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
      showFeedback("Not quite yet. Check that your sentence uses a suitable relative word and keeps the original meaning. Try again, or show an example answer.", "retry");
      $("answer").focus();
      $("answer").select();
    }
  } catch (error) {
    showFeedback("Could not check your sentence. Make sure the Python server is running, then try again.", "error");
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
      ? `${missed.length} question${missed.length === 1 ? " needs" : "s need"} another look. Practise them again to make the clauses stick.`
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

