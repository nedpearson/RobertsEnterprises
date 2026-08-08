/**
 * Synthetic Demo Dataset & Persona Generator for VowOS
 * Provides isolated, realistic synthetic records across 3 stores and 10 personas.
 */

export interface DemoStore {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  managerName: string;
}

export interface DemoPersona {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Manager' | 'Stylist' | 'Seamstress' | 'Front Desk' | 'Inventory' | 'Purchasing' | 'Payroll' | 'Pending';
  storeId: string;
  avatar: string;
  title: string;
}

export const DEMO_STORES: DemoStore[] = [
  {
    id: 'demo-store-downtown',
    name: 'Magnolia Bridal — Downtown',
    code: 'MBD',
    address: '304 Third Street, Baton Rouge, LA 70801',
    phone: '(225) 555-0190',
    managerName: 'Camille Dupuis',
  },
  {
    id: 'demo-store-northshore',
    name: 'Magnolia Bridal — Northshore',
    code: 'MBN',
    address: '428 Lee Lane, Covington, LA 70433',
    phone: '(985) 555-0144',
    managerName: 'Claire Tremoulet',
  },
  {
    id: 'demo-store-riverdistrict',
    name: 'Magnolia Bridal — River District',
    code: 'MBR',
    address: '1120 Magazine St, New Orleans, LA 70130',
    phone: '(504) 555-0188',
    managerName: 'Genevieve St. Romain',
  },
];

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: 'persona-owner',
    name: 'Ramsey Roberts',
    email: 'ramsey.demo@magnoliabridal.com',
    role: 'Owner',
    storeId: 'demo-store-downtown',
    avatar: 'RR',
    title: 'Executive Managing Principal',
  },
  {
    id: 'persona-manager',
    name: 'Camille Dupuis',
    email: 'camille.dupuis@magnoliabridal.com',
    role: 'Manager',
    storeId: 'demo-store-downtown',
    avatar: 'CD',
    title: 'Downtown General Manager',
  },
  {
    id: 'persona-stylist',
    name: 'Dana Robichaux',
    email: 'dana.robichaux@magnoliabridal.com',
    role: 'Stylist',
    storeId: 'demo-store-downtown',
    avatar: 'DR',
    title: 'Senior Bridal Consultant',
  },
  {
    id: 'persona-inventory',
    name: 'Marcus Landry',
    email: 'marcus.landry@magnoliabridal.com',
    role: 'Inventory',
    storeId: 'demo-store-northshore',
    avatar: 'ML',
    title: 'Logistics & Stock Manager',
  },
  {
    id: 'persona-purchasing',
    name: 'Priya Kulkarni',
    email: 'priya.kulkarni@magnoliabridal.com',
    role: 'Purchasing',
    storeId: 'demo-store-downtown',
    avatar: 'PK',
    title: 'Purchasing & Vendor Coordinator',
  },
  {
    id: 'persona-seamstress',
    name: 'Colette LeBlanc',
    email: 'colette.leblanc@magnoliabridal.com',
    role: 'Seamstress',
    storeId: 'demo-store-northshore',
    avatar: 'CL',
    title: 'Master Seamstress & Fitter',
  },
  {
    id: 'persona-payroll',
    name: 'Theresa Hebert',
    email: 'theresa.hebert@magnoliabridal.com',
    role: 'Payroll',
    storeId: 'demo-store-downtown',
    avatar: 'TH',
    title: 'HR & Payroll Administrator',
  },
  {
    id: 'persona-frontdesk',
    name: 'Sophie Boudreaux',
    email: 'sophie.boudreaux@magnoliabridal.com',
    role: 'Front Desk',
    storeId: 'demo-store-riverdistrict',
    avatar: 'SB',
    title: 'Concierge & Scheduling Lead',
  },
  {
    id: 'persona-pending',
    name: 'Alex Breaux',
    email: 'alex.breaux@magnoliabridal.com',
    role: 'Pending',
    storeId: 'demo-store-downtown',
    avatar: 'AB',
    title: 'New Apprentice Consultant (Pending)',
  },
  {
    id: 'persona-customer',
    name: 'Eleanor Vance',
    email: 'eleanor.vance@example.com',
    role: 'Stylist',
    storeId: 'demo-store-downtown',
    avatar: 'EV',
    title: 'VIP Bride',
  },
];
