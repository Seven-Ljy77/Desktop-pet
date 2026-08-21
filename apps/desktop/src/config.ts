function millisecondsFromEnv(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(import.meta.env[name]);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)));
}

export const interactionTiming = Object.freeze({
  hoverDwellMs: 300,
  manualClickCooldownMs: millisecondsFromEnv(
    "VITE_MANUAL_CLICK_COOLDOWN_MS",
    1_200,
    0,
    60_000,
  ),
  dragHoldMs: 220,
  dragDistancePx: 6,
});

