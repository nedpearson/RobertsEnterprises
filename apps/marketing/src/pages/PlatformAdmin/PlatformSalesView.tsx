import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, DollarSign, Activity, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PlatformSalesView() {
  // In a real implementation, this would fetch from a `platform_leads` table via Supabase.
  const leads = [
    { id: 'LD-001', company: 'Bridal Elegance', contact: 'Sarah Jones', source: 'Organic Search', status: 'Demo Requested', date: 'Today' },
    { id: 'LD-002', company: 'Chicago Gowns', contact: 'Michael Chen', source: 'Paid Ad (Instagram)', status: 'Demo Completed', date: 'Yesterday' },
    { id: 'LD-003', company: 'The White Room', contact: 'Emma Davis', source: 'Referral', status: 'Trial Active', date: '3 days ago' },
    { id: 'LD-004', company: 'Boutique Luxe', contact: 'Olivia Smith', source: 'Direct', status: 'Paid Conversion', date: '1 week ago' },
  ];

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
            <div className="text-2xl font-bold text-stone-900">12</div>
            <p className="text-xs text-stone-500">In last 7 days</p>
          </CardContent>
        </Card>
        
        <Card className="border-stone-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">Active Trials</CardTitle>
            <Building2 className="w-4 h-4 text-stone-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-900">8</div>
            <p className="text-xs text-stone-500">Healthy setup state</p>
          </CardContent>
        </Card>
        
        <Card className="border-stone-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">Demo Conversion</CardTitle>
            <Filter className="w-4 h-4 text-stone-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-900">42%</div>
            <p className="text-xs text-stone-500">Demo to Trial</p>
          </CardContent>
        </Card>
        
        <Card className="border-stone-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">New MRR</CardTitle>
            <DollarSign className="w-4 h-4 text-stone-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-900">$2,450</div>
            <p className="text-xs text-stone-500">Current Month</p>
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
                  <TableCell className="font-medium">{lead.company}</TableCell>
                  <TableCell>{lead.contact}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-stone-500 bg-stone-50 border-stone-200">
                      {lead.source}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      lead.status === 'Demo Requested' ? 'bg-orange-100 text-orange-700' :
                      lead.status === 'Demo Completed' ? 'bg-blue-100 text-blue-700' :
                      lead.status === 'Trial Active' ? 'bg-indigo-100 text-indigo-700' :
                      'bg-emerald-100 text-emerald-700'
                    }>
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-stone-500 text-sm">{lead.date}</TableCell>
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
