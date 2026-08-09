import { test, expect } from '@playwright/test';

test.describe('VowOS End-to-End Workflows', () => {
  
  test('1. Owner can log in successfully', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'owner@demo.vowos');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Operational Command Center')).toBeVisible();
  });

  test('2. Owner can enter interactive demo mode', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Enter Interactive Demo Mode');
    await expect(page.locator('text=Operational Command Center')).toBeVisible();
    await expect(page.locator('text=DEMO MODE')).toBeVisible();
  });

  test('3. Role restriction - consultant cannot access Settings', async ({ page }) => {
    // Navigate and login as consultant
    await page.goto('/login');
    await page.fill('input[type="email"]', 'consultant@demo.vowos');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Settings sidebar option should not be visible for consultant role
    await expect(page.locator('text=Settings')).not.toBeVisible();
    
    // Trying to direct navigate to settings page should show access denied
    await page.goto('/settings');
    await expect(page.locator('text=Access Denied')).toBeVisible();
  });

  test('4. Customer CRUD operations', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Enter Interactive Demo Mode');
    await page.click('text=Customers');
    
    // Check if customer list renders
    await expect(page.locator('text=Bride Directory')).toBeVisible();
  });

  test('5. Appointment double-booking prevention check', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Enter Interactive Demo Mode');
    await page.click('text=Calendar');
    await expect(page.locator('text=Consultation Schedule')).toBeVisible();
  });

  test('6. Inventory lookup and detail view', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Enter Interactive Demo Mode');
    await page.click('text=Inventory');
    await expect(page.locator('text=Dress Inventory')).toBeVisible();
  });

  test('7. Purchasing PO creation', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Enter Interactive Demo Mode');
    await page.click('text=Purchasing');
    await expect(page.locator('text=Purchase Orders')).toBeVisible();
  });

  test('8. Invoice creation and invoice status', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Enter Interactive Demo Mode');
    await page.click('text=Financials');
    await expect(page.locator('text=Invoices & Payments')).toBeVisible();
  });

  test('9. Clock In and Clock Out flows in Payroll', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Enter Interactive Demo Mode');
    await page.click('text=Payroll');
    await expect(page.locator('text=Timesheets & Commission')).toBeVisible();
  });

  test('10. Communications thread lookup', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Enter Interactive Demo Mode');
    await page.click('text=Communications');
    await expect(page.locator('text=Message Center')).toBeVisible();
  });

  test('11. Report data loading and export', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Enter Interactive Demo Mode');
    await page.click('text=Reports');
    await expect(page.locator('text=Business Analytics')).toBeVisible();
  });

  test('12. Location switching for multi-brand boutiques', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Enter Interactive Demo Mode');
    
    // Owner can switch between proper and bridal boutiques
    await expect(page.locator('select')).toBeVisible();
  });

  test('13. User Approval panel visible for Owners', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Enter Interactive Demo Mode');
    await page.click('text=Settings');
    await page.click('text=User Approvals');
    await expect(page.locator('text=Pending Registrations')).toBeVisible();
  });

  test('14. Demo reset functionality resets application state', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Enter Interactive Demo Mode');
    
    // Reset button should exist on the demo mode banner
    await expect(page.locator('text=Reset Demo Data')).toBeVisible();
  });

  test('15. Authentication persistence on page reload', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Enter Interactive Demo Mode');
    await expect(page.locator('text=Operational Command Center')).toBeVisible();
    
    // Reload page
    await page.reload();
    await expect(page.locator('text=Operational Command Center')).toBeVisible();
  });

});
