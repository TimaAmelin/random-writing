const wheelGrid = document.getElementById("wheelGrid");
const statusText = document.getElementById("statusText");
const storyResult = document.getElementById("storyResult");
const spinButton = document.getElementById("spinButton");
const ideaDialog = document.getElementById("ideaDialog");
const dialogText = document.getElementById("dialogText");
const dialogPicks = document.getElementById("dialogPicks");
const dialogClose = document.getElementById("dialogClose");
const dialogAction = document.getElementById("dialogAction");
const pointerAngle = -Math.PI / 2;

const fallbackWheelData = {
  wheels: [
    {
      id: "hero",
      title: "Герой",
      chip: "кто",
      colors: ["#f47768", "#f2c66d", "#56d1c2", "#74a9ff", "#9cd66f", "#d78dff", "#ff9f70", "#7dd9ff"],
      items: [
        "усталый кассир",
        "говорящий чайник",
        "мэр маленького города",
        "рыжий котенок",
        "частный детектив на пенсии",
        "облако в человеческом пальто",
        "соседка с третьего этажа",
        "инопланетный бухгалтер"
      ]
    },
    {
      id: "place",
      title: "Место",
      chip: "где",
      colors: ["#56d1c2", "#f2c66d", "#8fb7ff", "#f47768", "#c6df7a", "#f0a2d0", "#62c2a6", "#d8b36b"],
      items: [
        "обычная кухня",
        "лифт между эпохами",
        "очередь в поликлинике",
        "остров из неисполненных мечт",
        "пустой школьный спортзал",
        "кафе на Марсе",
        "дачный автобус",
        "город внутри шкафа"
      ]
    },
    {
      id: "conflict",
      title: "Конфликт",
      chip: "что",
      colors: ["#f2c66d", "#f47768", "#7ed1ff", "#9cd66f", "#d78dff", "#ffb36b", "#67d3bc", "#aab7ff"],
      items: [
        "теряет ключи перед важной встречей",
        "должен извиниться перед зеркалом",
        "получает чужую зарплату и чужую судьбу",
        "пытается вернуть воскресенье на место",
        "скрывает пятно на скатерти",
        "объявляет войну будильникам",
        "узнает, что его никто не выдумал",
        "спасает ужин от конца света"
      ]
    },
    {
      id: "tone",
      title: "Тон",
      chip: "как",
      hidden: true,
      colors: ["#9cd66f", "#74a9ff", "#f47768", "#f2c66d", "#56d1c2", "#ff9f70", "#c5a3ff", "#e2db8e"],
      items: [
        "тихий реализм",
        "деловая истерика",
        "нежная нелепость",
        "бытовой хоррор",
        "солнечный сюрреализм",
        "сухая канцелярская сказка",
        "почти документальная комедия",
        "трагедия с хорошим чаем"
      ]
    }
  ]
};

let wheels = [];
let spinning = false;

spinButton.disabled = true;

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function wrapAngle(angle) {
  return ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

function createWheelCard(wheelData) {
  const card = document.createElement("article");
  card.className = "wheel-card";
  card.dataset.wheelId = wheelData.id;

  const top = document.createElement("div");
  top.className = "wheel-top";

  const title = document.createElement("h2");
  title.className = "wheel-name";
  title.textContent = wheelData.title;

  const chip = document.createElement("span");
  chip.className = "wheel-chip";
  chip.textContent = wheelData.chip;

  const wheelWrap = document.createElement("div");
  wheelWrap.className = "wheel-wrap";

  const canvas = document.createElement("canvas");
  canvas.id = `wheel-${wheelData.id}`;
  canvas.width = 720;
  canvas.height = 720;

  const output = document.createElement("p");
  output.className = "wheel-result";
  output.id = `result-${wheelData.id}`;
  output.textContent = "?";

  top.append(title, chip);
  wheelWrap.append(canvas);
  card.append(top, wheelWrap, output);
  wheelGrid.append(card);

  return {
    ...wheelData,
    canvas,
    output
  };
}

function validateWheelData(data) {
  if (!data || !Array.isArray(data.wheels) || data.wheels.length === 0) {
    throw new Error("В wheels.json должен быть непустой массив wheels.");
  }

  data.wheels.forEach((wheel) => {
    if (!wheel.id || !wheel.title || !wheel.chip || !Array.isArray(wheel.colors) || !Array.isArray(wheel.items)) {
      throw new Error("У каждого колеса должны быть id, title, chip, colors и items.");
    }

    if (wheel.colors.length === 0 || wheel.items.length < 2) {
      throw new Error("У каждого колеса должен быть хотя бы один цвет и минимум два сектора.");
    }
  });
}

function renderWheels(data) {
  wheelGrid.innerHTML = "";
  wheels = data.wheels.filter((wheel) => !wheel.hidden).map(createWheelCard);

  wheels.forEach((wheel, index) => {
    wheel.angle = index * 0.21;
    wheel.winnerIndex = -1;
    drawWheel(wheel);
  });

  spinButton.disabled = false;
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  });

  lines.push(line);

  const startY = y - (lines.length - 1) * lineHeight / 2;
  lines.forEach((lineText, index) => {
    ctx.fillText(lineText, x, startY + index * lineHeight);
  });
}

function drawWheel(wheel, highlightIndex = -1) {
  const canvas = wheel.canvas;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const center = width / 2;
  const radius = center - 24;
  const segment = Math.PI * 2 / wheel.items.length;

  ctx.clearRect(0, 0, width, canvas.height);
  ctx.save();
  ctx.translate(center, center);
  ctx.rotate(wheel.angle);

  for (let i = 0; i < wheel.items.length; i += 1) {
    const start = i * segment;
    const end = start + segment;
    const isWinner = i === highlightIndex;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = wheel.colors[i % wheel.colors.length];
    ctx.fill();

    ctx.save();
    ctx.globalAlpha = isWinner ? 0.34 : 0.15;
    ctx.fillStyle = "#fff8eb";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start + 0.015, end - 0.015);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = "rgba(20, 18, 20, 0.38)";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.save();
    ctx.rotate(start + segment / 2);
    ctx.translate(radius * 0.59, 0);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = "#171414";
    ctx.font = "800 28px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    wrapCanvasText(ctx, wheel.items[i], 0, 0, radius * 0.45, 31);
    ctx.restore();
  }

  ctx.restore();
  drawWheelFrame(ctx, center, radius, wheel.title);
}

function drawWheelFrame(ctx, center, radius, title) {
  ctx.save();
  ctx.translate(center, center);

  const outer = ctx.createRadialGradient(-80, -100, 50, 0, 0, radius + 22);
  outer.addColorStop(0, "rgba(255, 255, 255, 0.45)");
  outer.addColorStop(0.38, "rgba(255, 255, 255, 0)");
  outer.addColorStop(0.77, "rgba(0, 0, 0, 0)");
  outer.addColorStop(1, "rgba(0, 0, 0, 0.4)");

  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 18;
  ctx.strokeStyle = "#fff8eb";
  ctx.beginPath();
  ctx.arc(0, 0, radius + 7, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 7;
  ctx.strokeStyle = "rgba(23, 20, 20, 0.72)";
  ctx.beginPath();
  ctx.arc(0, 0, radius - 8, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#171414";
  ctx.beginPath();
  ctx.arc(0, 0, 86, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff8eb";
  ctx.beginPath();
  ctx.arc(0, 0, 67, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#171414";
  ctx.font = "900 27px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, 0, 0);
  ctx.restore();
}

function getWinnerIndex(wheel) {
  const segment = Math.PI * 2 / wheel.items.length;
  const localPointer = wrapAngle(pointerAngle - wheel.angle);
  return Math.floor(localPointer / segment);
}

function getSelectedIdea() {
  const selected = Object.fromEntries(wheels.map((wheel) => [wheel.id, wheel.items[wheel.winnerIndex]]));
  const toneSentence = selected.tone ? ` Рассказ звучит как ${selected.tone}.` : "";

  return {
    selected,
    fullText: `${selected.hero} в месте «${selected.place}» ${selected.conflict}.${toneSentence}`
  };
}

function updateStory() {
  const idea = getSelectedIdea();

  storyResult.classList.remove("empty");
  storyResult.textContent = idea.fullText;
  return idea;
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function openIdeaDialog(idea) {
  const pickLabels = {
    hero: "Герой",
    place: "Место",
    conflict: "Конфликт",
    tone: "Тон"
  };

  dialogText.textContent = idea.fullText;
  dialogPicks.innerHTML = "";

  wheels.forEach((wheel) => {
    const term = document.createElement("dt");
    const description = document.createElement("dd");

    term.textContent = pickLabels[wheel.id] || wheel.title;
    description.textContent = idea.selected[wheel.id];
    dialogPicks.append(term, description);
  });

  if (typeof ideaDialog.showModal === "function") {
    ideaDialog.showModal();
  } else {
    ideaDialog.setAttribute("open", "");
  }
}

function closeIdeaDialog() {
  if (ideaDialog.open) {
    ideaDialog.close();
  }
}

function spinWheel(wheel) {
  return new Promise((resolve) => {
    const startAngle = wheel.angle;
    const targetIndex = Math.floor(Math.random() * wheel.items.length);
    const segment = Math.PI * 2 / wheel.items.length;
    const targetCenter = targetIndex * segment + segment / 2;
    const fullTurns = 5 + Math.floor(Math.random() * 5);
    const randomOffset = (Math.random() - 0.5) * segment * 0.48;
    const targetAngle = startAngle + fullTurns * Math.PI * 2 + wrapAngle(pointerAngle - targetCenter - startAngle + randomOffset);
    const duration = 3200 + Math.random() * 1900;
    const startTime = performance.now();

    function frame(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      wheel.angle = startAngle + (targetAngle - startAngle) * easeOutCubic(progress);
      drawWheel(wheel);

      if (progress < 1) {
        requestAnimationFrame(frame);
        return;
      }

      wheel.angle = wrapAngle(targetAngle);
      wheel.winnerIndex = getWinnerIndex(wheel);
      wheel.output.textContent = wheel.items[wheel.winnerIndex];
      drawWheel(wheel, wheel.winnerIndex);
      resolve();
    }

    requestAnimationFrame(frame);
  });
}

async function spinAll() {
  if (spinning) return;

  spinning = true;
  spinButton.disabled = true;
  statusText.textContent = "Колеса раскручиваются: сейчас выпадет новая завязка.";
  storyResult.classList.add("empty");
  storyResult.textContent = "Идея собирается из четырех случайных решений...";

  wheels.forEach((wheel) => {
    wheel.output.textContent = "...";
  });

  await Promise.all(wheels.map((wheel) => spinWheel(wheel)));

  const idea = updateStory();
  statusText.textContent = "Завязка готова. Сейчас открою полное задание.";
  await wait(1000);
  openIdeaDialog(idea);
  statusText.textContent = "Готово. Можно брать эту завязку или крутить еще раз.";
  spinButton.disabled = false;
  spinning = false;
}

async function init() {
  try {
    statusText.textContent = "Подбираю набор неожиданных вариантов.";
    const response = await fetch("wheels.json");

    if (!response.ok) {
      throw new Error(`Не удалось загрузить wheels.json: ${response.status}`);
    }

    const data = await response.json();
    validateWheelData(data);

    renderWheels(data);
    statusText.textContent = "Колеса ждут первого импульса.";
  } catch (error) {
    validateWheelData(fallbackWheelData);
    renderWheels(fallbackWheelData);
    statusText.textContent = "Колеса готовы к первой случайной сборке.";
    storyResult.classList.add("empty");
    storyResult.textContent = "Нажмите кнопку в центре, чтобы собрать героя, место и конфликт в одну завязку.";
    console.error(error);
  }
}

spinButton.addEventListener("click", spinAll);
dialogClose.addEventListener("click", closeIdeaDialog);
dialogAction.addEventListener("click", () => {
  closeIdeaDialog();
  spinAll();
});
init();
