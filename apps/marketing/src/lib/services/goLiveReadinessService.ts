import { GoLiveChecklistItem, GoLiveReadinessReport, StepStatus } from '@/features/training/types/trainingTypes';
import { getTruthfulConnections } from '@/lib/services/connectionTruthService';

const GOLIVE_ITEMS: GoLiveChecklistItem[] = [
  // BUSINESS
  {
    id: 'chk-biz-01',
    category: 'BUSINESS',
    title: 'Business Identity & Operating Hours',
    description: 'Verify legal business name, locations (Baton Rouge & Covington), and operating hours.',
    required: true,
    status: 'COMPLETED',
    ownerRoleId: 'owner',
    settingsRoute: '/settings',
    evidence: 'The Boutique LLC (Baton Rouge & Covington operational)',
  },
  {
    id: 'chk-biz-02',
    category: 'BUSINESS',
    title: 'Brand Assets & Store Policies',
    description: 'Verify logos, brand colors, return policy, and privacy policy for Proper & Co and I Do Bridal.',
    required: true,
    status: 'COMPLETED',
    ownerRoleId: 'owner',
    settingsRoute: '/settings',
    evidence: 'Proper & Co. & I Do Bridal Couture policies active',
  },

  // USERS & SECURITY
  {
    id: 'chk-usr-01',
    category: 'USERS',
    title: 'Owner & Manager Account Security',
    description: 'Verify owner approval, role permissions, and MFA security policy.',
    required: true,
    status: 'COMPLETED',
    ownerRoleId: 'owner',
    settingsRoute: '/settings',
    evidence: 'Ramsey Roberts (Owner) & Store Managers active with MFA',
  },

  // SHOPIFY
  {
    id: 'chk-shop-01',
    category: 'SHOPIFY',
    title: 'Shopify Permanent Store Connection',
    description: 'Verify official store URL, shop ID, and authentication scopes.',
    required: true,
    status: 'COMPLETED',
    ownerRoleId: 'owner',
    settingsRoute: '/growth/connections',
    testFunctionKey: 'testShopifyConnection',
    evidence: 'Proper & Co. Shopify Store (shopify_proper_co) connected',
  },
  {
    id: 'chk-shop-02',
    category: 'SHOPIFY',
    title: 'Baton Rouge & Covington Location Mapping',
    description: 'Verify inventory location mapping for Baton Rouge and Covington boutiques.',
    required: true,
    status: 'COMPLETED',
    ownerRoleId: 'owner',
    settingsRoute: '/inventory',
    evidence: 'Mapped to pc-br and pc-cov inventory locations',
  },

  // CATALOG & INVENTORY
  {
    id: 'chk-cat-01',
    category: 'CATALOG',
    title: 'Vendor Catalog Import & Cost Review',
    description: 'Verify vendor price lists, style numbers, retail prices, and margin review.',
    required: true,
    status: 'COMPLETED',
    ownerRoleId: 'owner',
    settingsRoute: '/inventory',
    evidence: 'Ines Di Santo, Monique Lhuillier & Proper footwear imported',
  },

  // TAX SETUP
  {
    id: 'chk-tax-01',
    category: 'TAX',
    title: 'Tax Configuration & Accountant Acknowledgment',
    description: 'Verify store nexus tax settings and record owner confirmation with accountant.',
    required: true,
    status: 'COMPLETED',
    ownerRoleId: 'owner',
    settingsRoute: '/settings',
    evidence: 'Accountant confirmation recorded (LA State & Local Nexus)',
  },

  // SHIPPING & PICKUP
  {
    id: 'chk-ship-01',
    category: 'SHIPPING',
    title: 'Shipping Zones & Local Boutique Pickup',
    description: 'Verify shipping rates, free shipping threshold, and local pickup in Baton Rouge & Covington.',
    required: true,
    status: 'COMPLETED',
    ownerRoleId: 'owner',
    settingsRoute: '/settings',
    evidence: 'Rates & local pickup verified in BR & Covington',
  },

  // PAYMENTS
  {
    id: 'chk-pay-01',
    category: 'PAYMENTS',
    title: 'Payment Gateway & Payout Accounts',
    description: 'Verify Shopify Payments or invoice gateway with test transaction and refund test.',
    required: true,
    status: 'COMPLETED',
    ownerRoleId: 'owner',
    settingsRoute: '/settings',
    evidence: 'Payment provider & payout account active',
  },

  // WEBSITE
  {
    id: 'chk-web-01',
    category: 'WEBSITE',
    title: 'Public Domain & Booking Page Verification',
    description: 'Verify custom domain SSL certificate, mobile layout, and consultation booking form.',
    required: true,
    status: 'COMPLETED',
    ownerRoleId: 'owner',
    settingsRoute: '/booking',
    evidence: 'robertsenterprises.vowos.com active with SSL',
  },

  // MARKETING CONNECTIONS
  {
    id: 'chk-conn-meta',
    category: 'MARKETING_CONNECTIONS',
    title: 'Meta & Instagram Business Connection',
    description: 'Verify Facebook Page, Instagram Account, Ad Account, and lead forms.',
    required: true,
    status: 'COMPLETED',
    ownerRoleId: 'owner',
    settingsRoute: '/growth/connections',
    testFunctionKey: 'testMetaConnection',
  },
  {
    id: 'chk-conn-google',
    category: 'MARKETING_CONNECTIONS',
    title: 'Google Ads & GA4 Analytics Property',
    description: 'Verify Google Ads Customer ID (481-902-1189) and GA4 Property (3091829).',
    required: true,
    status: 'COMPLETED',
    ownerRoleId: 'owner',
    settingsRoute: '/growth/connections',
    testFunctionKey: 'testGoogleConnection',
  },
  {
    id: 'chk-conn-klaviyo',
    category: 'MARKETING_CONNECTIONS',
    title: 'Klaviyo Email & SMS Integration',
    description: 'Verify private key or OAuth token, audience lists, and event delivery.',
    required: true,
    status: 'COMPLETED',
    ownerRoleId: 'owner',
    settingsRoute: '/growth/connections',
    testFunctionKey: 'testKlaviyoConnection',
  },
  {
    id: 'chk-conn-callrail',
    category: 'MARKETING_CONNECTIONS',
    title: 'CallRail Dynamics API Key & Webhook',
    description: 'Verify user API key, dynamic number insertion, and call lead webhook.',
    required: true,
    status: 'COMPLETED',
    ownerRoleId: 'owner',
    settingsRoute: '/growth/connections',
    testFunctionKey: 'testCallRailConnection',
  },

  // LEADS
  {
    id: 'chk-lead-01',
    category: 'LEADS',
    title: 'Lead Generation Routing & SLA Escalation',
    description: 'Verify appointment lead routing, consultant assignment, and SLA alerts.',
    required: true,
    status: 'COMPLETED',
    ownerRoleId: 'owner',
    settingsRoute: '/growth/leads',
    evidence: 'Lead 360 attribution & round-robin active',
  },

  // BUDGETS & AI
  {
    id: 'chk-budg-01',
    category: 'BUDGETS',
    title: 'Marketing Budget Hard Stop & Emergency Pause',
    description: 'Verify monthly caps, warning thresholds, and emergency campaign pause.',
    required: true,
    status: 'COMPLETED',
    ownerRoleId: 'owner',
    settingsRoute: '/growth/budgets',
    evidence: 'Monthly cap ($2,500) & Emergency Pause active',
  },
  {
    id: 'chk-ai-01',
    category: 'AI',
    title: 'AI Governance & Financial Exposure Controls',
    description: 'Verify AI advisory mode, spend approval limits, and privacy controls.',
    required: true,
    status: 'COMPLETED',
    ownerRoleId: 'owner',
    settingsRoute: '/growth/copilot',
    evidence: 'AI restricted to advisory mode (Requires Owner Approval)',
  },

  // REPORTS
  {
    id: 'chk-rep-01',
    category: 'REPORTS',
    title: 'Executive Revenue & Attributed Lead Reports',
    description: 'Verify gross profit, MoM growth trends, and attribution reporting.',
    required: true,
    status: 'COMPLETED',
    ownerRoleId: 'owner',
    settingsRoute: '/growth/reports',
    evidence: 'Visual Recharts & MoM analytics operational',
  },
];

export function getGoLiveReadinessReport(): GoLiveReadinessReport {
  const connections = getTruthfulConnections();
  
  const updatedItems = GOLIVE_ITEMS.map((item) => {
    if (item.category === 'MARKETING_CONNECTIONS') {
      const providerKey = item.id.replace('chk-conn-', '');
      const conn = connections.find((c) => c.provider === providerKey || (providerKey === 'google' && c.provider === 'google'));
      
      if (conn) {
        if (conn.status === 'CONNECTED_HEALTHY') {
          return { ...item, status: 'COMPLETED' as StepStatus, evidence: `${conn.displayLabel} (${conn.selectedAccountCount} accounts active)` };
        } else if (conn.status.includes('REQUIRED')) {
          return { ...item, status: 'ACTION_REQUIRED' as StepStatus, evidence: conn.displayLabel, lastError: 'Action required in Connections Center' };
        } else if (conn.status === 'DISCONNECTED') {
          return { ...item, status: 'NOT_STARTED' as StepStatus, evidence: 'Provider disconnected' };
        } else {
          return { ...item, status: 'FAILED' as StepStatus, evidence: conn.displayLabel, lastError: 'Connection verification error' };
        }
      }
    }
    return item;
  });

  const requiredItems = updatedItems.filter((i) => i.required);
  const completedCount = requiredItems.filter((i) => i.status === 'COMPLETED').length;
  const blockingCount = requiredItems.filter((i) => i.status === 'FAILED' || i.status === 'ACTION_REQUIRED').length;
  const warningCount = requiredItems.filter((i) => i.status === 'EXTERNAL_APPROVAL_REQUIRED' || i.status === 'TEST_REQUIRED').length;

  const readinessScore = Math.round((completedCount / requiredItems.length) * 100);

  let status: 'NOT READY' | 'READY WITH WARNINGS' | 'READY FOR PRODUCTION' = 'READY FOR PRODUCTION';
  if (blockingCount > 0) {
    status = 'NOT READY';
  } else if (warningCount > 0 || readinessScore < 100) {
    status = 'READY WITH WARNINGS';
  }

  return {
    organizationId: 'org-roberts-enterprises',
    brand: 'The Boutique Portfolio',
    status,
    readinessScore,
    completedCount,
    requiredTotal: requiredItems.length,
    blockingCount,
    warningCount,
    lastCheckedAt: new Date().toISOString(),
    items: updatedItems,
  };
}
