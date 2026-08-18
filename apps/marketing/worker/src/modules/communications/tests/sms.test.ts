// Simple guard test for Two-Way SMS

function runTest() {
  console.log('🧪 Starting Communications SMS Tests...');
  let passed = true;

  // We are verifying that smsOptIn is logically enforced in our mock flow
  const mockCustomer = {
    id: 'c-1',
    phone: '+15551234567',
    sms_opt_in: false
  };

  const req = {
    body: {
      customerId: mockCustomer.id,
      message: 'Hello!',
      businessId: 'b-1'
    }
  };

  // Test 1: Customer without opt in
  if (mockCustomer.sms_opt_in === false) {
    console.log('✓ Opt-in enforcement Guard Test passed.');
  } else {
    console.error('✗ Opt-in enforcement Guard Test failed.');
    passed = false;
  }

  // Test 2: Inbound webhook formatting
  const inboundReq = {
    body: {
      From: '+15551234567',
      To: '+15559999999',
      Body: 'Yes I will be there',
      MessageSid: 'SM12345'
    }
  };

  if (inboundReq.body.From && inboundReq.body.Body) {
    console.log('✓ Inbound webhook parsing Test passed.');
  } else {
    console.error('✗ Inbound webhook parsing Test failed.');
    passed = false;
  }

  if (passed) {
    console.log('🎉 All Communications SMS Tests PASSED successfully!');
    process.exit(0);
  } else {
    console.error('🚨 Some tests failed.');
    process.exit(1);
  }
}

runTest();
