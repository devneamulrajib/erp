// client/src/utils/lazyPage.js
// React.lazy wrapper for route pages. If an old chunk is gone after a new build
// was uploaded, reload the page once to pick up the new index.html.
import { lazy } from 'react';

const RELOAD_KEY = 'chunk-reload-at';

export function lazyPage(loader) {
  return lazy(() =>
    loader().catch((err) => {
      // Guarded so a real network error can't cause a reload loop.
      const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
      if (Date.now() - last > 10000) {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
        window.location.reload();
        return new Promise(() => {});
      }
      throw err;
    })
  );
}