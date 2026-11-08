"use strict";

const form = document.getElementById("exercise");
const summary = document.getElementById("summary");
const inputs = Array.from({length: 6}, (_, index) => document.getElementById("answer-" + (index + 1)));
const results = Array.from({length: 6}, (_, index) => document.getElementById("result-" + (index + 1)));
const buttons = Array.from(form.querySelectorAll("button"));

function clearResult(index) {
  inputs[index].className = "";
  inputs[index].removeAttribute("aria-invalid");
  results[index].className = "result";
  results[index].textContent = "";
}

function setBusy(busy) {
  buttons.forEach((button) => { button.disabled = busy; });
  inputs.forEach((input) => { input.readOnly = busy; });
}

inputs.forEach((input, index) => input.addEventListener("input", () => {
  clearResult(index);
  summary.textContent = "";
  summary.className = "summary";
}));

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setBusy(true);
  try {
    const response = await fetch("/api/check", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({answers: inputs.map((input) => input.value)}),
    });
    if (!response.ok) throw new Error("Check failed");
    const result = await response.json();
    result.correct.forEach((correct, index) => {
      const state = correct ? "correct" : "incorrect";
      inputs[index].className = state;
      inputs[index].setAttribute("aria-invalid", String(!correct));
      results[index].className = "result " + state;
      results[index].textContent = correct ? " ✓ Correct" : " · Try again";
    });
    summary.className = "summary";
    summary.textContent = result.score + " / 6 correct. " + (result.score === 6 ? "Well done!" : "Review the marked answers and try again.");
  } catch (error) {
    summary.className = "summary error";
    summary.textContent = "Could not check answers. Make sure the local server is running and try again.";
  } finally {
    setBusy(false);
  }
});

document.getElementById("show-answers").addEventListener("click", async () => {
  setBusy(true);
  try {
    const response = await fetch("/api/answers");
    if (!response.ok) throw new Error("Answer key unavailable");
    const data = await response.json();
    data.answers.forEach((answer, index) => {
      clearResult(index);
      results[index].className = "result correct";
      results[index].textContent = " · Answer: " + answer;
    });
    summary.className = "summary";
    summary.textContent = "The answers are shown beside each blank. Select Start again to practise again.";
  } catch (error) {
    summary.className = "summary error";
    summary.textContent = "Could not load the answers. Make sure the local server is running and try again.";
  } finally {
    setBusy(false);
  }
});

form.addEventListener("reset", () => {
  inputs.forEach((_, index) => clearResult(index));
  summary.className = "summary";
  summary.textContent = "";
});
