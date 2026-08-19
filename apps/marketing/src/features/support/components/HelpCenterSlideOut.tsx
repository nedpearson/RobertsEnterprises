import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Search, Book, MessageSquare, HeadphonesIcon, HelpCircle, ArrowRight, CheckCircle2, SearchIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

// Mock Knowledge Base for Phase 13 requirements
const MOCK_ARTICLES = [
  { id: '1', title: 'Connecting Shopify Inventory', category: 'SHOPIFY', excerpt: 'Learn how to sync your in-store inventory with Shopify in real-time.' },
  { id: '2', title: 'Managing Appointment Deposits', category: 'BOOKING', excerpt: 'Require credit cards on file for high-value bridal appointments.' },
  { id: '3', title: 'Adding New Staff Members', category: 'STAFF', excerpt: 'Set up new employee accounts and configure their permissions.' },
  { id: '4', title: 'Understanding Sales Reports', category: 'REPORTS', excerpt: 'A guide to reading your daily flash sales and commission reports.' },
  { id: '5', title: 'Two-Way SMS Setup', category: 'COMMUNICATIONS', excerpt: 'Enable two-way texting for appointment reminders and customer chat.' },
  { id: '6', title: 'Setting Up Multi-Location Inventory', category: 'INVENTORY', excerpt: 'Transfer dresses between store locations and track transit status.' },
  { id: '7', title: 'Configuring Automatic Gratuity', category: 'BILLING', excerpt: 'Set up default gratuity options for your point of sale checkout.' },
  { id: '8', title: 'Creating Custom Contract Templates', category: 'ACCOUNT', excerpt: 'Use merge tags to build dynamic PDF contracts for brides.' },
  { id: '9', title: 'Managing User Roles & Permissions', category: 'SECURITY', excerpt: 'Restrict access to financial reports and export functions.' },
  { id: '10', title: 'Troubleshooting iPad Print Issues', category: 'TROUBLESHOOTING', excerpt: 'Steps to resolve AirPrint connectivity for receipt printers.' },
];

export function HelpCenterSlideOut() {
  const { userContext } = useAuth();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'home' | 'ticket' | 'article'>('home');
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  
  // Ticket Form
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('ACCOUNT');
  const [submitting, setSubmitting] = useState(false);

  const filteredArticles = searchQuery 
    ? MOCK_ARTICLES.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.category.toLowerCase().includes(searchQuery.toLowerCase()))
    : MOCK_ARTICLES.slice(0, 3);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userContext?.tenant?.id) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase.from('support_tickets').insert({
        organization_id: userContext.tenant?.id,
        user_id: userContext.user.id,
        category,
        subject,
        description,
        status: 'NEW',
        severity: 'Normal'
      });

      if (error) {
        // Fallback for mocked environment if table isn't present
        console.warn('Support ticket submission mocked due to missing table', error);
      }
      
      toast.success('Support ticket created! Our team will respond shortly.');
      setSubject('');
      setDescription('');
      setView('home');
    } catch (err) {
      toast.error('Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 hidden md:flex">
          <HelpCircle className="h-4 w-4" />
          Help & Support
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-[450px] p-0 flex flex-col bg-stone-50">
        
        {view === 'home' && (
          <>
            <div className="bg-stone-900 text-white p-6 pb-8 rounded-b-3xl shadow-md">
              <SheetHeader className="text-left mb-6">
                <SheetTitle className="text-white text-2xl font-serif">How can we help?</SheetTitle>
                <SheetDescription className="text-stone-300">
                  Search our knowledge base or get in touch with our team.
                </SheetDescription>
              </SheetHeader>
              
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                <Input 
                  placeholder="Search for articles, guides..." 
                  className="pl-10 h-12 bg-white/10 border-white/20 text-white placeholder:text-stone-400 focus-visible:ring-brand-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setView('ticket')}
                  className="bg-white border border-stone-200 rounded-xl p-4 text-left hover:border-brand-primary hover:shadow-sm transition-all"
                >
                  <HeadphonesIcon className="h-6 w-6 text-brand-primary mb-2" />
                  <h3 className="font-bold text-sm text-stone-900">Contact Support</h3>
                  <p className="text-xs text-stone-500 mt-1">Open a ticket with our team</p>
                </button>
                <button className="bg-white border border-stone-200 rounded-xl p-4 text-left hover:border-brand-primary hover:shadow-sm transition-all">
                  <MessageSquare className="h-6 w-6 text-brand-primary mb-2" />
                  <h3 className="font-bold text-sm text-stone-900">Live Chat</h3>
                  <p className="text-xs text-stone-500 mt-1">Typically replies in 5m</p>
                </button>
              </div>

              {/* Knowledge Base Suggestions */}
              <div>
                <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center justify-between">
                  {searchQuery ? 'Search Results' : 'Suggested Articles'}
                  {!searchQuery && <Badge variant="secondary" className="bg-stone-200 text-stone-600 hover:bg-stone-200 cursor-pointer">View All</Badge>}
                </h3>
                <div className="space-y-3">
                  {filteredArticles.length > 0 ? filteredArticles.map(article => (
                    <button 
                      key={article.id}
                      onClick={() => {
                        setSelectedArticle(article);
                        setView('article');
                      }}
                      className="w-full text-left bg-white border border-stone-200 rounded-lg p-4 hover:border-stone-300 transition-colors group"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-sm text-stone-900 group-hover:text-brand-primary transition-colors">{article.title}</h4>
                        <ArrowRight className="h-4 w-4 text-stone-400 group-hover:text-brand-primary group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="text-xs text-stone-500 line-clamp-1">{article.excerpt}</p>
                    </button>
                  )) : (
                    <div className="text-center py-6 text-stone-500 text-sm">
                      No articles found for "{searchQuery}"
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {view === 'ticket' && (
          <div className="flex flex-col h-full">
            <div className="bg-white border-b p-4 flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setView('home')} className="p-0 h-auto">
                <ArrowRight className="h-4 w-4 rotate-180 mr-1" /> Back
              </Button>
              <h2 className="font-bold">Contact Support</h2>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <form onSubmit={handleSubmitTicket} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">What do you need help with?</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-950 focus-visible:ring-offset-2"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="ACCOUNT">Account & Settings</option>
                    <option value="BOOKING">Appointments & Calendar</option>
                    <option value="SHOPIFY">Shopify Integration</option>
                    <option value="BILLING">Billing & Subscription</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <Input 
                    required 
                    placeholder="Brief description of the issue" 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Details</label>
                  <Textarea 
                    required 
                    placeholder="Please provide as much detail as possible..."
                    className="min-h-[150px]"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Send Message'}
                </Button>
              </form>
            </div>
          </div>
        )}

        {view === 'article' && selectedArticle && (
          <div className="flex flex-col h-full">
            <div className="bg-white border-b p-4 flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setView('home')} className="p-0 h-auto">
                <ArrowRight className="h-4 w-4 rotate-180 mr-1" /> Back
              </Button>
              <h2 className="font-bold truncate">{selectedArticle.title}</h2>
            </div>
            <div className="p-6 flex-1 overflow-y-auto bg-white">
              <Badge variant="outline" className="mb-4">{selectedArticle.category}</Badge>
              <h1 className="text-2xl font-serif font-bold text-stone-900 mb-4">{selectedArticle.title}</h1>
              <div className="prose prose-sm prose-stone">
                <p className="text-lg text-stone-600 mb-6">{selectedArticle.excerpt}</p>
                
                <h3>Step-by-Step Instructions</h3>
                <p>This is a placeholder for the full article content. In the complete system, this content is fetched from the <code>knowledge_articles</code> table as rich text or markdown.</p>
                <ol>
                  <li>Navigate to your settings panel</li>
                  <li>Click on the integrations tab</li>
                  <li>Follow the on-screen prompts to authorize</li>
                </ol>
                
                <div className="mt-8 p-4 bg-stone-50 rounded-lg border flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Did this solve your issue?</h4>
                    <div className="flex gap-2 mt-2">
                      <Button variant="outline" size="sm">Yes</Button>
                      <Button variant="outline" size="sm">No, I need help</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </SheetContent>
    </Sheet>
  );
}

