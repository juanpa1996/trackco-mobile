let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(fn: () => void): void {
  onUnauthorized = fn;
}

export function triggerUnauthorized(): void {
  onUnauthorized?.();
}
