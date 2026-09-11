import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { ThumbsUp, ThumbsDown, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function HelpArticleView({ slug }: { slug: string }) {
  const { user, userContext } = useAuth();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('help_articles')
        .select('*')
        .eq('slug', slug)
        .single();
      
      if (data) {
        setArticle(data);
      }
      setLoading(false);
    }
    if (slug) load();
  }, [slug]);

  const handleFeedback = async (isHelpful: boolean) => {
    if (!article) return;
    try {
      const { error } = await supabase.from('help_article_feedback').insert({
        article_id: article.id,
        is_helpful: isHelpful,
        user_id: user?.id || userContext?.id || null
      });
      if (error) throw error;
      setFeedbackSubmitted(true);
      toast.success('Thanks for your feedback!');
    } catch (e) {
      toast.error('Failed to submit feedback.');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-stone-500">Loading article...</div>;
  }

  if (!article) {
    return <div className="p-8 text-center text-stone-500">Article not found.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-8 bg-stone-50 min-h-full">
      <h1 className="text-3xl font-serif font-bold text-stone-900 mb-4">{article.title}</h1>
      
      <div className="flex flex-wrap items-center gap-4 text-sm text-stone-500 mb-8 border-b border-stone-200 pb-4">
        {article.read_time_minutes && (
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{article.read_time_minutes} min read</span>
          </div>
        )}
        {article.last_reviewed_at && (
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>Updated {format(new Date(article.last_reviewed_at), 'MMM d, yyyy')}</span>
          </div>
        )}
      </div>

      <div className="prose prose-stone prose-headings:font-serif max-w-none mb-12">
        <ReactMarkdown>{article.content || ''}</ReactMarkdown>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-6 text-center shadow-sm">
        <h3 className="font-bold text-stone-900 mb-4">Was this article helpful?</h3>
        {feedbackSubmitted ? (
          <p className="text-stone-500">Thank you for your feedback!</p>
        ) : (
          <div className="flex justify-center gap-4">
            <Button variant="outline" className="gap-2" onClick={() => handleFeedback(true)}>
              <ThumbsUp className="w-4 h-4" /> Yes
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => handleFeedback(false)}>
              <ThumbsDown className="w-4 h-4" /> No
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
