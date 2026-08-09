export type IndustryPackId = 'bridal' | 'prom' | 'menswear' | 'general_retail';

export interface IndustryTerminology {
  customer: string;
  customers: string;
  product: string;
  products: string;
  appointment: string;
  appointments: string;
  fitting: string;
  fittings: string;
}

export interface IndustryPack {
  id: IndustryPackId;
  label: string;
  description: string;
  terminology: IndustryTerminology;
}

export const INDUSTRY_PACKS: Record<IndustryPackId, IndustryPack> = {
  bridal: {
    id: 'bridal',
    label: 'Bridal Boutique',
    description: 'Optimized for bridal shops with long lead times, alterations, and high-touch appointments.',
    terminology: {
      customer: 'Bride',
      customers: 'Brides',
      product: 'Gown',
      products: 'Gowns',
      appointment: 'Appointment',
      appointments: 'Appointments',
      fitting: 'Fitting',
      fittings: 'Fittings',
    }
  },
  prom: {
    id: 'prom',
    label: 'Prom & Pageant',
    description: 'High volume seasonal business tracking school registries and fast inventory turnover.',
    terminology: {
      customer: 'Client',
      customers: 'Clients',
      product: 'Dress',
      products: 'Dresses',
      appointment: 'Styling Session',
      appointments: 'Styling Sessions',
      fitting: 'Alteration',
      fittings: 'Alterations',
    }
  },
  menswear: {
    id: 'menswear',
    label: 'Menswear & Tuxedo',
    description: 'Tailored for suit sales, tuxedo rentals, and groomsmen party management.',
    terminology: {
      customer: 'Groom',
      customers: 'Grooms',
      product: 'Suit',
      products: 'Suits',
      appointment: 'Fitting',
      appointments: 'Fittings',
      fitting: 'Tailoring',
      fittings: 'Tailoring',
    }
  },
  general_retail: {
    id: 'general_retail',
    label: 'General Apparel',
    description: 'Standard retail operations with walk-in traffic and cash-and-carry sales.',
    terminology: {
      customer: 'Customer',
      customers: 'Customers',
      product: 'Item',
      products: 'Items',
      appointment: 'Booking',
      appointments: 'Bookings',
      fitting: 'Fitting',
      fittings: 'Fittings',
    }
  }
};
