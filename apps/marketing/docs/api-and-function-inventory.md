# API and Function Inventory
**Project**: Roberts Enterprises / VowOS — FamousAI Version  

---

## 1. Context Hooks & Data Services Registry

| Service Module | Function / API | Purpose | Scope / Authorization |
| :--- | :--- | :--- | :--- |
| `AuthContext.tsx` | `signUp`, `signIn`, `signOut` | Identity authentication & session resolution | Public / Server session |
| `VowosDataContext.tsx` | `addBride`, `updateBride` | Customer CRM mutations | Store & Role scoped |
| `VowosDataContext.tsx` | `addPurchaseOrder`, `updatePurchaseOrder` | Designer purchasing & customer re-assignment | Cross-location / Role scoped |
| `workforceStore.ts` | `approveStaffUser`, `rejectStaffUser` | Staff activation & approval queue | Owner & Manager (restricted) |
| `vendorPortalStore.ts` | `getVendorPortals`, `saveVendorPortal` | Designer login credentials vault | Manager / Owner |
| `fitProfile.ts` | `getFitProfile`, `saveFitProfile` | Bride measurements & gown try-on notes | Staff / Stylist |
