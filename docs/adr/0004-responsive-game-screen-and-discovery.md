# Responsive Game Screen and Discovery

The main game screen will use a classic Cookie Clicker layout: the big Cookie, Cookie total, Click Power, and Cookie Production stay in the primary left or center region, while Buildings and Upgrades live in a right sidebar on desktop and a collapsible bottom sheet on mobile. Achievements and medium-depth stats remain accessible from the first viewport, return and reward messages use lightweight toasts, Achievement unlocks use both a toast and badge pulse, and Upgrades unlock when relevant before remaining visible-but-disabled until affordable.

## Considered Options

- Desktop-only right sidebar
- Mobile-first bottom drawer
- Responsive desktop sidebar with mobile bottom sheet

## Consequences

The implementation must preserve the immediate action-and-temptation loop across desktop and mobile. Slice 1 can begin after this decision: remaining tuning questions should be answered by playing the spine rather than by extending the planning phase.
