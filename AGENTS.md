
## Cost rules for AI coding agents (owner instruction, Nov 2026)

- One focused task per session; ask before expanding scope.
- Run only the checks relevant to the files changed; no full builds, installs or test suites unless the task needs them.
- Reuse the documented setup/blueprint commands; do not install new tooling or dependencies unprompted.
- Skip browser and end-to-end testing unless the change is user-visible UI.
- Do not spawn child sessions or parallel agents unless explicitly asked.
- Keep diffs minimal: no refactors, coverage sweeps or style passes beyond the task.