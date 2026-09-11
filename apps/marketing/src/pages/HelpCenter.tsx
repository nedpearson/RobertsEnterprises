import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { SearchIcon, Book, ArrowRight } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { useAuth } from '@/contexts/AuthContext';

export default function HelpCenter() {
  const { category } = useParams<{ category: string }>();
  const { userContext } = useAuth();
  
  const [categories, setCategories] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery] = useDebounce(searchQuery, 300);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      // Fetch categories
      const { data: cats } = await supabase.from('help_categories').select('*').order('sort_order');
      if (cats) setCategories(cats);

      // Fetch articles based on category if specified
      if (category) {
        const currentCat = cats?.find(c => c.slug === category);
        if (currentCat) {
          const { data: arts } = await supabase
            .from('help_articles')
            .select('*')
            .eq('category_id', currentCat.id);
          if (arts) setArticles(arts);
        }
      } else {
        // If no category, maybe fetch top articles
        const { data: arts } = await supabase
          .from('help_articles')
          .select('*')
          .limit(10);
        if (arts) setArticles(arts);
      }
      setLoading(false);
    }
    loadInitialData();
  }, [category]);

  useEffect(() => {
    async function performSearch() {
      if (!debouncedQuery) return;
      setLoading(true);
      const { data } = await supabase.rpc('search_help_articles', {
        search_query: debouncedQuery,
        user_role: userContext?.role || 'user'
      });
      if (data) setArticles(data);
      setLoading(false);
    }
    
    if (debouncedQuery) {
      performSearch();
    }
  }, [debouncedQuery]);

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-stone-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6">How can we help?</h1>
          <div className="relative max-w-2xl mx-auto">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-stone-400" />
            <Input 
              placeholder="Search for articles, guides..." 
              className="pl-14 h-14 text-lg bg-white/10 border-white/20 text-white placeholder:text-stone-400 focus-visible:ring-brand-primary rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-1 space-y-2">
            <h3 className="font-bold text-stone-900 uppercase tracking-wider text-sm mb-4">Categories</h3>
            <Link 
              to="/help"
              className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!category ? 'bg-stone-200 text-stone-900' : 'text-stone-600 hover:bg-stone-100'}`}
            >
              All Articles
            </Link>
            {categories.map(c => (
              <Link 
                key={c.id}
                to={`/help/${c.slug}`}
                className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${category === c.slug ? 'bg-stone-200 text-stone-900' : 'text-stone-600 hover:bg-stone-100'}`}
              >
                {c.title}
              </Link>
            ))}
          </div>

          <div className="md:col-span-3">
            <h2 className="text-2xl font-serif font-bold text-stone-900 mb-6">
              {debouncedQuery ? 'Search Results' : category ? categories.find(c => c.slug === category)?.title : 'Suggested Articles'}
            </h2>
            
            {loading ? (
              <div className="text-stone-500">Loading articles...</div>
            ) : (
              <div className="grid gap-4">
                {articles.map(article => (
                  <Link 
                    key={article.id}
                    to={`/help/article/${article.slug}`}
                    className="bg-white border border-stone-200 rounded-xl p-6 hover:border-brand-primary hover:shadow-md transition-all group flex gap-4"
                  >
                    <div className="bg-stone-50 p-3 rounded-lg h-fit">
                      <Book className="w-6 h-6 text-stone-400 group-hover:text-brand-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-stone-900 group-hover:text-brand-primary transition-colors mb-2">
                        {article.title}
                      </h3>
                      <p className="text-stone-500 line-clamp-2">
                        {article.summary || article.excerpt || ''}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-stone-300 self-center group-hover:text-brand-primary group-hover:translate-x-1 transition-all" />
                  </Link>
                ))}
                {articles.length === 0 && (
                  <div className="text-stone-500 bg-white border border-stone-200 rounded-xl p-8 text-center">
                    No articles found matching your criteria.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
