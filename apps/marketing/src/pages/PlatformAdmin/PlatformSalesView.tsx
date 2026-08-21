import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, DollarSign, Activity, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export default function PlatformSalesView() {
  const [leads, setLeads] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    newDemos: 0,
    activeTrials: 0,
    pipelineValue: 0,
    conversionRate: 0,
  });

  useEffect(() => {
    const fetchSalesData = async () => {
      const { data: leadsData } = await supabase.from('platform_leads')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (leadsData) {
        setLeads(leadsData);
        
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const newDemos = leadsData.filter(l => l.lead_type === 'DEMO' && new Date(l.created_at) > sevenDaysAgo).length;
        // Assuming $250 avg ACV per lead for pipeline value
        const pipelineValue = leadsData.filter(l => l.status === 'NEW' || l.status === 'CONTACTED').length * 250;
        
        setMetrics(prev => ({ ...prev, newDemos, pipelineValue }));
      }
      
      const { count: trialsCount } = await supabase.from('businesses')
        .select('*', { count: 'exact', head: true })
        .eq('organization_type', 'TRIAL')
        .is('parent_id', null);
        
      setMetrics(prev => ({ ...prev, activeTrials: trialsCount || 0 }));
    };
    fetchSalesData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif text-stone-900 tracking-tight">VowOS Corporate Sales</h2>
          <p className="text-sm text-stone-500">Manage demo requests, trials, and subscription conversions.</p>
        </div>
        <Button className="bg-brand-primary text-white">Create Lead</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-stone-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">New Demo Requests</CardTitle>
            <Activity className="w-4 h-4 text-stone-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-900">{metrics.newDemos}</div>
            <p className="text-xs text-stone-500">In last 7 days</p>
          </CardContent>
        </Card>
        
        <Card className="border-stone-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">Active Trials</CardTitle>
            <Building2 className="w-4 h-4 text-stone-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-900">{metrics.activeTrials}</div>
            <p className="text-xs text-stone-500">Currently evaluating</p>
          </CardContent>
        </Card>
        
        <Card className="border-stone-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">Pipeline Value</CardTitle>
            <DollarSign className="w-4 h-4 text-stone-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-900">${metrics.pipelineValue}</div>
            <p className="text-xs text-stone-500">Est. MRR of open leads</p>
          </CardContent>
        </Card>
        
        <Card className="border-stone-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">Conversion Rate</CardTitle>
            <Users className="w-4 h-4 text-stone-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-900">--%</div>
            <p className="text-xs text-stone-500">Lead to Active</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-stone-200">
        <CardHeader>
          <CardTitle className="text-lg font-serif text-stone-900">Sales Pipeline</CardTitle>
          <CardDescription>Recent inquiries from vowos.bridgebox.ai</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map(lead => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.company_name}</TableCell>
                  <TableCell>{lead.first_name} {lead.last_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-stone-500 bg-stone-50 border-stone-200">
                      {lead.lead_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      lead.status === 'NEW' ? 'bg-orange-100 text-orange-700' :
                      lead.status === 'Demo Completed' ? 'bg-blue-100 text-blue-700' :
                      lead.status === 'Trial Active' ? 'bg-indigo-100 text-indigo-700' :
                      'bg-emerald-100 text-emerald-700'
                    }>
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-stone-500 text-sm">{new Date(lead.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-brand-primary">View 360</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
