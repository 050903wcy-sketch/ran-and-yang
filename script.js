const colors = ["#f35e9b", "#8067e8", "#54b9df", "#63c7a2", "#f3c94c"];
const symbols = ["LOVE", "+1", "+520", "HP", "100%"];
const editStorageKey = "couple-page-edits-v2";
const photoStorageKey = "couple-page-photos-v2";
const questStorageKey = "couple-page-quests-v2";
const anniversaryDate = new Date("2025-05-16T00:00:00+08:00");

const defaultPhotos = [
  {
    src: "assets/couple-game-day.jpg",
    label: "Chapter 01",
    title: "小扬和小冉的第一张主线 CG",
    desc: "从2025年5月16日开始，普通的一天也可以被保存成很可爱的纪念。",
  },
  {
    src: "assets/couple-cute-win.jpg",
    label: "Chapter 02",
    title: "You Win, 小冉!",
    desc: "小扬想把每一次靠近都写进存档，奖励是更多拥抱、偏爱和见面。",
  },
];

const defaultQuests = [
  { text: "小扬见到小冉先抱十秒", done: true },
  { text: "一起拍一张新的合照", done: true },
  { text: "5月16日一起过纪念日", done: false },
  { text: "睡前说一句我喜欢你", done: false },
];

const surpriseButton = document.querySelector("#surpriseButton");
const photoInput = document.querySelector("#photoInput");
const albumGrid = document.querySelector("#albumGrid");
const questList = document.querySelector("#questList");
const addQuestButton = document.querySelector("#addQuestButton");
const heroImage = document.querySelector("#heroImage");
const meterFill = document.querySelector("#meterFill");
const meterPercent = document.querySelector("#meterPercent");
const anniversaryDays = document.querySelector("#anniversaryDays");

let photos = loadJson(photoStorageKey, defaultPhotos);
let quests = loadJson(questStorageKey, defaultQuests);
let edits = loadJson(editStorageKey, {});

function loadJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function createFloatingHeart(x, y) {
  const heart = document.createElement("span");
  heart.className = "floating-heart";
  heart.textContent = symbols[Math.floor(Math.random() * symbols.length)];
  heart.style.setProperty("--x", `${x}px`);
  heart.style.setProperty("--y", `${y}px`);
  heart.style.setProperty("--heart-color", colors[Math.floor(Math.random() * colors.length)]);
  heart.style.setProperty("--size", `${Math.floor(Math.random() * 12) + 18}px`);
  document.body.appendChild(heart);
  window.setTimeout(() => heart.remove(), 1200);
}

function setupEditableText() {
  document.querySelectorAll("[contenteditable][data-edit-key]").forEach((element) => {
    const key = element.dataset.editKey;
    if (edits[key]) element.innerText = edits[key];

    element.addEventListener("input", () => {
      edits[key] = element.innerText.trim();
      saveJson(editStorageKey, edits);
    });

    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !element.matches("p")) {
        event.preventDefault();
        element.blur();
      }
    });
  });
}

function updateAnniversaryDays() {
  const today = new Date();
  const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const anniversaryAtMidnight = new Date(
    anniversaryDate.getFullYear(),
    anniversaryDate.getMonth(),
    anniversaryDate.getDate(),
  );
  const diff = todayAtMidnight - anniversaryAtMidnight;
  const days = Math.floor(diff / 86400000) + 1;
  const savedDays = edits.statBonusValue;

  if (!savedDays || /^第\d+天$/.test(savedDays)) {
    anniversaryDays.innerText = `第${days}天`;
    edits.statBonusValue = anniversaryDays.innerText;
    saveJson(editStorageKey, edits);
  }
}

function renderPhotos() {
  albumGrid.innerHTML = "";
  photos.forEach((photo, index) => {
    const card = document.createElement("article");
    card.className = `memory-card ${index % 2 ? "tilt-right" : "tilt-left"}`;
    card.innerHTML = `
      <div class="photo-wrap">
        <img src="${photo.src}" alt="情侣相册照片" />
        <label class="photo-tool">
          更换
          <input type="file" accept="image/*" data-photo-replace="${index}" />
        </label>
      </div>
      <div class="memory-caption">
        <span contenteditable="true" data-photo-field="label">${photo.label}</span>
        <h3 contenteditable="true" data-photo-field="title">${photo.title}</h3>
        <p contenteditable="true" data-photo-field="desc">${photo.desc}</p>
        <button class="text-button" type="button" data-photo-delete="${index}">删除这张</button>
      </div>
    `;

    card.querySelectorAll("[data-photo-field]").forEach((field) => {
      field.addEventListener("input", () => {
        photos[index][field.dataset.photoField] = field.innerText.trim();
        saveJson(photoStorageKey, photos);
      });
    });

    card.querySelector("[data-photo-replace]").addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file) return;
      readFileAsDataUrl(file).then((src) => {
        photos[index].src = src;
        saveJson(photoStorageKey, photos);
        renderPhotos();
      });
    });

    card.querySelector("[data-photo-delete]").addEventListener("click", () => {
      photos.splice(index, 1);
      if (!photos.length) photos = [...defaultPhotos];
      saveJson(photoStorageKey, photos);
      renderPhotos();
      renderHeroImage();
    });

    albumGrid.appendChild(card);
  });

  renderHeroImage();
}

function renderHeroImage() {
  heroImage.src = photos[0]?.src || defaultPhotos[0].src;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resizeImage(reader.result).then(resolve).catch(() => resolve(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resizeImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const maxSide = 1600;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    image.onerror = reject;
    image.src = src;
  });
}

function renderQuests() {
  questList.innerHTML = "";
  quests.forEach((quest, index) => {
    const item = document.createElement("label");
    item.className = "quest-item";
    item.innerHTML = `
      <input type="checkbox" ${quest.done ? "checked" : ""} />
      <span contenteditable="true">${quest.text}</span>
      <button class="remove-quest" type="button" aria-label="删除任务">×</button>
    `;

    item.querySelector("input").addEventListener("change", (event) => {
      quests[index].done = event.target.checked;
      saveJson(questStorageKey, quests);
      updateMeter();
    });

    item.querySelector("span").addEventListener("input", (event) => {
      quests[index].text = event.target.innerText.trim();
      saveJson(questStorageKey, quests);
    });

    item.querySelector(".remove-quest").addEventListener("click", (event) => {
      event.preventDefault();
      quests.splice(index, 1);
      saveJson(questStorageKey, quests);
      renderQuests();
    });

    questList.appendChild(item);
  });

  updateMeter();
}

function updateMeter() {
  const done = quests.filter((quest) => quest.done).length;
  const percent = quests.length ? Math.round((done / quests.length) * 100) : 0;
  meterFill.style.width = `${percent}%`;
  meterPercent.textContent = `${percent}%`;
}

photoInput.addEventListener("change", async (event) => {
  const files = [...event.target.files];
  if (!files.length) return;

  for (const file of files) {
    const src = await readFileAsDataUrl(file);
    photos.push({
      src,
      label: `Chapter ${String(photos.length + 1).padStart(2, "0")}`,
      title: "新的回忆",
      desc: "点这里写下这张照片背后的故事。",
    });
  }

  saveJson(photoStorageKey, photos);
  renderPhotos();
  event.target.value = "";
});

addQuestButton.addEventListener("click", () => {
  quests.push({ text: "新的甜蜜任务", done: false });
  saveJson(questStorageKey, quests);
  renderQuests();
});

document.addEventListener("click", (event) => {
  if (event.target.closest("a, button, input, label, [contenteditable]")) return;
  createFloatingHeart(event.clientX, event.clientY);
});

surpriseButton.addEventListener("click", () => {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  for (let index = 0; index < 18; index += 1) {
    window.setTimeout(() => {
      const offsetX = (Math.random() - 0.5) * 320;
      const offsetY = (Math.random() - 0.5) * 160;
      createFloatingHeart(centerX + offsetX, centerY + offsetY);
    }, index * 45);
  }
});

setupEditableText();
updateAnniversaryDays();
renderPhotos();
renderQuests();
