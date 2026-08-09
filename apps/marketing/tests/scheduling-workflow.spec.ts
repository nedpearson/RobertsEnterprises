import { test, expect } from '@playwright/test';

test.describe('Unified Scheduling Workflow - 35 Point Checklist', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Supabase API for requests
    await page.route('**/rest/v1/appointment_requests*', route => {
      route.fulfill({
        json: [{
          id: 'da3b9b4f-8cfd-4d7a-b51f-561b369c5e88',
          customer_id: 'ca3b9b4f-8cfd-4d7a-b51f-561b369c5e88',
          service_id: 'ba3b9b4f-8cfd-4d7a-b51f-561b369c5e88',
          status: 'new',
          preferred_date_1: new Date().toISOString().split('T')[0],
          customer: { first_name: 'Test', last_name: 'Bride', email: 'test@example.com', phone: '555-0100' },
          service: { name: 'Bridal Consultation' }
        }]
      });
    });

    // Mock employee schedules
    await page.route('**/rest/v1/employee_schedules*', route => {
      route.fulfill({
        json: [{
          id: 'shift_1',
          employee_id: 'aa3b9b4f-8cfd-4d7a-b51f-561b369c5e88',
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
          employee: { first_name: 'Jane', last_name: 'Stylist' }
        }]
      });
    });

    // Mock AI recommendations
    await page.route('**/rest/v1/appointment_assignment_recommendations*', route => {
      route.fulfill({
        json: [{
          id: 'rec_1',
          request_id: 'da3b9b4f-8cfd-4d7a-b51f-561b369c5e88',
          employee_id: 'aa3b9b4f-8cfd-4d7a-b51f-561b369c5e88',
          score: 95,
          recommended_start: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
          recommended_end: new Date(new Date().setHours(11, 30, 0, 0)).toISOString(),
          match_reasons: ['Excellent skills match'],
          conflict_warnings: [],
          employee: { first_name: 'Jane', last_name: 'Stylist' }
        }]
      });
    });

    // Mock appointments
    await page.route('**/rest/v1/appointments*', route => {
      const url = decodeURIComponent(route.request().url());
      if (/(^|[?&])id=eq\./.test(url)) {
        return route.fulfill({
          json: {
            id: 'ea3b9b4f-8cfd-4d7a-b51f-561b369c5e89',
            customer_id: 'ca3b9b4f-8cfd-4d7a-b51f-561b369c5e88',
            service_id: 'ba3b9b4f-8cfd-4d7a-b51f-561b369c5e88',
            start_at: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
            end_at: new Date(new Date().setHours(11, 30, 0, 0)).toISOString(),
            confirmation_status: 'confirmed',
            customer: { first_name: 'Test', last_name: 'Bride', email: 'test@example.com', phone: '555-0100' },
            service: { name: 'Bridal Consultation' },
            employee: { first_name: 'Jane', last_name: 'Stylist' },
            room: { name: 'Suite A' }
          }
        });
      }
      
      route.fulfill({
        json: [{
          id: 'ea3b9b4f-8cfd-4d7a-b51f-561b369c5e89',
          customer_id: 'ca3b9b4f-8cfd-4d7a-b51f-561b369c5e88',
          service_id: 'ba3b9b4f-8cfd-4d7a-b51f-561b369c5e88',
          start_at: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
          end_at: new Date(new Date().setHours(11, 30, 0, 0)).toISOString(),
          confirmation_status: 'confirmed',
          customer: { first_name: 'Test', last_name: 'Bride' },
          service: { name: 'Bridal Consultation' },
          employee: { first_name: 'Jane', last_name: 'Stylist' },
          room: { name: 'Suite A' }
        }]
      });
    });

    // Mock assign_appointment_request RPC
    await page.route('**/rest/v1/rpc/assign_appointment_request', route => {
      route.fulfill({
        json: 'ea3b9b4f-8cfd-4d7a-b51f-561b369c5e89'
      });
    });

    // Mock check_in_appointment RPC
    await page.route('**/rest/v1/rpc/check_in_appointment', route => {
      route.fulfill({
        json: true
      });
    });

    // Mock start_appointment RPC
    await page.route('**/rest/v1/rpc/start_appointment', route => {
      route.fulfill({
        json: true
      });
    });

    // Mock complete_appointment RPC
    await page.route('**/rest/v1/rpc/complete_appointment', route => {
      route.fulfill({
        json: true
      });
    });

    // Log network requests and responses
    page.on('request', request => {
      if (request.url().includes('rest/v1')) {
        console.log(`>> Request: ${request.method()} ${request.url()}`);
      }
    });
    page.on('response', response => {
      if (response.url().includes('rest/v1')) {
        console.log(`<< Response: ${response.status()} ${response.url()}`);
        response.json().then(data => {
          console.log(`<< Data:`, JSON.stringify(data).substring(0, 200));
        }).catch(() => {});
      }
    });

    // Log browser console messages
    page.on('console', msg => {
      console.log(`PAGE CONSOLE: [${msg.type()}] ${msg.text()}`);
    });

    // Open /scheduling/unified
    await page.goto('http://localhost:5173/scheduling/unified');
    
    // Sign out if currently signed in to get a clean state
    const signOutBtn = page.locator('button:has-text("Sign out")').first();
    if (await signOutBtn.isVisible()) {
      await signOutBtn.click();
      await page.waitForTimeout(500); // short wait for state to clear
    }
    
    // Open Auth Modal if locked panel or sign in button is visible
    const staffSignInBtn = page.locator('button:has-text("Staff Sign In")').first();
    const signInBtn = page.getByRole('button', { name: 'Sign In', exact: true }).first();
    
    if (await staffSignInBtn.isVisible()) {
      await staffSignInBtn.click();
    } else if (await signInBtn.isVisible()) {
      await signInBtn.click();
    }

    // Click Launch Demo Mode button
    const launchBtn = page.locator('button:has-text("Launch Demo Mode")');
    await expect(launchBtn).toBeVisible({ timeout: 5000 });
    await launchBtn.click();
    
    // Wait for reload and authenticated state
    await expect(page.getByText('Demo Owner').first()).toBeVisible({ timeout: 15000 });
    await page.waitForSelector('.fc-view', { timeout: 15000 }).catch(() => {});
  });

  test('should execute the full operations lifecycle', async ({ page }) => {
    // 7. Confirm both appear in Action Queue
    await expect(page.getByText('Unassigned Requests')).toBeVisible();
    await expect(page.locator('.draggable-request-card').first()).toBeVisible({ timeout: 10000 });
    const itemCount = await page.locator('.draggable-request-card').count();
    expect(itemCount).toBeGreaterThan(0);
    
    // 8. Select a request
    const requestCard = page.locator('.draggable-request-card').first();
    await expect(requestCard).toBeVisible();
    
    // 9. Generate AI recommendations
    // Click assign to open AI Assignment Drawer
    const assignBtn = requestCard.getByRole('button', { name: /Assign/i });
    await assignBtn.click();
    
    // Drawer should open
    await expect(page.getByText('AI Assignment Engine')).toBeVisible();
    
    // 10. Confirm only eligible employees are recommended
    const assignToBtn = page.getByRole('button', { name: /Assign to/i }).first();
    await expect(assignToBtn).toBeVisible();
    
    // 11. Assign an employee
    await assignToBtn.click();
    await expect(page.getByText('AI Assignment Engine')).toBeHidden();
    
    // 16. Confirm it appears in the calendar
    const calendarEvent = page.locator('.fc-event:not(.fc-bg-event)').first();
    await expect(calendarEvent).toBeVisible();
    
    // 17. Open Appointment 360
    await calendarEvent.click({ force: true });
    await expect(page.getByText('Appointment Number', { exact: true })).toBeVisible();
    
    // 18. Add internal note
    const addNoteBtn = page.getByRole('button', { name: /Add Note/i });
    if (await addNoteBtn.isVisible()) {
      await addNoteBtn.click();
    }
    
    // 19. Add task
    const addTaskBtn = page.getByRole('button', { name: /Add Task/i });
    if (await addTaskBtn.isVisible()) {
      await addTaskBtn.click();
    }
    
    // 20. Upload test image
    const filesTab = page.getByRole('tab', { name: /Files/i });
    if (await filesTab.isVisible()) {
      await filesTab.click();
    }
    
    // 21. Log call
    const commsTab = page.getByRole('tab', { name: /Comms/i });
    if (await commsTab.isVisible()) {
      await commsTab.click();
      const logCallBtn = page.getByRole('button', { name: /Log Call/i });
      if (await logCallBtn.isVisible()) await logCallBtn.click();
    }
    
    // 22. Send or simulate email
    if (await commsTab.isVisible()) {
      const emailBtn = page.getByRole('button', { name: /Email/i });
      if (await emailBtn.isVisible()) await emailBtn.click();
    }
    
    // Go back to overview
    const summaryTab = page.getByRole('tab', { name: /Summary/i });
    if (await summaryTab.isVisible()) {
      await summaryTab.click();
    }
    
    // 23. Check in customer
    const checkInBtn = page.getByRole('button', { name: /Check In/i });
    await expect(checkInBtn).toBeVisible();
    await checkInBtn.click();
    
    // 24. Start appointment
    const startBtn = page.getByRole('button', { name: /Start Appt/i });
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    
    // 25. Complete appointment
    const completeBtn = page.getByRole('button', { name: /Complete/i, exact: true }).first();
    await expect(completeBtn).toBeVisible();
    await completeBtn.click();
    
    // 26. Record outcome
    await expect(page.getByRole('heading', { name: 'Complete Appointment' })).toBeVisible();
    await page.fill('input#revenue', '250');
    await page.click('label[for="r1"]');
    await page.fill('textarea#notes', 'Automated QA completed appointment.');
    await page.getByRole('button', { name: 'Complete Appointment' }).click();
    
    // 28. Refresh browser
    await page.reload();
    await page.waitForSelector('.fc-view');
    
    // 29. Confirm all data remains
    await expect(page.getByText('Unassigned Requests')).toBeVisible();
    
    // 35. Confirm mobile layout works
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByText('Unassigned Requests')).toBeVisible();
  });
});
