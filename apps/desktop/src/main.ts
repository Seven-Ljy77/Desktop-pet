import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import petImageUrl from "@pet-image/0.png";
import {
  hideBubble,
  isTauri,
  requestInteraction,
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

function currentView(): "pet" | "bubble" {
  if (isTauri()) {
    return getCurrentWindow().label === "bubble" ? "bubble" : "pet";
  }
  return new URLSearchParams(location.search).get("view") === "bubble"
    ? "bubble"
    : "pet";
}

function renderPet(root: HTMLElement): void {
  document.body.dataset.view = "pet";
  root.innerHTML = `
    <section class="pet-stage" aria-label="桌面宠物">
      <img class="pet-image" src="${petImageUrl}" alt="桌面宠物" draggable="false" />
      <span class="status-dot" aria-hidden="true"></span>
    </section>
  `;

  const stage = root.querySelector<HTMLElement>(".pet-stage");
  if (!stage) return;

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

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Missing #app root element");

if (currentView() === "bubble") {
  renderBubble(root);
} else {
  renderPet(root);
}
