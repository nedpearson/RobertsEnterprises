# Demo System Audit & Baseline Specification
**Project**: Roberts Enterprises / VowOS — FamousAI Version  
**Date**: 2026-07-20  

---

## 1. System Overview
The VowOS Interactive Demo & Training System is designed to provide an isolated, interactive, and voice-guided sandbox for onboarding new employees, training store staff, and conducting sales demonstrations without affecting live production data.

## 2. Target Users & Audit Safeguards
- **Production Users Audit**:
  - `ramseysims@gmail.com`: Production Owner account.
  - `nedpearson@gmail.com`: Production Owner account.
  - **Isolation Policy**: Under no circumstances will these accounts be flagged with `is_demo` or assigned demo roles. They access Demo Mode via session-isolated temporary contexts (`demo_session_id`).

## 3. Key Components
1. **Isolated Demo Environment Context**: Session-scoped temporary tenant state.
2. **Synthetic Data Generator**: 3 store locations, 10 personas, 40 business scenarios.
3. **ElevenLabs TTS Voice Engine**: High-fidelity narration (`FFIa0EpESD5acerigJF7`) synchronized with screen state and cursor animation.
4. **Declarative Tour Engine**: Synchronized state machine managing DOM targeting, scrolling, action validation, and error recovery.
5. **Provider Simulators**: Sandbox adapters for Stripe Payments, Twilio SMS, SendGrid Email, and Payroll Direct Deposit.
