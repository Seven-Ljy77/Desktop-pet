import { invoke } from "@tauri-apps/api/core";
import type {
  BubblePayload,
  InteractionRequest,
  InteractionResponse,
} from "./types";

export const isTauri = (): boolean => "__TAURI_INTERNALS__" in window;

export async function requestInteraction(
  payload: InteractionRequest,
): Promise<InteractionResponse> {
  return invoke<InteractionResponse>("request_interaction", { payload });
}

export async function showBubble(payload: BubblePayload): Promise<void> {
  await invoke("show_bubble", { payload });
}

export async function hideBubble(): Promise<void> {
  await invoke("hide_bubble");
}

export async function startPetDrag(): Promise<void> {
  await invoke("start_pet_drag");
}

