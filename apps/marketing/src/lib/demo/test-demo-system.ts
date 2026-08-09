import { DEMO_PERSONAS, DEMO_STORES } from './demoData';
import { DEMO_SCENARIOS } from './scenariosLibrary';
import { tourEngine } from './tourEngine';
import { demoSimulators } from './providerSimulators';

function testProductionIdentityIsolation() {
  console.log('--- Running Test 1: Production Account Identity Safeguards ---');

  const prodUsers = ['ramseysims@gmail.com', 'nedpearson@gmail.com'];
  const demoPersonaEmails = DEMO_PERSONAS.map((p) => p.email);

  prodUsers.forEach((email) => {
    const isContaminated = demoPersonaEmails.includes(email);
    console.log(`User ${email} is isolated from demo persona list: ${!isContaminated} (Expected: true)`);
    if (isContaminated) throw new Error(`❌ Test 1 Failed! Production user ${email} found in demo persona list!`);
  });

  console.log('✅ Test 1 Passed Successfully!');
}

function testTourEngineStateTransitions() {
  console.log('\n--- Running Test 2: Declarative Tour Engine State Machine ---');

  const scenario = DEMO_SCENARIOS[0];
  if (!scenario) throw new Error('❌ Test 2 Failed: No scenario found!');

  tourEngine.startTour(scenario, 'watch');
  const state = tourEngine.getState();
  console.log(`Tour Engine Initialized State: ${state} (Expected: preparing)`);

  if (state !== 'preparing') {
    throw new Error(`❌ Test 2 Failed: Invalid state ${state}`);
  }

  tourEngine.stopTour();
  console.log('✅ Test 2 Passed Successfully!');
}

async function testProviderSimulators() {
  console.log('\n--- Running Test 3: Sandbox Provider Simulators ---');

  const payment = await demoSimulators.simulatePayment(250000, '4242');
  console.log(`Simulated Stripe Payment: chargeId=${payment.chargeId} (Success: ${payment.success})`);

  const sms = await demoSimulators.simulateSMS('(225) 555-0199', 'Your appointment is confirmed!');
  console.log(`Simulated Twilio SMS: sid=${sms.messageSid} (Success: ${sms.success})`);

  const events = demoSimulators.getEvents();
  console.log(`Logged Simulator Events: ${events.length} (Expected: 2)`);

  if (payment.success && sms.success && events.length === 2) {
    console.log('✅ Test 3 Passed Successfully!');
  } else {
    throw new Error('❌ Test 3 Failed!');
  }
}

async function runAllDemoTests() {
  testProductionIdentityIsolation();
  testTourEngineStateTransitions();
  await testProviderSimulators();
  console.log('\n🌟 ALL DEMO & TRAINING SYSTEM AUTOMATED TESTS PASSED SUCCESSFULLY! 🌟');
}

runAllDemoTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
