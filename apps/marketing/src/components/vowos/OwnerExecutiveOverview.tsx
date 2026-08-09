import React from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  MapPin, 
  AlertTriangle, 
  BarChart3, 
  ArrowUpRight, 
  Award, 
  Percent, 
  ShieldCheck, 
  Building2,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ViewKey } from '@/lib/navigation/navigationRegistry';
import { useAuth } from '@/contexts/AuthContext';
import { useVowosData } from '@/contexts/VowosDataContext';

interface OwnerExecutiveOverviewProps {
  onNavigate: (view: ViewKey) => void;
}

export default function OwnerExecutiveOverview({ onNavigate }: OwnerExecutiveOverviewProps) {
  const { profile } = useAuth();
  const { brides, invoices } = useVowosData();

  const totalCollected = invoices.reduce((sum, i) => sum + i.paidCents, 0) / 100;
  const outstandingBalance = invoices.reduce((sum, i) => sum + (i.amountCents - i.paidCents), 0) / 100;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Executive Header Banner */}
      <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-stone-850 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-rose-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 uppercase tracking-widest text-[10px] font-bold">
                Executive Owner Portal
              </Badge>
              <span className="text-stone-400 text-xs font-medium">· Multi-Location View</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">
              Executive Overview — {profile?.name || 'Owner'}
            </h1>
            <p className="text-sm text-stone-300 mt-1 max-w-xl">
              High-level operational metrics, store comparative performance, gross margin ratios, and executive alerts across The Boutique.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              onClick={() => onNavigate('sales')}
              className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md"
            >
              <BarChart3 className="h-4 w-4 mr-1.5" />
              Full Sales Drilldown
            </Button>
            <Button
              onClick={() => onNavigate('schedule')}
              variant="outline"
              className="border-stone-700 text-stone-200 hover:bg-white/10 text-xs font-semibold"
            >
              Master Schedule
            </Button>
          </div>
        </div>
      </div>

      {/* Core Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-stone-200 shadow-xs hover:border-stone-300 transition-all">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Total Revenue YTD</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-stone-900">${totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <ArrowUpRight className="h-3.5 w-3.5" /> +18.4% vs last year
            </p>
          </CardContent>
        </Card>

        <Card className="border-stone-200 shadow-xs hover:border-stone-300 transition-all">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Outstanding Receivables</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-stone-900">${outstandingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-stone-500 font-medium mt-1">Across 15 open invoices</p>
          </CardContent>
        </Card>

        <Card className="border-stone-200 shadow-xs hover:border-stone-300 transition-all">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Gross Profit Margin</span>
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Percent className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-stone-900">68.2%</p>
            <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <ArrowUpRight className="h-3.5 w-3.5" /> +1.2% this month
            </p>
          </CardContent>
        </Card>

        <Card className="border-stone-200 shadow-xs hover:border-stone-300 transition-all">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Labor / Sales Ratio</span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-stone-900">14.5%</p>
            <p className="text-xs text-emerald-600 font-semibold mt-1">Healthy (Target &lt; 18%)</p>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Location Store Performance Comparison */}
      <Card className="border-stone-200 shadow-xs">
        <CardHeader className="p-5 border-b border-stone-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-stone-500" />
              Location Performance Comparison
            </CardTitle>
            <p className="text-xs text-stone-500 mt-0.5">Real-time revenue, target attainment, and conversion metrics by store</p>
          </div>
          <Button onClick={() => onNavigate('sales')} variant="ghost" size="sm" className="text-xs font-semibold text-rose-600">
            View All Reports <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Location</th>
                <th className="p-4">July Revenue</th>
                <th className="p-4">Target Attainment</th>
                <th className="p-4">Conversion Rate</th>
                <th className="p-4">Avg Order Value</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              <tr className="hover:bg-stone-50/50 transition-colors">
                <td className="p-4 font-bold text-stone-900 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-rose-500" />
                  Baton Rouge (Downtown)
                </td>
                <td className="p-4 font-semibold text-stone-900">$14,250.00</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '88%' }} />
                    </div>
                    <span className="font-bold text-stone-800">88%</span>
                  </div>
                </td>
                <td className="p-4 font-semibold text-stone-800">44.2%</td>
                <td className="p-4 font-semibold text-stone-800">$2,450.00</td>
                <td className="p-4">
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">On Track</Badge>
                </td>
              </tr>
              <tr className="hover:bg-stone-50/50 transition-colors">
                <td className="p-4 font-bold text-stone-900 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  Covington (Main St)
                </td>
                <td className="p-4 font-semibold text-stone-900">$7,500.00</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: '65%' }} />
                    </div>
                    <span className="font-bold text-stone-800">65%</span>
                  </div>
                </td>
                <td className="p-4 font-semibold text-stone-800">32.1%</td>
                <td className="p-4 font-semibold text-stone-800">$2,100.00</td>
                <td className="p-4">
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">Needs Attention</Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Top Stylists & Executive Operational Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Stylists Leaderboard */}
        <Card className="border-stone-200 shadow-xs">
          <CardHeader className="p-5 border-b border-stone-100 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              Top Revenue Consultants (This Month)
            </CardTitle>
            <Button onClick={() => onNavigate('staff')} variant="ghost" size="xs" className="text-xs font-semibold text-stone-600">
              Manage Staff
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            {[
              { rank: 1, name: 'Emma Vance', location: 'Baton Rouge', revenue: '$8,450', conversion: '52%' },
              { rank: 2, name: 'Sarah Jenkins', location: 'Covington', revenue: '$5,200', conversion: '44%' },
              { rank: 3, name: 'Claire Dupont', location: 'Baton Rouge', revenue: '$4,100', conversion: '39%' },
            ].map(stylist => (
              <div key={stylist.name} className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-stone-900 text-white font-bold flex items-center justify-center text-xs">
                    #{stylist.rank}
                  </div>
                  <div>
                    <p className="font-bold text-stone-900">{stylist.name}</p>
                    <p className="text-[10px] text-stone-500">{stylist.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-stone-900">{stylist.revenue}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold">{stylist.conversion} conversion</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Executive Action Alerts */}
        <Card className="border-stone-200 shadow-xs">
          <CardHeader className="p-5 border-b border-stone-100">
            <CardTitle className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              Executive Alerts & Action items
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-rose-950">Covington Sales Target Alert</p>
                <p className="text-stone-600 mt-0.5">Covington store is currently 35% behind July target. Consider staffing adjustment or marketing push.</p>
              </div>
              <Button onClick={() => onNavigate('marketing')} size="xs" className="bg-rose-600 text-white shrink-0">
                Growth Plan
              </Button>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-amber-950">3 Store Transfers Pending Approval</p>
                <p className="text-stone-600 mt-0.5">Gown samples requested for cross-store fittings awaiting logistics release.</p>
              </div>
              <Button onClick={() => onNavigate('transfers')} size="xs" variant="outline" className="border-amber-300 shrink-0">
                View Transfers
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
