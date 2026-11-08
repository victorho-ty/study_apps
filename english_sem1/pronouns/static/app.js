"use strict";

const $ = (id) => document.getElementById(id);
let material;
let round = [];
let index = 0;
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

function showFeedback(message, kind, description = "") {
  $("feedback").replaceChildren(document.createTextNode(message));
  $("feedback").className = "feedback " + kind;
  if (description) {
    const paragraph = document.createElement("p");
    paragraph.textContent = description;
    $("feedback").append(paragraph);
  }
}

function renderGuide() {
  for (const item of material.words) {
    const card = document.createElement("div");
    const label = document.createElement("strong");
    const description = document.createElement("span");
    card.className = "word";
    label.textContent = item.word;
    description.textContent = item.description;
    card.append(label, description);
    $("word-list").append(card);
  }
}

function startRound(questions) {
  round = shuffle(questions);
  index = 0;
  firstTryCorrect = 0;
  missed = [];
  $("summary").hidden = true;
  $("quiz").hidden = false;
  renderQuestion();
}

function renderQuestion() {
  hadMistake = false;
  resolved = false;
  $("question-number").textContent = "QUESTION " + (index + 1) + " OF " + round.length;
  $("score").textContent = firstTryCorrect + " correct on first try";
  $("progress").max = round.length;
  $("progress").value = index;
  const parts = round[index].sentence.split("____");
  const blank = document.createElement("span");
  blank.className = "blank";
  blank.textContent = "?";
  blank.setAttribute("aria-label", "blank");
  $("sentence").replaceChildren(document.createTextNode(parts[0]), blank, document.createTextNode(parts[1]));
  $("answer").value = "";
  $("answer").disabled = false;
  $("check").hidden = false;
  $("reveal").hidden = false;
  $("next").hidden = true;
  $("next").textContent = index + 1 === round.length ? "See results →" : "Next question →";
  showFeedback("", "");
  $("answer").focus({preventScroll:true});
}

function finishQuestion(correct, answer) {
  resolved = true;
  if (correct && !hadMistake) firstTryCorrect++;
  else missed.push(round[index]);
  $("answer").disabled = true;
  $("check").hidden = true;
  $("reveal").hidden = true;
  $("next").hidden = false;
  $("progress").value = index + 1;
  $("score").textContent = firstTryCorrect + " correct on first try";
  const item = material.words.find((word) => word.word === answer);
  showFeedback(correct ? "Well done! “" + answer + "” fits the blank." : "The answer is “" + answer + "”.", correct ? "correct" : "retry", item.description);
  $("next").focus({preventScroll:true});
}

async function submitAnswer(reveal = false) {
  if (busy || resolved) return;
  if (!reveal && !$("answer").value.trim()) {
    showFeedback("Type a pronoun before checking your answer.", "retry");
    $("answer").focus();
    return;
  }
  busy = true;
  $("check").disabled = true;
  $("reveal").disabled = true;
  try {
    const response = await fetch("/api/questions/" + round[index].id + "/check", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({answer: reveal ? "" : $("answer").value}),
    });
    if (!response.ok) throw new Error("Check failed");
    const result = await response.json();
    if (reveal || result.correct) finishQuestion(!reveal && result.correct, result.answer);
    else {
      hadMistake = true;
      showFeedback("Not quite yet. Think about whether the blank refers to a person, a thing, or a group. Try again, or show the answer.", "retry");
      $("answer").focus();
      $("answer").select();
    }
  } catch (error) {
    showFeedback("Could not check your answer. Make sure the local server is running, then try again.", "error");
  } finally {
    busy = false;
    $("check").disabled = false;
    $("reveal").disabled = false;
  }
}

$("answer-form").addEventListener("submit", (event) => { event.preventDefault(); submitAnswer(); });
$("reveal").addEventListener("click", () => submitAnswer(true));
$("next").addEventListener("click", () => {
  if (!resolved || busy) return;
  index++;
  if (index < round.length) renderQuestion();
  else {
    $("quiz").hidden = true;
    $("summary").hidden = false;
    $("summary-score").textContent = firstTryCorrect + " / " + round.length + " on the first try";
    $("summary-detail").textContent = missed.length ? missed.length + " question(s) to practise again." : "You answered every question correctly on your first try!";
    $("review").hidden = missed.length === 0;
    $("summary-title").focus({preventScroll:true});
  }
});
$("review").addEventListener("click", () => startRound(missed));
$("restart").addEventListener("click", () => startRound(material.questions));

async function init() {
  try {
    const response = await fetch("/api/material");
    if (!response.ok) throw new Error("Load failed");
    material = await response.json();
    renderGuide();
    startRound(material.questions);
  } catch (error) {
    $("error").hidden = false;
  } finally {
    $("loading").hidden = true;
  }
}
init();
