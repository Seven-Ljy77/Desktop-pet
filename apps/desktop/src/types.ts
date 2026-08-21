export type PetAnimation = "bounce" | "nod" | "wave";
export type InteractionEvent = "hover_enter" | "manual_click";

export interface InteractionRequest {
  event: InteractionEvent;
  pet_id: string;
  client_id: string;
  locale: string;
  app_version: string;
}

export interface InteractionResponse {
  message: string;
  emotion: string;
  animation: PetAnimation;
  display_ms: number;
  cooldown_ms: number;
  request_id: string;
}

export interface BubblePayload {
  message: string;
  emotion: string;
  animation: PetAnimation;
  display_ms: number;
}
