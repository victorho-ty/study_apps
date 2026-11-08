const byId = (id) => document.getElementById(id);
const courtPlan = byId("court-plan");
const ball = byId("volleyball");
const trail = byId("ball-path");
const landing = byId("landing");
const scoreA = byId("score-a");
const scoreB = byId("score-b");
const detail = byId("demo-detail");
const description = byId("court-desc");
const net = byId("net-view");
const motion = matchMedia("(prefers-reduced-motion: reduce)");

const modes = {
  roster: "每隊共 12 人，甲乙兩隊各有 6 名後備。",
  lineup: "每邊 6 人上場，前排 3 人、後排 3 人。",
  in: "甲隊把球打到乙隊場區內，甲隊得 1 分。",
  out: "球出界，最後觸球的是甲隊，乙隊得 1 分。",
  match: "五局三勝，先贏 3 局的一隊勝出。",
  sets25: "第 1 至 4 局，例如 25：24 要繼續，26：24 才勝一局。",
  sets15: "第 5 局，例如 15：14 要繼續，16：14 才勝一局。",
  switch8: "決勝局有一隊先達 8 分，兩隊交換場區。",
  switchSet: "第 1 至 4 局結束後，兩隊交換場區。",
  dimensions: "球場長 18 米、闊 9 米。",
  mensNet: "男子球網高 2.43 米。",
  womensNet: "女子球網高 2.24 米。",
  zones: "球網兩邊各有一條 3 米線，分隔前場和後場。",
  baseline: "球場兩端的邊界是底線。",
};

function dot(group, color, radius) {
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("r", radius);
  circle.setAttribute("fill", color);
  circle.setAttribute("stroke", "#132d39");
  circle.setAttribute("stroke-width", "2");
  group.append(circle);
  return circle;
}

function move(circle, x, y) {
  circle.setAttribute("cx", x);
  circle.setAttribute("cy", y);
}

const colors = ["#ffaaa2", "#9ce5f3"];
const teams = ["team-a", "team-b"].map((id, team) =>
  Array.from({ length: 6 }, () => dot(byId(id), colors[team], 12))
);
const bench = byId("bench");
teams.forEach((players, team) => {
  players.forEach((_, index) => move(dot(bench, colors[team], 8), 124 + 266 * team + index * 25, 382));
});

function show(element, visible) {
  element.toggleAttribute("data-off", !visible);
}

function progress(seconds) {
  return Math.max(0, Math.min(1, seconds));
}

let previousMode;

export function renderCourt(mode, elapsed) {
  const seconds = motion.matches ? 10 : elapsed;
  const rally = mode === "in" || mode === "out";
  const switching = mode === "switch8" || mode === "switchSet";
  const roster = mode === "roster" || mode === "lineup";
  const netView = mode === "mensNet" || mode === "womensNet";
  const courtDiagram = ["dimensions", "zones", "baseline"].includes(mode);

  if (mode !== previousMode) {
    detail.textContent = modes[mode];
    description.textContent = modes[mode];
    show(courtPlan, !netView);
    show(net, netView);
    show(bench, roster);
    show(byId("team-a"), !courtDiagram);
    show(byId("team-b"), !courtDiagram);
    show(byId("dimensions"), mode === "dimensions");
    show(byId("zones"), mode === "zones");
    show(byId("baseline"), mode === "baseline");
    [ball, trail, landing].forEach((element) => show(element, rally));
    if (netView) {
      const y = mode === "mensNet" ? 144 : 159;
      byId("net-mesh").setAttribute("d", `M167 ${y}H473v60H167z`);
      byId("net-label").textContent = mode === "mensNet" ? "2.43 米" : "2.24 米";
    }
    previousMode = mode;
  }

  let a = "–";
  let b = "–";
  if (mode === "roster") [a, b] = [12, 12];
  if (mode === "lineup") [a, b] = [6, 6];
  if (mode === "match") [a, b] = [seconds < 1 ? "2 局" : "3 局", "2 局"];
  if (mode === "sets25" || mode === "sets15") {
    b = mode === "sets25" ? 24 : 14;
    a = b + Math.min(2, Math.floor(seconds / 1.4));
  }
  if (mode === "switch8") [a, b] = [seconds < .65 ? 7 : 8, 6];
  if (mode === "switchSet") [a, b] = [25, 23];

  if (!courtDiagram && !netView) {
    const swap = switching ? progress((seconds - .7) / 1.6) : 0;
    const enter = mode === "lineup" ? progress(seconds / 1.2) : 1;
    teams.forEach((players, team) => {
      players.forEach((player, index) => {
        const left = index < 3 ? 171 : 271;
        const x = team === 0 ? left : 640 - left;
        const row = 165 + index % 3 * 67;
        const y = row + (1 - enter) * (360 - row) + (team ? 1 : -1) * 44 * Math.sin(Math.PI * swap);
        move(player, x + (640 - 2 * x) * swap, y);
      });
    });
  }

  if (rally) {
    const t = progress(seconds / 1.65);
    const x = mode === "in" ? 475 : 572;
    const y = mode === "in" ? 276 : 340;
    trail.setAttribute("d", `M271 231 Q385 90 ${x} ${y}`);
    const u = 1 - t;
    move(ball, u * u * 271 + 2 * u * t * 385 + t * t * x,
      u * u * 231 + 2 * u * t * 90 + t * t * y);
    move(landing, x, y);
    landing.setAttribute("r", t < 1 ? 0 : 17);
    a = mode === "in" && t === 1 ? 1 : 0;
    b = mode === "out" && t === 1 ? 1 : 0;
  }

  if (scoreA.textContent !== String(a)) scoreA.textContent = a;
  if (scoreB.textContent !== String(b)) scoreB.textContent = b;
}

