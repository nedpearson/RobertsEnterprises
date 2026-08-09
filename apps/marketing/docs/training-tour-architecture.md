# Training & Guided Tour Architecture
**Project**: Roberts Enterprises / VowOS — FamousAI Version  

---

## 1. Core Architecture
- **Declarative Tour Engine**: Manages step-by-step navigation, DOM target resolution via `data-tour-id`, scrolling, animated cursor positioning, and action assertions.
- **Three Training Modes**:
  1. **Mode A (Watch Demo)**: Automated presentation mode. The cursor automatically moves, clicks controls, and advances screens while ElevenLabs narration plays.
  2. **Mode B (Guide Me)**: Interactive guided mode. Highlights target controls and validates user clicks/entries.
  3. **Mode C (Practice Alone)**: Hands-on mode. Validates business task completion against expected state outcomes.

## 2. Targeting Registry
Target elements in the application shell and views are instrumented with stable `data-tour-id` attributes (e.g. `data-tour-id="nav-appointments"`, `data-tour-id="btn-create-appointment"`).
