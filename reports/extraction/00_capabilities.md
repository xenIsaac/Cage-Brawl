# Baseline Capabilities & Environment Check (Phase 0)

Date: 2026-11-08  
Host: Linux localhost 4.19.0-gvisor #1 SMP Sun Jan 10 15:06:54 PST 2016 x86_64 GNU/Linux  
Node.js: v22.23.2  
npm: 10.9.8  

---

## Capabilities Checklist

| Operation | Status | Details / Exact Output |
| :--- | :--- | :--- |
| **`npm install`** | **Ran successfully** | `npm install --dry-run` exited with code 0 (`up to date in 792ms`). `npm i --package-lock-only` generated root `package-lock.json` successfully (audited 225 packages). |
| **`tsc --noEmit`** | **Ran successfully** | `npx tsc --noEmit` executed cleanly with exit code 0 and 0 compiler errors across the entire codebase. |
| **`vite build`** | **Ran successfully** | `npx vite build` completed in 8.72s with exit code 0 (`dist/index.html` 0.97 kB, `dist/assets/index-*.js` 2,624.45 kB). |
| **tests** | **Failed** | Failed with exact error: `npm error Missing script: "test"`. No test runner (e.g. Vitest) or test scripts currently exist in `package.json` baseline. Scheduled to be added in Phase 0.75. |
| **the replay script** | **Not possible yet** | `scripts/replay.mjs` and `replays/*.json` directories do not exist in the current baseline. Scheduled to be authored and recorded in Phase 0.9. |
| **shell scripts & Node scripts** | **Ran successfully** | Bash shell execution and Node.js v22 command execution run synchronously and asynchronously without issue. |

---

## Baseline Summary (`Arena.tsx`)

- **Total Lines**: 8,657
- **`updatePhysics` Function**: Lines 3,580 to 7,631 (4,052 lines)
- **`useState` Hooks**: 120
- **`useRef` Hooks**: 61
- **`useEffect` Hooks**: 15
- **`as any` Casts**: 67
- **`@ts-ignore` Annotations**: 0
- **Total Functions in `Arena.tsx`**: 66 (mapped in `00_baseline.json`)
- **Total Files in `src/` + `server.ts`**: 180 files, 75,634 total lines
