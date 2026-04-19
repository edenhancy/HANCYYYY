const STORAGE_KEY = "social-uid-app";

const defaults = {
  name: "Your Name",
  tagline: "Gamer | Creator | Friend",
  instagram: "@username",
  snap: "username",
  discord: "username",
  discordServer: "Server invite or name",
  freefireUid: "UID",
  photoDataUrl: ""
};

const state = loadState();

const inputs = {
  photo: document.getElementById("photoInput"),
  name: document.getElementById("nameInput"),
  tagline: document.getElementById("taglineInput"),
  instagram: document.getElementById("instagramInput"),
  snap: document.getElementById("snapInput"),
  discord: document.getElementById("discordInput"),
  discordServer: document.getElementById("discordServerInput"),
  freefireUid: document.getElementById("freefireUidInput")
};

const displays = {
  name: document.getElementById("displayName"),
  tagline: document.getElementById("displayTagline"),
  instagram: document.getElementById("displayInstagram"),
  snap: document.getElementById("displaySnap"),
  discord: document.getElementById("displayDiscord"),
  discordServer: document.getElementById("displayDiscordServer"),
  freefireUid: document.getElementById("displayFreefireUid")
};

const avatarBadge = document.getElementById("avatarBadge");
const profilePhoto = document.getElementById("profilePhoto");
const avatarInitials = document.getElementById("avatarInitials");
const statusPill = document.getElementById("statusPill");
const copyAllBtn = document.getElementById("copyAllBtn");
const resetBtn = document.getElementById("resetBtn");
const miniCopyButtons = document.querySelectorAll(".mini-copy-btn");
const songInput = document.getElementById("songInput");
const audioPlayer = document.getElementById("audioPlayer");
const playlist = document.getElementById("playlist");
const playlistEmpty = document.getElementById("playlistEmpty");
const nowPlayingLabel = document.getElementById("nowPlayingLabel");
const trackCountPill = document.getElementById("trackCountPill");
const snowfield = document.getElementById("snowfield");
const cursorStar = document.getElementById("cursorStar");

let lastParticleTime = 0;
let tracks = [];
let activeTrackIndex = -1;

applyState();
bindEvents();
initSnowfall();
initCursorEffects();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...defaults, ...(saved || {}) };
  } catch {
    return { ...defaults };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function applyState() {
  Object.keys(inputs).forEach((key) => {
    if (key === "photo") {
      return;
    }
    inputs[key].value = state[key];
    displays[key].textContent = state[key] || defaults[key];
  });

  avatarInitials.textContent = initialsFromName(state.name);

  if (state.photoDataUrl) {
    profilePhoto.src = state.photoDataUrl;
    profilePhoto.classList.remove("hidden");
    avatarInitials.classList.add("hidden");
  } else {
    profilePhoto.removeAttribute("src");
    profilePhoto.classList.add("hidden");
    avatarInitials.classList.remove("hidden");
  }
}

function bindEvents() {
  Object.entries(inputs).forEach(([key, input]) => {
    if (key === "photo") {
      return;
    }

    input.addEventListener("input", () => {
      state[key] = input.value.trim() || defaults[key];
      applyState();
      saveState();
      flashStatus("Saved");
    });
  });

  copyAllBtn.addEventListener("click", async () => {
    const text = buildShareText();
    await copyText(text, "Copied everything");
  });

  resetBtn.addEventListener("click", () => {
    Object.assign(state, defaults);
    inputs.photo.value = "";
    applyState();
    saveState();
    flashStatus("Reset complete");
  });

  miniCopyButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const key = button.dataset.copyTarget;
      await copyText(state[key] || defaults[key], `${labelForKey(key)} copied`);
    });
  });

  songInput.addEventListener("change", () => {
    loadTracks(songInput.files);
  });

  inputs.photo.addEventListener("change", () => {
    const [file] = inputs.photo.files || [];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      state.photoDataUrl = typeof reader.result === "string" ? reader.result : "";
      applyState();
      saveState();
      flashStatus("Picture added");
    });
    reader.readAsDataURL(file);
  });

  audioPlayer.addEventListener("ended", () => {
    if (activeTrackIndex >= 0 && activeTrackIndex < tracks.length - 1) {
      playTrack(activeTrackIndex + 1);
    }
  });
}

function initSnowfall() {
  const snowflakeCount = window.matchMedia("(max-width: 920px)").matches ? 18 : 30;

  for (let index = 0; index < snowflakeCount; index += 1) {
    const flake = document.createElement("span");
    flake.className = "snowflake";
    flake.innerHTML = "&#10052;";
    flake.style.left = `${Math.random() * 100}%`;
    flake.style.fontSize = `${10 + Math.random() * 18}px`;
    flake.style.opacity = `${0.4 + Math.random() * 0.45}`;
    flake.style.animationDuration = `${7 + Math.random() * 9}s`;
    flake.style.animationDelay = `${Math.random() * -12}s`;
    snowfield.appendChild(flake);
  }
}

function initCursorEffects() {
  if (!window.matchMedia("(pointer: fine)").matches) {
    return;
  }

  document.addEventListener("pointermove", (event) => {
    cursorStar.classList.remove("hidden");
    cursorStar.style.transform = `translate(${event.clientX}px, ${event.clientY}px) scale(1)`;

    const now = performance.now();
    if (now - lastParticleTime > 40) {
      spawnStarParticle(event.clientX, event.clientY);
      lastParticleTime = now;
    }
  });

  document.addEventListener("pointerdown", () => {
    cursorStar.style.scale = "1.2";
  });

  document.addEventListener("pointerup", () => {
    cursorStar.style.scale = "1";
  });

  document.addEventListener("pointerleave", () => {
    cursorStar.classList.add("hidden");
  });
}

function spawnStarParticle(x, y) {
  const particle = document.createElement("span");
  particle.className = "star-particle";
  particle.innerHTML = Math.random() > 0.5 ? "&#10022;" : "&#10023;";
  particle.style.left = `${x}px`;
  particle.style.top = `${y}px`;
  particle.style.setProperty("--drift-x", `${-10 + Math.random() * 20}px`);
  particle.style.setProperty("--drift-y", `${-10 + Math.random() * 20}px`);
  document.body.appendChild(particle);

  window.setTimeout(() => {
    particle.remove();
  }, 700);
}

function loadTracks(fileList) {
  const freshTracks = Array.from(fileList || []).map((file) => ({
    name: file.name,
    url: URL.createObjectURL(file)
  }));

  tracks.forEach((track) => {
    URL.revokeObjectURL(track.url);
  });

  tracks = freshTracks;
  activeTrackIndex = -1;
  renderPlaylist();

  if (tracks.length > 0) {
    playTrack(0);
    flashStatus("Songs loaded");
  } else {
    nowPlayingLabel.textContent = "Nothing loaded yet";
    trackCountPill.textContent = "No Tracks";
  }
}

function renderPlaylist() {
  playlist.innerHTML = "";

  if (tracks.length === 0) {
    playlist.appendChild(playlistEmpty);
    trackCountPill.textContent = "No Tracks";
    return;
  }

  trackCountPill.textContent = `${tracks.length} Track${tracks.length === 1 ? "" : "s"}`;

  tracks.forEach((track, index) => {
    const item = document.createElement("div");
    item.className = `track-item${index === activeTrackIndex ? " active" : ""}`;
    item.innerHTML = `
      <div class="track-meta">
        <span>Playlist Item ${index + 1}</span>
        <strong>${escapeHtml(track.name)}</strong>
      </div>
      <button class="mini-copy-btn play-track-btn" type="button">Play</button>
    `;

    item.querySelector("button").addEventListener("click", () => {
      playTrack(index);
    });

    playlist.appendChild(item);
  });
}

function playTrack(index) {
  const track = tracks[index];
  if (!track) {
    return;
  }

  activeTrackIndex = index;
  audioPlayer.src = track.url;
  audioPlayer.play().catch(() => {
    flashStatus("Tap play to start");
  });
  nowPlayingLabel.textContent = track.name;
  renderPlaylist();
}

async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    flashStatus(message);
  } catch {
    flashStatus("Copy failed");
  }
}

function flashStatus(message) {
  statusPill.textContent = message;
  window.clearTimeout(flashStatus.timeoutId);
  flashStatus.timeoutId = window.setTimeout(() => {
    statusPill.textContent = "Ready";
  }, 1400);
}

function initialsFromName(name) {
  const words = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return words.map((word) => word[0]?.toUpperCase() || "").join("") || "YN";
}

function labelForKey(key) {
  const labels = {
    instagram: "Instagram",
    snap: "Snap ID",
    discord: "Discord",
    discordServer: "Discord Server",
    freefireUid: "Free Fire UID"
  };

  return labels[key] || "Value";
}

function buildShareText() {
  return [
    `${state.name}`,
    `${state.tagline}`,
    `Instagram: ${state.instagram}`,
    `Snap ID: ${state.snap}`,
    `Discord: ${state.discord}`,
    `Discord Server: ${state.discordServer}`,
    `Free Fire UID: ${state.freefireUid}`
  ].join("\n");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
