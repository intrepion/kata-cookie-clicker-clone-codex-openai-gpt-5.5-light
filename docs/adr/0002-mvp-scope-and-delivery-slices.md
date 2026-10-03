# MVP Scope and Delivery Slices

We will build the first playable Cookie Clicker clone as three verified slices: first the core clicking loop and save model, then the shop and upgrades, then achievements, offline progress, and polish. The MVP uses an eight-Building ladder of Cursor, Grandma, Oven, Farm, Factory, Bank, Temple, and Lab; upgrades use flavorful names with explicit mechanical text; achievements cover cookie totals, clicking milestones, Buildings owned, and Upgrades bought; offline progress is capped at 8 hours; and the writing uses a lightly absurd homage tone.

## Considered Options

- One complete MVP pass
- Three verified slices
- Smaller commit-per-microfeature slices

## Consequences

Each slice should be independently playable, verified through the real browser path, committed, and pushed before moving to the next slice. Later implementation should preserve readable mechanics even when the flavor text gets playful.
