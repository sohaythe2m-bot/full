/**
 * buttonState.js
 * Prevents double-submits and gives every form consistent loading UX.
 */
export function setLoading(button, isLoading, loadingText, idleText) {
  if (!button) return;
  button.disabled = isLoading;
  const labelEl = button.querySelector('[id$="Label"]') || button;
  if (isLoading) {
    button.dataset.prevHtml = button.dataset.prevHtml || labelEl.innerHTML;
    labelEl.innerHTML = `<span class="spinner" aria-hidden="true"></span> ${loadingText}`;
  } else {
    labelEl.innerHTML = idleText ?? button.dataset.prevHtml ?? labelEl.innerHTML;
  }
}