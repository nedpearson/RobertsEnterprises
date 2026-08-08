# Mobile & Tablet Responsive Audit
**Project**: Roberts Enterprises / VowOS — FamousAI Version  
**Target Viewports**: 320px – 1920px (Phones, iPhones with Safe Insets, iPads, Surface Tablets, Desktop)  

---

## 1. Responsive Viewport Test Matrix

| Device Target | Viewport Size (px) | Orientation | Layout Target |
| :--- | :--- | :--- | :--- |
| **iPhone SE / Small Phone** | 320 × 568 / 375 × 667 | Portrait | Single column, mobile top bar, bottom action padding. |
| **iPhone 14 / 15 / Pro Max** | 390 × 844 / 430 × 932 | Portrait | Safe area top/bottom insets (`dvh`), touch target 44px+. |
| **Android Standard** | 360 × 640 / 414 × 896 | Portrait | Single column, responsive form grids. |
| **iPad Mini / Air / Pro** | 744 × 1133 / 820 × 1180 | Portrait & Landscape | Collapsible sidebar, 2-column card grids. |
| **Surface & Tablets** | 810 × 1080 / 1024 × 768 | Landscape | Split view, 2-to-3 column grids. |
| **Desktop / Monitor** | 1280 × 800 / 1920 × 1080 | Landscape | Full sidebar, multi-column analytics, 4-tier drill-down ledgers. |

---

## 2. Identified Mobile Constraints & Fixes

1. **Safe-Area Insets**:
   - iPhone bottom home indicator requires `padding-bottom: env(safe-area-inset-bottom, 16px)` on fixed bottom bars and footers.
   - iPhone notch/Dynamic Island requires `padding-top: env(safe-area-inset-top, 0px)`.

2. **Table Transformation to Mobile Cards**:
   - On screens < 640px, tables in `CustomersView`, `InvoicesView`, `PurchasesView`, and `TransfersView` adapt into clear, card-based record items to prevent page horizontal scrolling.

3. **Modals & Drawers Sizing**:
   - Modals utilize `max-h-[90dvh]` with `overflow-y-auto` to prevent trapping form controls beneath mobile soft keyboards.

4. **Touch Target Enforcement**:
   - All clickable icon buttons, status selectors, and navigation items enforce `min-h-[44px]` and `min-w-[44px]`.
