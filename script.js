const colors = ["#f35e9b", "#8067e8", "#54b9df", "#63c7a2", "#f3c94c"];
const symbols = ["LOVE", "+1", "+520", "HP", "100%"];
const editStorageKey = "couple-page-edits-v2";
const legacyPhotoStorageKey = "couple-page-photos-v2";
const questStorageKey = "couple-page-quests-v2";
const photoDbName = "couple-page-photo-db";
const photoStoreName = "photos";
const anniversaryDate = new Date("2025-05-16T00:00:00+08:00");

const storyTemplates = [
  {
    title: "靠近一点的瞬间",
    desc: "这一刻不用说太多，画面已经替小扬和小冉把喜欢藏好了。",
  },
  {
    title: "今天也有认真想你",
    desc: "普通日子里的小小记录，后来都会变成一翻到就会笑的证据。",
  },
  {
    title: "小冉限定存档",
    desc: "这是小扬想反复保存的一页，连空气里都像有一点甜。",
  },
  {
    title: "见面副本完成",
    desc: "两个人待在一起的时候，时间总是跑得很快，但回忆会留下来。",
  },
  {
    title: "心动进度 +1",
    desc: "这张照片负责证明：喜欢不是突然满格，是每天都在偷偷增加。",
  },
  {
    title: "只属于我们的可爱",
    desc: "别人看到的是照片，小扬和小冉看到的是那天的心情和温度。",
  },
  {
    title: "把今天装进口袋",
    desc: "以后再打开这一页，就能重新捡到当时的开心。",
  },
  {
    title: "恋爱主线继续中",
    desc: "从2025年5月16日开始，每一张新照片都是下一章的开头。",
  },
];

const defaultPhotos = [
  {
    id: "default-1",
    src: "images/couple/couple-game-day.jpg",
    label: "Chapter 01",
    title: "小扬和小冉的第一张主线 CG",
    desc: "从2025年5月16日开始，普通的一天也可以被保存成很可爱的纪念。",
    builtIn: true,
  },
  {
    id: "default-2",
    src: "images/couple/couple-cute-win.jpg",
    label: "Chapter 02",
    title: "You Win, 小冉!",
    desc: "小扬想把每一次靠近都写进存档，奖励是更多拥抱、偏爱和见面。",
    builtIn: true,
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

let photoDb;
let photos = [];
let quests = loadJson(questStorageKey, defaultQuests);
let edits = loadJson(editStorageKey, {});
let activeObjectUrls = [];

function loadJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Local text save failed. Photo migration can still continue.", error);
  }
}

function openPhotoDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(photoDbName, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(photoStoreName)) {
        db.createObjectStore(photoStoreName, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function photoTransaction(mode = "readonly") {
  return photoDb.transaction(photoStoreName, mode).objectStore(photoStoreName);
}

function getAllStoredPhotos() {
  return new Promise((resolve, reject) => {
    const request = photoTransaction().getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function putStoredPhoto(photo) {
  return new Promise((resolve, reject) => {
    const request = photoTransaction("readwrite").put(photo);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function deleteStoredPhoto(id) {
  return new Promise((resolve, reject) => {
    const request = photoTransaction("readwrite").delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function loadPhotos() {
  const storedPhotos = await getAllStoredPhotos();

  if (!storedPhotos.length) {
    const legacyPhotos = loadJson(legacyPhotoStorageKey, defaultPhotos);
    const migratedPhotos = legacyPhotos.map((photo, index) => normalizePhoto(photo, index));

    for (const photo of migratedPhotos) {
      await putStoredPhoto(photo);
    }

    localStorage.removeItem(legacyPhotoStorageKey);
    return migratedPhotos;
  }

  const normalizedPhotos = storedPhotos
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((photo, index) => normalizePhoto(photo, index));

  for (const photo of normalizedPhotos) {
    await putStoredPhoto(photo);
  }

  return normalizedPhotos;
}

function normalizePhoto(photo, index) {
  const template = storyTemplates[Math.max(0, index - 2) % storyTemplates.length];
  const isPlaceholderTitle = !photo.title || photo.title === "新的回忆";
  const isPlaceholderDesc = !photo.desc || photo.desc === "点这里写下这张照片背后的故事。";

  return {
    ...photo,
    src: normalizeImagePath(photo.src),
    id: photo.id || `photo-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
    order: Number.isFinite(photo.order) ? photo.order : index,
    label: photo.label || `Chapter ${String(index + 1).padStart(2, "0")}`,
    title: isPlaceholderTitle ? template.title : photo.title,
    desc: isPlaceholderDesc ? template.desc : photo.desc,
  };
}

function normalizeImagePath(src) {
  if (typeof src !== "string") return src;

  const filename = src.split(/[\\/]/).pop()?.toLowerCase();

  if (filename === "couple-game-day.jpg") return "images/couple/couple-game-day.jpg";
  if (filename === "couple-cute-win.jpg") return "images/couple/couple-cute-win.jpg";

  return src;
}

function createNewPhoto(src, index) {
  const template = storyTemplates[Math.max(0, index - 2) % storyTemplates.length];

  return {
    id: `photo-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
    order: index,
    src,
    label: `Chapter ${String(index + 1).padStart(2, "0")}`,
    title: template.title,
    desc: template.desc,
  };
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
  activeObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  activeObjectUrls = [];
  albumGrid.innerHTML = "";

  photos.forEach((photo, index) => {
    const imageSrc = getPhotoImageSrc(photo);
    const card = document.createElement("article");
    card.className = "memory-card";
    card.innerHTML = `
      <div class="photo-wrap">
        <img src="${imageSrc}" alt="情侣相册照片" loading="lazy" />
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
        putStoredPhoto(photos[index]);
      });
    });

    card.querySelector("[data-photo-replace]").addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const src = await readFileAsDataUrl(file);
      photos[index].src = src;
      await putStoredPhoto(photos[index]);
      renderPhotos();
    });

    card.querySelector("[data-photo-delete]").addEventListener("click", async () => {
      await deleteStoredPhoto(photos[index].id);
      photos.splice(index, 1);

      if (!photos.length) {
        photos = defaultPhotos.map((photo, photoIndex) => normalizePhoto(photo, photoIndex));
        for (const fallbackPhoto of photos) {
          await putStoredPhoto(fallbackPhoto);
        }
      }

      await reindexPhotos();
      renderPhotos();
    });

    albumGrid.appendChild(card);
  });

  renderHeroImage();
}

function renderHeroImage() {
  heroImage.src = getPhotoImageSrc(photos[0] || defaultPhotos[0]);
}

function getPhotoImageSrc(photo) {
  if (photo.src instanceof Blob) {
    const url = URL.createObjectURL(photo.src);
    activeObjectUrls.push(url);
    return url;
  }

  return photo.src || defaultPhotos[0].src;
}

async function reindexPhotos() {
  photos = photos.map((photo, index) => ({
    ...photo,
    order: index,
    label: photo.label || `Chapter ${String(index + 1).padStart(2, "0")}`,
  }));

  for (const photo of photos) {
    await putStoredPhoto(photo);
  }
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
      const maxSide = 1800;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Image compression failed"));
          }
        },
        "image/jpeg",
        0.82,
      );
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

  photoInput.disabled = true;

  try {
    for (const file of files) {
      const src = await readFileAsDataUrl(file);
      const photo = createNewPhoto(src, photos.length);
      photos.push(photo);
      await putStoredPhoto(photo);
    }

    await reindexPhotos();
    renderPhotos();
  } catch (error) {
    window.alert("这次照片保存失败了。可以先少选几张，或换成体积小一点的图片再试。");
    console.error(error);
  } finally {
    photoInput.disabled = false;
    event.target.value = "";
  }
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

async function init() {
  setupEditableText();
  updateAnniversaryDays();
  renderQuests();

  try {
    photoDb = await openPhotoDb();
    photos = await loadPhotos();
    renderPhotos();
  } catch (error) {
    console.error(error);
    photos = defaultPhotos;
    renderPhotos();
  }
}

init();
