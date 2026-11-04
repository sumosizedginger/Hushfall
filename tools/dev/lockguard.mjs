// A Chrome job never takes the owner's mouse: the pointer lock is refused before any page script runs, and the asks are counted (the count must be 0; the game's own guard is src/game/lockpolicy.js).
export async function refuseLock(page) {
  await page.evaluateOnNewDocument(() => {
    window.__lockAsks = 0;
    Element.prototype.requestPointerLock = function () {
      window.__lockAsks++;
      return Promise.reject(new DOMException('refused by the tool', 'NotAllowedError'));
    };
  });
}

/** prints the count; a page that has gone reports nothing rather than breaking the job's ending */
export async function reportLock(page) {
  try {
    console.log('pointer-lock requests:', await page.evaluate('window.__lockAsks'));
  } catch {
    console.log('pointer-lock requests: page gone');
  }
}
