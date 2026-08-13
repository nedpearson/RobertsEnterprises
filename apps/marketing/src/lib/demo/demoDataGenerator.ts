/**
 * PRNG (Pseudo-Random Number Generator) for deterministic data generation.
 * This ensures the demo data looks the exact same every time it's generated for a given seed.
 */
function mulberry32(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

export function generateRobustDemoData(seed: number = 12345) {
  const random = mulberry32(seed);
  
  // Helpers
  const randRange = (min: number, max: number) => Math.floor(random() * (max - min + 1)) + min;
  const randItem = <T>(arr: T[]): T => arr[Math.floor(random() * arr.length)];
  const randDate = (startDaysAgo: number, endDaysAgo: number) => {
    const now = new Date();
    const target = new Date(now.getTime() - (randRange(endDaysAgo, startDaysAgo) * 86400000));
    return target.toISOString();
  };

  const locations = ['demo-store-downtown', 'demo-store-northshore', 'demo-store-westside'];
  const stylists = ['Dana Robichaux', 'Eleanor Vance', 'Sarah Jenkins', 'Michael Torres', 'Jessica Alba'];
  const leadSources = ['Google', 'Facebook', 'Instagram', 'Organic', 'Referral', 'Website'];
  const lookingFor = ['A-Line', 'Ballgown', 'Mermaid', 'Sheath', 'Fit and Flare', 'Accessories'];
  const statuses = ['Active', 'Completed', 'Canceled', 'Archived'];

  const customers: any[] = [];
  const leads: any[] = [];
  const appointments: any[] = [];
  const orders: any[] = [];
  
  // Generate 500 connected journeys
  for (let i = 0; i < 500; i++) {
    const idNum = 3000 + i;
    const isLead = random() > 0.4;
    const hasAppt = random() > 0.3;
    const hasSale = hasAppt && random() > 0.4;
    
    const source = randItem(leadSources);
    const location = randItem(locations);
    const stylist = randItem(stylists);
    const createdDaysAgo = randRange(1, 365);
    
    const cId = `C-${idNum}`;
    
    if (isLead) {
      leads.push({
        id: `L-${1000 + i}`,
        name: `Customer ${idNum}`,
        email: `c${idNum}@example.com`,
        source: source,
        budget_cents: randRange(1500, 5000) * 100,
        wedding_date: randDate(-30, -400), // future dates
        stage: hasAppt ? 'Appointment Booked' : 'New Inquiry',
        ai_score: randRange(50, 99),
        ai_insight: `Engaged via ${source}.`,
        created_at: randDate(createdDaysAgo, createdDaysAgo),
      });
    }

    customers.push({
      id: cId,
      name: `Customer ${idNum}`,
      email: `c${idNum}@example.com`,
      phone: `(555) ${randRange(100,999)}-${randRange(1000,9999)}`,
      wedding_date: randDate(-30, -400),
      stylist: stylist,
      status: hasSale ? 'Completed' : 'Active',
      spend_cents: hasSale ? randRange(2000, 8000) * 100 : 0,
      location: location,
      portal_token: `demo-token-${i}`,
      created_at: randDate(createdDaysAgo, createdDaysAgo),
    });

    if (hasAppt) {
      const apptDaysAgo = createdDaysAgo - randRange(1, 14);
      appointments.push({
        id: `A-${5000 + i}`,
        customer: `Customer ${idNum}`,
        type: randItem(['First Fitting', 'Bridal Consultation', 'Accessories']),
        date: randDate(apptDaysAgo, apptDaysAgo).slice(0, 10),
        time: `${randRange(9, 16)}:00`,
        stylist: stylist,
        status: apptDaysAgo < 0 ? 'Upcoming' : (random() > 0.1 ? 'Show' : 'No-Show'),
        location: location,
        looking_for: randItem(lookingFor),
        budget_cents: randRange(1500, 5000) * 100,
        fee_paid: random() > 0.5,
      });
    }

    if (hasSale) {
      orders.push({
        id: `O-${8000 + i}`,
        customer_id: cId,
        total_cents: randRange(2000, 8000) * 100,
        status: 'Paid',
        location: location,
        created_at: randDate(createdDaysAgo - 15, createdDaysAgo - 15)
      });
    }
  }

  // Pre-calculate synthetic marketing KPIs that perfectly match the generated records
  const marketingData = {
    Google: { spend: 4500, leads: leads.filter(l => l.source === 'Google').length, sales: orders.filter(o => customers.find(c => c.id === o.customer_id)?.source === 'Google').length },
    Facebook: { spend: 3200, leads: leads.filter(l => l.source === 'Facebook').length, sales: orders.filter(o => customers.find(c => c.id === o.customer_id)?.source === 'Facebook').length },
    Instagram: { spend: 6000, leads: leads.filter(l => l.source === 'Instagram').length, sales: orders.filter(o => customers.find(c => c.id === o.customer_id)?.source === 'Instagram').length },
  };

  return { customers, leads, appointments, orders, marketingData };
}
