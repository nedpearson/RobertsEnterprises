import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyPowerfulFormSitePreset,
  buildBridgeIdempotencyKey,
  buildNativePowerfulFormSubmissionId,
  isFormBridgeConfigured,
  normalizeFormBridgeSubmission,
  parseAppointmentRequestSlot,
  redactFormBridgePayload,
  verifyFormBridgeSecret,
  verifyFormBridgeSecrets,
} from '../formBridge';
import { chooseWebsiteSubmissionLocation } from '../publicIntake';

test('Powerful Form style field arrays normalize into one canonical appointment payload', () => {
  const normalized = normalizeFormBridgeSubmission({
    sourceProvider: 'powerful-form',
    submissionId: 'submission-123456',
    siteDomain: 'https://www.idobridalcouture.com/pages/request-an-appointment',
    fields: [
      { label: 'Bride Name', value: 'Jane Doe' },
      { label: 'Email Address', value: 'JANE@EXAMPLE.COM' },
      { label: 'Phone Number', value: '225-555-1212' },
      { label: 'Which Location', value: 'Covington' },
      { label: 'Preferred Date', value: '2026-09-18' },
      { label: 'Preferred Time', value: '2:00 PM' },
      { label: 'Wedding Date', value: '2027-03-10' },
      { label: 'Looking For', value: 'Wedding gown' },
      { label: 'Budget', value: '$3,500' },
      { label: 'Comments', value: 'First appointment.' },
    ],
  });

  assert.equal(normalized.provider, 'powerful-form');
  assert.equal(normalized.externalSubmissionId, 'submission-123456');
  assert.equal(normalized.siteDomain, 'idobridalcouture.com');
  assert.equal(normalized.locationHint, 'Covington');
  assert.equal(normalized.name, 'Jane Doe');
  assert.equal(normalized.email, 'jane@example.com');
  assert.equal(normalized.phone, '225-555-1212');
  assert.equal(normalized.appointmentDate, '2026-09-18');
  assert.equal(normalized.appointmentTime, '2:00 PM');
  assert.equal(normalized.weddingDate, '2027-03-10');
  assert.equal(normalized.lookingFor, 'Wedding gown');
  assert.equal(normalized.budgetLabel, '$3,500');
  assert.equal(normalized.budgetCents, 350000);
  assert.equal(normalized.notes, 'First appointment.');
  assert.match(normalized.idempotencyKey, /^powerful-form:submission-123456$/);
});

test('exact I Do Bridal live form labels map without changing the storefront form', () => {
  const normalized = normalizeFormBridgeSubmission({
    provider: 'powerful-form',
    submissionId: 'ido-live-123456',
    siteDomain: 'idobridalcouture.com',
    fields: [
      { label: 'First and Last Name', value: 'Jamie Bride' },
      { label: 'Contact Phone', value: '225-555-0100' },
      { label: 'Email', value: 'jamie@example.com' },
      { label: 'Store Location', value: 'Baton Rouge' },
      { label: 'First Appointment Request', value: '09/18/2026 2:00 PM' },
      { label: 'Second Appointment Request', value: 'September 19, 2026 at 10 AM' },
      { label: 'Wedding Date', value: '03/10/2027' },
      { label: 'Wedding Dress Budget', value: '$2,500 - $3,500' },
      { label: 'Number in Party (include bride)', value: '4' },
      { label: 'First time trying on a wedding dress', value: 'Yes' },
      { label: 'Beverage Selection', value: 'Champagne' },
      { label: 'Additional Information', value: 'Bringing mom and sister.' },
    ],
  });

  assert.equal(normalized.name, 'Jamie Bride');
  assert.equal(normalized.phone, '225-555-0100');
  assert.equal(normalized.locationHint, 'Baton Rouge');
  assert.equal(normalized.appointmentRequest1, '09/18/2026 2:00 PM');
  assert.equal(normalized.appointmentDate, '2026-09-18');
  assert.equal(normalized.appointmentTime, '2:00 PM');
  assert.equal(normalized.appointmentRequest2, 'September 19, 2026 at 10 AM');
  assert.equal(normalized.secondAppointmentDate, '2026-09-19');
  assert.equal(normalized.secondAppointmentTime, '10 AM');
  assert.equal(normalized.weddingDate, '2027-03-10');
  assert.equal(normalized.budgetLabel, '$2,500 - $3,500');
  assert.equal(normalized.budgetCents, undefined, 'a range is descriptive, not an exact dollar value');
  assert.equal(normalized.partySize, '4');
  assert.equal(normalized.firstTimeTryingOn, 'Yes');
  assert.equal(normalized.beverageSelection, 'Champagne');
  assert.equal(normalized.notes, 'Bringing mom and sister.');
});

test('exact Proper & Company live form labels map without changing the storefront form', () => {
  const normalized = normalizeFormBridgeSubmission({
    provider: 'powerful-form',
    externalSubmissionId: 'proper-live-123456',
    domain: 'properandcompany.com',
    fields: [
      { label: 'First + Last Name', value: 'Taylor Guest' },
      { label: 'Contact Phone', value: '985-555-0100' },
      { label: 'Email', value: 'taylor@example.com' },
      { label: 'Store Location', value: 'Covington' },
      { label: 'Occasion Type', value: 'Mother of the Bride' },
      { label: 'Occasion Date', value: '11/08/2026' },
      { label: 'First Appointment Request', value: '10/02/2026 - Morning' },
      { label: 'Second Appointment Request', value: '10/03/2026 - Afternoon' },
      { label: 'Number In Party', value: '3' },
      { label: 'Price Point', value: '$1,500 - $2,500' },
      { label: 'Extra Notes', value: 'Needs petite options.' },
    ],
  });

  assert.equal(normalized.name, 'Taylor Guest');
  assert.equal(normalized.locationHint, 'Covington');
  assert.equal(normalized.type, 'Mother of the Bride');
  assert.equal(normalized.occasionDate, '2026-11-08');
  assert.equal(normalized.appointmentDate, '2026-10-02');
  assert.equal(normalized.appointmentTime, 'Morning');
  assert.equal(normalized.secondAppointmentDate, '2026-10-03');
  assert.equal(normalized.secondAppointmentTime, 'Afternoon');
  assert.equal(normalized.partySize, '3');
  assert.equal(normalized.budgetLabel, '$1,500 - $2,500');
  assert.equal(normalized.budgetCents, undefined);
  assert.equal(normalized.notes, 'Needs petite options.');
  assert.equal(normalized.weddingDate, undefined, 'Proper occasion dates must not be mislabeled as wedding dates');
});

test('appointment request parser writes only validated dates and usable windows', () => {
  assert.deepEqual(parseAppointmentRequestSlot('2026-09-18T14:30'), { date: '2026-09-18', window: '14:30' });
  assert.deepEqual(parseAppointmentRequestSlot('09/18/26 2:15 PM'), { date: '2026-09-18', window: '2:15 PM' });
  assert.deepEqual(parseAppointmentRequestSlot('September 18, 2026 at 10 AM'), { date: '2026-09-18', window: '10 AM' });
  assert.deepEqual(parseAppointmentRequestSlot('09/31/2026 Morning'), { date: undefined, window: 'Morning' });
  assert.deepEqual(parseAppointmentRequestSlot('Call to arrange'), { date: undefined, window: undefined });
});

test('bridge accepts nested Make/Zapier data and composes first plus last name', () => {
  const normalized = normalizeFormBridgeSubmission({
    data: {
      provider: 'make',
      externalSubmissionId: 'entry_987654321',
      domain: 'properandcompany.com',
      appointmentLocation: 'Proper & Company - Baton Rouge',
      firstName: 'Alex',
      lastName: 'Smith',
      customerEmail: 'alex@example.com',
      preferredDate1: '2026-10-02',
      preferredWindow: 'Morning',
    },
  });
  assert.equal(normalized.provider, 'make');
  assert.equal(normalized.name, 'Alex Smith');
  assert.equal(normalized.locationHint, 'Proper & Company - Baton Rouge');
  assert.equal(normalized.appointmentTime, 'Morning');
});

test('native Powerful Form n8n payload receives trusted store routing and accepts provider ID', () => {
  const normalized = normalizeFormBridgeSubmission(applyPowerfulFormSitePreset({
    ID: '22349704',
    'First + Last Name': 'Lisa Pradillo',
    Email: 'lisa@example.com',
    'Contact Phone': '9853206482',
    'Store Location': 'Covington',
    'First Appointment Request': '09/08/2026 2:00 PM',
  }, 'proper-and-co'));

  assert.equal(normalized.provider, 'powerful-form');
  assert.equal(normalized.externalSubmissionId, '22349704');
  assert.equal(normalized.siteDomain, 'properandcompany.com');
  assert.equal(normalized.locationHint, 'Covington');
  assert.equal(normalized.name, 'Lisa Pradillo');
  assert.equal(normalized.appointmentDate, '2026-09-08');
});

test('Powerful Form Shopify Flow JSON strings are flattened', () => {
  const normalized = normalizeFormBridgeSubmission(applyPowerfulFormSitePreset({
    submissionId: '22339666',
    submissionData: JSON.stringify({
      'First + Last Name': 'Candy Modeen',
      Email: 'candy@example.com',
      'Store Location': 'Baton Rouge',
    }),
  }, 'proper-and-co'));

  assert.equal(normalized.externalSubmissionId, '22339666');
  assert.equal(normalized.name, 'Candy Modeen');
  assert.equal(normalized.locationHint, 'Baton Rouge');
});

test('native Proper n8n field handles normalize without a provider submission ID', () => {
  const receivedAt = new Date('2026-09-03T22:59:00.000Z');
  const payload = {
    'shop.domain': 'properandcompany.com',
    'form.name': 'FIX Form',
    'text-1': 'Integration Test Proper',
    text: '202-555-0147',
    'email-2': 'proper-test@example.com',
    'select-1': 'Baton Rouge, La.',
    'text-3': 'Homecoming',
    'datetime-2': '2026-10-17',
    'datetime-3': '2026-09-10',
    'datetime-1': '2026-09-11',
    'select-3': '1 Guest',
    'select-2': '$1000 - $2,000',
    textarea: 'Safe synthetic test.',
  };
  const normalized = normalizeFormBridgeSubmission(applyPowerfulFormSitePreset(payload, 'proper-and-co', receivedAt));

  assert.match(normalized.externalSubmissionId, /^native-20260903-[a-f0-9]{64}$/);
  assert.equal(normalized.siteDomain, 'properandcompany.com');
  assert.equal(normalized.name, 'Integration Test Proper');
  assert.equal(normalized.email, 'proper-test@example.com');
  assert.equal(normalized.locationHint, 'Baton Rouge, La.');
  assert.equal(normalized.type, 'Homecoming');
  assert.equal(normalized.appointmentDate, '2026-09-10');
  assert.equal(normalized.secondAppointmentDate, '2026-09-11');
  assert.equal(normalized.partySize, '1 Guest');
  assert.equal(normalized.budgetLabel, '$1000 - $2,000');
  assert.equal(normalized.notes, 'Safe synthetic test.');
});

test('native I Do n8n field handles normalize without changing the storefront form', () => {
  const normalized = normalizeFormBridgeSubmission(applyPowerfulFormSitePreset({
    text: 'Integration Test I Do',
    phone: '202-555-0147',
    email: 'ido-test@example.com',
    'checkbox[]': ['Covington'],
    datetime: '2026-09-10 2:00 PM',
    'datetime-2': '2026-09-11 10:00 AM',
    'datetime-3': '2027-04-18',
    select: '$2,500 - $3,500',
    'select-2': '3',
    'checkbox-2[]': ['Yes'],
    'select-3': 'Champagne',
    textarea: 'Safe synthetic test.',
  }, 'i-do-bridal', new Date('2026-09-03T22:59:00.000Z')));

  assert.equal(normalized.siteDomain, 'idobridalcouture.com');
  assert.equal(normalized.name, 'Integration Test I Do');
  assert.equal(normalized.locationHint, 'Covington');
  assert.equal(normalized.appointmentDate, '2026-09-10');
  assert.equal(normalized.appointmentTime, '2:00 PM');
  assert.equal(normalized.secondAppointmentDate, '2026-09-11');
  assert.equal(normalized.weddingDate, '2027-04-18');
  assert.equal(normalized.partySize, '3');
  assert.equal(normalized.firstTimeTryingOn, 'Yes');
  assert.equal(normalized.beverageSelection, 'Champagne');
});

test('native Powerful Form fallback IDs dedupe same-day retries and separate later submissions', () => {
  const body = { text: 'Same answers', email: 'same@example.com' };
  const first = buildNativePowerfulFormSubmissionId(body, 'i-do-bridal', new Date('2026-09-03T10:00:00Z'));
  const retry = buildNativePowerfulFormSubmissionId(body, 'i-do-bridal', new Date('2026-09-03T23:59:00Z'));
  const later = buildNativePowerfulFormSubmissionId(body, 'i-do-bridal', new Date('2026-09-04T10:00:00Z'));
  assert.equal(first, retry);
  assert.notEqual(first, later);
});

test('Powerful Form site presets fail closed for unknown stores', () => {
  assert.throws(
    () => applyPowerfulFormSitePreset({}, 'another-store'),
    /unknown Powerful Form site integration/i,
  );
});

test('bridge refuses unsafe submissions rather than guessing a boutique', () => {
  assert.throws(
    () => normalizeFormBridgeSubmission({
      submissionId: 'submission-123456',
      siteDomain: 'idobridalcouture.com',
      name: 'Jane Doe',
      email: 'jane@example.com',
    }),
    /location is required/i,
  );
  assert.throws(
    () => normalizeFormBridgeSubmission({
      siteDomain: 'idobridalcouture.com', location: 'Baton Rouge', name: 'Jane Doe', email: 'jane@example.com',
    }),
    /externalSubmissionId is required/i,
  );
});

test('location chooser maps Baton Rouge and Covington independent of row order', () => {
  const rows = [
    { id: 'cov', name: 'I Do Bridal Couture - Covington' },
    { id: 'br', name: 'I Do Bridal Couture - Baton Rouge' },
  ];
  assert.equal(chooseWebsiteSubmissionLocation(rows, 'Baton Rouge').id, 'br');
  assert.equal(chooseWebsiteSubmissionLocation(rows, 'Covington').id, 'cov');
  assert.equal(chooseWebsiteSubmissionLocation(rows, 'I Do Bridal Couture - Covington').id, 'cov');
});

test('location chooser fails closed on unknown multi-location labels', () => {
  assert.throws(
    () => chooseWebsiteSubmissionLocation([
      { id: 'br', name: 'Baton Rouge' },
      { id: 'cov', name: 'Covington' },
    ], 'Northshore/Capital undecided'),
    /could not map/i,
  );
});

test('bridge credentials require a strong configured secret and compare safely', () => {
  const secret = 'a'.repeat(64);
  assert.equal(isFormBridgeConfigured('short'), false);
  assert.equal(isFormBridgeConfigured(secret), true);
  assert.equal(verifyFormBridgeSecret(secret, `Bearer ${secret}`, undefined), true);
  assert.equal(verifyFormBridgeSecret(secret, `Basic ${Buffer.from(`vowos:${secret}`).toString('base64')}`, undefined), true);
  assert.equal(verifyFormBridgeSecret(secret, `Basic ${Buffer.from(`wrong-user:${secret}`).toString('base64')}`, undefined), false);
  assert.equal(verifyFormBridgeSecret(secret, undefined, secret), true);
  assert.equal(verifyFormBridgeSecret(secret, 'Bearer wrong', undefined), false);
  assert.equal(verifyFormBridgeSecret(undefined, `Bearer ${secret}`, undefined), false);
  assert.equal(verifyFormBridgeSecrets(['short', secret], `Bearer ${secret}`, undefined), true);
  assert.equal(verifyFormBridgeSecrets(['short', undefined], `Bearer ${secret}`, undefined), false);
});

test('idempotency keys stay stable and bounded for long provider ids', () => {
  const first = buildBridgeIdempotencyKey('powerful-form', 'x'.repeat(500));
  const second = buildBridgeIdempotencyKey('powerful-form', 'x'.repeat(500));
  assert.equal(first, second);
  assert.ok(first.length <= 128);
  assert.match(first, /^bridge:[a-f0-9]{64}$/);
});

test('raw audit payload redacts secrets but retains ordinary appointment fields', () => {
  const redacted = redactFormBridgePayload({
    name: 'Jane Doe',
    email: 'jane@example.com',
    apiToken: 'do-not-store',
    nested: { cardNumber: '4111111111111111', notes: 'Bring mom' },
  }) as Record<string, any>;
  assert.equal(redacted.name, 'Jane Doe');
  assert.equal(redacted.apiToken, '[redacted]');
  assert.equal(redacted.nested.cardNumber, '[redacted]');
  assert.equal(redacted.nested.notes, 'Bring mom');
});
