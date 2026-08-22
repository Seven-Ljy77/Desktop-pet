import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import deepSeekPetImageUrl from "@pet-image/ds.png";
import rymPetImageUrl from "@pet-image/rym.png";
import taffyPetImageUrl from "@pet-image/taffy.png";
import {
  getPetRole,
  getPetScale,
  hideBubble,
  isTauri,
  requestInteraction,
  setPetRole,
  setPetScale,
  showBubble,
  startPetDrag,
} from "./api";
import { interactionTiming } from "./config";
import type {
  BubblePayload,
  InteractionEvent,
  InteractionResponse,
} from "./types";
import "./styles.css";

const APP_VERSION = "0.1.0";
type PetRole = "deepseek" | "taffy" | "rym";

const PET_IMAGE_URLS: Readonly<Record<PetRole, string>> = {
  deepseek: deepSeekPetImageUrl,
  taffy: taffyPetImageUrl,
  rym: rymPetImageUrl,
};

function isPetRole(role: string): role is PetRole {
  return role in PET_IMAGE_URLS;
}
const FALLBACK_RESPONSES: readonly InteractionResponse[] = [
  {
    message: "我在这里。后端暂时没有回应，但不影响我们继续玩。",
    emotion: "calm",
    animation: "nod",
    display_ms: 4_500,
    cooldown_ms: 8_000,
    request_id: "local-fallback-1",
  },
  {
    message: "刚才那一下我感觉到了。",
    emotion: "happy",
    animation: "bounce",
    display_ms: 4_000,
    cooldown_ms: 8_000,
    request_id: "local-fallback-2",
  },
  {
    message: "再忙也要记得偶尔放松一下。",
    emotion: "caring",
    animation: "wave",
    display_ms: 4_500,
    cooldown_ms: 8_000,
    request_id: "local-fallback-3",
  },
];

let fallbackIndex = 0;

function nextFallbackResponse(): InteractionResponse {
  const response = FALLBACK_RESPONSES[fallbackIndex];
  fallbackIndex = (fallbackIndex + 1) % FALLBACK_RESPONSES.length;
  return response;
}

function getClientId(): string {
  const storageKey = "desktop-pet-client-id";
  const existing = localStorage.getItem(storageKey);
  if (existing) return existing;

  const created = crypto.randomUUID();
  localStorage.setItem(storageKey, created);
  return created;
}

function currentView(): "pet" | "bubble" | "settings" {
  if (isTauri()) {
    const label = getCurrentWindow().label;
    if (label === "bubble" || label === "settings") return label;
    return "pet";
  }
  const view = new URLSearchParams(location.search).get("view");
  return view === "bubble" || view === "settings" ? view : "pet";
}

function renderPet(root: HTMLElement): void {
  document.body.dataset.view = "pet";
  root.innerHTML = `
    <section class="pet-stage" aria-label="桌面宠物">
      <img class="pet-image" src="${PET_IMAGE_URLS.deepseek}" alt="桌面宠物" draggable="false" />
      <span class="status-dot" aria-hidden="true"></span>
    </section>
  `;

  const stage = root.querySelector<HTMLElement>(".pet-stage");
  const petImage = root.querySelector<HTMLImageElement>(".pet-image");
  if (!stage || !petImage) return;

  const displayPetRole = (role: string): void => {
    if (isPetRole(role)) petImage.src = PET_IMAGE_URLS[role];
  };
  if (isTauri()) {
    void getPetRole()
      .then(displayPetRole)
      .catch((error) => console.error("Unable to load pet role.", error));
    void listen<string>("pet-role-changed", ({ payload }) => displayPetRole(payload));
  }

  let hovering = false;
  let dwellTimer: number | undefined;
  let dragTimer: number | undefined;
  let manualBubbleTimer: number | undefined;
  let hoverGeneration = 0;
  let requestGeneration = 0;
  let hoverCooldownUntil = 0;
  let manualClickCooldownUntil = 0;
  let manualBubbleActive = false;
  let pointerDown:
    | {
        id: number;
        x: number;
        y: number;
        dragging: boolean;
      }
    | undefined;

  const clearDwell = (): void => {
    if (dwellTimer !== undefined) {
      window.clearTimeout(dwellTimer);
      dwellTimer = undefined;
    }
  };

  const clearDragTimer = (): void => {
    if (dragTimer !== undefined) {
      window.clearTimeout(dragTimer);
      dragTimer = undefined;
    }
  };

  const runInteraction = async (
    event: InteractionEvent,
    expectedHoverGeneration?: number,
  ): Promise<void> => {
    const isManualClick = event === "manual_click";

    if (isManualClick) {
      if (Date.now() < manualClickCooldownUntil) return;
      manualClickCooldownUntil =
        Date.now() + interactionTiming.manualClickCooldownMs;
      manualBubbleActive = true;
      hoverGeneration += 1;
      clearDwell();
    } else if (
      !hovering ||
      manualBubbleActive ||
      Date.now() < hoverCooldownUntil ||
      expectedHoverGeneration !== hoverGeneration
    ) {
      return;
    }

    const request = ++requestGeneration;

    stage.dataset.state = "loading";
    let response = nextFallbackResponse();

    if (isTauri()) {
      try {
        response = await requestInteraction({
          event,
          pet_id: "default",
          client_id: getClientId(),
          locale: navigator.language || "zh-CN",
          app_version: APP_VERSION,
        });
      } catch (error) {
        console.warn("Interaction server unavailable; using local fallback.", error);
      }
    } else {
      response = {
        ...response,
        message: "这是浏览器预览；在 Tauri 中会连接 FastAPI 后端。",
      };
    }

    if (request !== requestGeneration) return;
    if (
      !isManualClick &&
      (!hovering || expectedHoverGeneration !== hoverGeneration)
    ) {
      return;
    }

    if (!isManualClick) {
      hoverCooldownUntil = Date.now() + response.cooldown_ms;
    }
    stage.dataset.state = "speaking";
    stage.dataset.animation = response.animation;

    if (isTauri()) {
      await showBubble({
        message: response.message,
        emotion: response.emotion,
        animation: response.animation,
        display_ms: response.display_ms,
      });
    }

    if (manualBubbleTimer !== undefined) {
      window.clearTimeout(manualBubbleTimer);
    }
    window.setTimeout(() => {
      if (request !== requestGeneration) return;
      if (stage.dataset.state === "speaking") {
        stage.dataset.state = hovering ? "hover" : "idle";
        delete stage.dataset.animation;
      }
    }, response.display_ms);

    if (isManualClick) {
      manualBubbleTimer = window.setTimeout(() => {
        if (request !== requestGeneration) return;
        manualBubbleActive = false;
        if (isTauri()) {
          window.setTimeout(() => void hideBubble(), 220);
        }
      }, response.display_ms);
    }
  };

  const beginDrag = (): void => {
    if (!pointerDown || pointerDown.dragging) return;
    pointerDown.dragging = true;
    requestGeneration += 1;
    manualBubbleActive = false;
    if (manualBubbleTimer !== undefined) {
      window.clearTimeout(manualBubbleTimer);
      manualBubbleTimer = undefined;
    }
    if (isTauri()) {
      void hideBubble();
      void startPetDrag();
    }
  };

  stage.addEventListener("pointerenter", () => {
    hovering = true;
    hoverGeneration += 1;
    stage.dataset.state = "hover";
    clearDwell();
    const generation = hoverGeneration;
    dwellTimer = window.setTimeout(() => {
      void runInteraction("hover_enter", generation);
    }, interactionTiming.hoverDwellMs);
  });

  stage.addEventListener("pointerleave", () => {
    hovering = false;
    hoverGeneration += 1;
    clearDwell();
    if (!manualBubbleActive) {
      stage.dataset.state = "idle";
      delete stage.dataset.animation;
    }
    if (isTauri() && !manualBubbleActive) {
      window.setTimeout(() => void hideBubble(), 250);
    }
  });

  stage.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    clearDwell();
    hoverGeneration += 1;
    pointerDown = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      dragging: false,
    };
    try {
      stage.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort in embedded webviews.
    }
    clearDragTimer();
    dragTimer = window.setTimeout(beginDrag, interactionTiming.dragHoldMs);
  });

  stage.addEventListener("pointermove", (event) => {
    if (!pointerDown || pointerDown.id !== event.pointerId || pointerDown.dragging) {
      return;
    }
    const distance = Math.hypot(
      event.clientX - pointerDown.x,
      event.clientY - pointerDown.y,
    );
    if (distance >= interactionTiming.dragDistancePx) beginDrag();
  });

  stage.addEventListener("pointerup", (event) => {
    if (!pointerDown || pointerDown.id !== event.pointerId) return;
    const wasDragging = pointerDown.dragging;
    pointerDown = undefined;
    clearDragTimer();
    try {
      stage.releasePointerCapture(event.pointerId);
    } catch {
      // The native drag operation may already have released capture.
    }
    if (!wasDragging) void runInteraction("manual_click");
  });

  stage.addEventListener("pointercancel", () => {
    pointerDown = undefined;
    clearDragTimer();
  });

  stage.addEventListener("contextmenu", (event) => event.preventDefault());
}

function renderBubble(root: HTMLElement): void {
  document.body.dataset.view = "bubble";
  root.innerHTML = `
    <aside class="speech-bubble" role="status" aria-live="polite">
      <p class="speech-text">你好，我是你的桌面宠物。</p>
    </aside>
  `;

  const bubble = root.querySelector<HTMLElement>(".speech-bubble");
  const text = root.querySelector<HTMLElement>(".speech-text");
  if (!bubble || !text) return;

  let hideTimer: number | undefined;
  const display = (payload: BubblePayload): void => {
    text.textContent = payload.message;
    bubble.dataset.emotion = payload.emotion;
    bubble.classList.remove("is-visible");
    requestAnimationFrame(() => bubble.classList.add("is-visible"));

    if (hideTimer !== undefined) window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      bubble.classList.remove("is-visible");
    }, payload.display_ms);
  };

  if (isTauri()) {
    void listen<BubblePayload>("bubble-show", ({ payload }) => display(payload));
  } else {
    bubble.classList.add("is-visible");
  }
}

function renderSettings(root: HTMLElement): void {
  document.body.dataset.view = "settings";
  root.innerHTML = `
    <main class="settings-panel">
      <h1>设置</h1>
      <section class="settings-card" aria-labelledby="pet-size-heading">
        <div class="settings-heading">
          <h2 id="pet-size-heading">宠物大小</h2>
          <output class="settings-value" for="pet-scale">100%</output>
        </div>
        <input
          class="settings-range"
          id="pet-scale"
          type="range"
          min="60"
          max="160"
          step="5"
          value="100"
          aria-label="宠物大小"
        />
        <div class="settings-range-labels" aria-hidden="true"><span>60%</span><span>160%</span></div>
      </section>
      <section class="settings-card" aria-labelledby="pet-role-heading">
        <div class="settings-heading">
          <h2 id="pet-role-heading">宠物角色：</h2>
        </div>
        <div class="settings-role-options" role="group" aria-labelledby="pet-role-heading">
          <button class="settings-role-option" type="button" data-pet-role="deepseek">DeepSeek鲸鱼娘</button>
          <button class="settings-role-option" type="button" data-pet-role="taffy">永雏塔菲</button>
          <button class="settings-role-option" type="button" data-pet-role="rym">若叶睦</button>
        </div>
      </section>
    </main>
  `;

  const range = root.querySelector<HTMLInputElement>("#pet-scale");
  const value = root.querySelector<HTMLOutputElement>(".settings-value");
  if (!range || !value) return;

  const renderValue = (percentage: number): void => {
    value.value = `${percentage}%`;
    value.textContent = `${percentage}%`;
  };
  const applyScale = async (): Promise<void> => {
    const percentage = Number(range.value);
    renderValue(percentage);
    if (!isTauri()) return;
    try {
      const applied = await setPetScale(percentage / 100);
      const appliedPercentage = Math.round(applied * 100);
      range.value = String(appliedPercentage);
      renderValue(appliedPercentage);
    } catch (error) {
      console.error("Unable to update pet scale.", error);
    }
  };

  range.addEventListener("input", () => void applyScale());
  if (isTauri()) {
    void getPetScale()
      .then((scale) => {
        const percentage = Math.round(scale * 100);
        range.value = String(percentage);
        renderValue(percentage);
      })
      .catch((error) => console.error("Unable to load pet scale.", error));
  }

  const roleButtons = root.querySelectorAll<HTMLButtonElement>("[data-pet-role]");
  const selectRole = (role: string): void => {
    roleButtons.forEach((button) => {
      const selected = button.dataset.petRole === role;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  };
  roleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const role = button.dataset.petRole;
      if (!role || !isTauri()) return;
      void setPetRole(role)
        .then(selectRole)
        .catch((error) => console.error("Unable to update pet role.", error));
    });
  });
  if (isTauri()) {
    void getPetRole()
      .then(selectRole)
      .catch((error) => console.error("Unable to load pet role.", error));
  } else {
    selectRole("deepseek");
  }
}

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Missing #app root element");

if (currentView() === "settings") {
  renderSettings(root);
} else if (currentView() === "bubble") {
  renderBubble(root);
} else {
  renderPet(root);
}
