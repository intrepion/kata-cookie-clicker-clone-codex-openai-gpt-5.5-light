# Static Browser Game With Direct File Launch

We will build the Cookie Clicker clone as a dependency-free static browser game using `index.html`, `style.css`, and `game.js`, with the real play path verified through direct `file://` launch. This keeps the first playable version easy to open, share, and test while still supporting the agreed Cookie Clicker loop: a faithful central cookie, persistent Bakery state, offline progress, upgrades, achievements, and polished click feedback.

## Considered Options

- Dependency-free static files
- Vite and TypeScript app
- Canvas-heavy game shell

## Consequences

The implementation should avoid assumptions that only work behind a dev server. Browser verification must include the direct-file path, a console-clean smoke test, clicking the cookie, buying at least one Building, and reloading to confirm persistence.
