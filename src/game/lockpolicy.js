// Pointer-lock policy (the owner's fifth mouse complaint, 2026-10-18: "Do not take control of my mouse"). The game asks the browser to lock the
// pointer every time a level starts or resumes.
// In a browser that a script is driving (puppeteer launches Chrome with --enable-automation, which sets navigator.webdriver) that request can be
// GRANTED (the driver's evaluate counts as a user gesture), and a granted lock
// hides and confines the real cursor on the desktop: the symptom the owner described, "the mouse stops reaching the whole screen". The test hook used
// to switch the lock off only AFTER the level had started,
// so every automated level start asked once. An automated browser now never asks; it takes the same "hold a button and drag" path the hook always
// chose. A person's browser has webdriver false: nothing changes for a player.
export const automated = (nav = globalThis.navigator) => !!nav?.webdriver;
/**
 * Ask for the lock. `raw`: no system mouse acceleration where the browser offers that (Chrome, Edge); a browser that refuses or ignores the option
 * gets the plain lock. A refusal for any other reason (a re-lock too soon after Esc) goes to `denied`.
 */
export function askLock(el, raw, denied) {
  const plain = () => {
    try {
      const q = el.requestPointerLock?.();
      q?.catch?.(denied);
    } catch {
      denied();
    }
  };
  if (!raw) {
    plain();
    return;
  }
  let p;
  try {
    p = el.requestPointerLock?.({ unadjustedMovement: true });
  } catch {
    plain();
    return;
  }
  p?.catch?.((e) => (e?.name === 'NotSupportedError' || e?.name === 'TypeError' ? plain() : denied(e)));
}
