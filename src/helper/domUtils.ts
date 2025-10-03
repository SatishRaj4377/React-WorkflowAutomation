// Insert text at caret for EJ2 input/textarea
export function insertAtCaret(
  el: HTMLInputElement | HTMLTextAreaElement,
  text: string
): { nextValue: string; nextCaret: number } {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const nextValue = el.value.slice(0, start) + text + el.value.slice(end);
  const nextCaret = start + text.length;
  return { nextValue, nextCaret };
}

// Find the native EJ2 input/textarea inside the TextBox wrapper
export function findNativeInput(container: HTMLElement | null) {
  if (!container) return null;
  return container.querySelector(
    'input.e-input, textarea.e-input'
  ) as HTMLInputElement | HTMLTextAreaElement | null;
}

// Ensure a portal root for the popup
export function ensurePortalRoot(): HTMLElement {
  let root = document.getElementById('variable-picker-portal-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'variable-picker-portal-root';
    document.body.appendChild(root);
  }
  return root;
}