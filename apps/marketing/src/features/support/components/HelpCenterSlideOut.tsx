import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Search, Book, HeadphonesIcon, HelpCircle, ArrowRight, SearchIcon, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDebounce } from 'use-debounce';
import { HelpArticleView } from './HelpArticleView';

export function HelpCenterSlideOut() {
  const { user, userContext, tenant } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery] = useDebounce(searchQuery, 300);
  
  const [view, setView] = useState<'home' | 'ticket' | 'article'>('home');
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Ticket Form
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('ACCOUNT');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && view === 'home') {
      fetchArticles();
    }
  }, [open, view, debouncedQuery]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      if (debouncedQuery) {
        const { data, error } = await supabase.rpc('search_help_articles', {
          search_query: debouncedQuery,
          user_role: userContext?.role || 'user'
        });
        if (data) setArticles(data);
      } else {
        // Fetch contextually relevant or default articles
        const { data, error } = await supabase
          .from('help_articles')
          .select('id, title, excerpt:summary, category, slug, read_time_minutes, last_reviewed_at')
          .limit(3);
        if (data) setArticles(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const tenantId = tenant?.id;
    if (!tenantId) return;
    
    setSubmitting(true);
    try {
      const fullDescription = `Route: ${location.pathname}\nRole: ${userContext?.role || 'Unknown'}\n\n${description}`;

      const { error } = await supabase.from('support_tickets').insert({
        business_id: tenantId,
        organization_id: tenantId,
        tenant_id: tenantId,
        user_id: user?.id || userContext?.id || '',
        category,
        subject,
        description: fullDescription,
        status: 'NEW',
        severity: 'Normal',
        priority: 'NORMAL'
      });

      if (error) throw error;
      
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
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => setView('ticket')}
                  className="bg-white border border-stone-200 rounded-xl p-4 flex items-center gap-4 text-left hover:border-brand-primary hover:shadow-sm transition-all"
                >
                  <HeadphonesIcon className="h-6 w-6 text-brand-primary" />
                  <div>
                    <h3 className="font-bold text-sm text-stone-900">Contact Support</h3>
                    <p className="text-xs text-stone-500 mt-1">Open a ticket with our team</p>
                  </div>
                </button>
              </div>

              {/* Knowledge Base Suggestions */}
              <div>
                <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center justify-between">
                  {searchQuery ? 'Search Results' : 'Suggested Articles'}
                  {!searchQuery && (
                    <Badge 
                      variant="secondary" 
                      className="bg-stone-200 text-stone-600 hover:bg-stone-200 cursor-pointer"
                      onClick={() => { setOpen(false); navigate('/help'); }}
                    >
                      View All
                    </Badge>
                  )}
                </h3>
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-center py-6 text-stone-500 text-sm">Loading...</div>
                  ) : articles.length > 0 ? articles.map(article => (
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
                      <p className="text-xs text-stone-500 line-clamp-1">{article.excerpt || article.summary}</p>
                    </button>
                  )) : (
                    <div className="text-center py-6 text-stone-500 text-sm">
                      No articles found
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
              <h2 className="font-bold truncate">Article</h2>
            </div>
            <div className="flex-1 overflow-y-auto bg-white">
              <HelpArticleView slug={selectedArticle.slug} />
            </div>
          </div>
        )}

      </SheetContent>
    </Sheet>
  );
}
