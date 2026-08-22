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

export async function getPetScale(): Promise<number> {
  return invoke<number>("get_pet_scale");
}

export async function setPetScale(scale: number): Promise<number> {
  return invoke<number>("set_pet_scale", { scale });
}

export async function getPetRole(): Promise<string> {
  return invoke<string>("get_pet_role");
}

export async function setPetRole(role: string): Promise<string> {
  return invoke<string>("set_pet_role", { role });
}

