import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import { inputCls } from '@/components/vowos/ui';

export function HelpAdminView() {
  const { userContext } = useAuth();
  const [articles, setArticles] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('DRAFT');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: articlesData }, { data: categoriesData }] = await Promise.all([
      supabase.from('help_articles').select('*, help_categories(title)').order('created_at', { ascending: false }),
      supabase.from('help_categories').select('*').order('sort_order', { ascending: true })
    ]);
    
    if (articlesData) setArticles(articlesData);
    if (categoriesData) setCategories(categoriesData);
    setLoading(false);
  };

  const handleEdit = (article: any) => {
    setEditingId(article.id);
    setTitle(article.title);
    setSlug(article.slug);
    setSummary(article.summary || '');
    setContent(article.content);
    setCategoryId(article.category_id || '');
    setStatus(article.status);
  };

  const handleCreate = () => {
    setEditingId('NEW');
    setTitle('');
    setSlug('');
    setSummary('');
    setContent('');
    setCategoryId('');
    setStatus('DRAFT');
  };

  const handleSave = async () => {
    try {
      const payload = {
        title,
        slug,
        summary,
        content,
        category_id: categoryId || null,
        category: categories.find(c => c.id === categoryId)?.title || 'Uncategorized',
        status,
        audience: 'EMPLOYEE',
      };

      if (editingId === 'NEW') {
        const { error } = await supabase.from('help_articles').insert([payload]);
        if (error) throw error;
        toast.success('Article created');
      } else {
        const { error } = await supabase.from('help_articles').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Article updated');
      }

      setEditingId(null);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Error saving article');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    try {
      const { error } = await supabase.from('help_articles').delete().eq('id', id);
      if (error) throw error;
      toast.success('Article deleted');
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Error deleting article');
    }
  };

  if (userContext?.platform_role !== 'PLATFORM_OWNER') {
    return <div className="p-8 text-center text-stone-500">You do not have permission to manage the knowledge base.</div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif text-stone-900">Knowledge Base CMS</h1>
          <p className="text-stone-500 mt-1">Manage global help articles and categories.</p>
        </div>
        <Button onClick={handleCreate} className="gap-2 bg-stone-900 text-white">
          <Plus className="h-4 w-4" /> New Article
        </Button>
      </div>

      {editingId && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 mb-8 space-y-4">
          <h2 className="text-lg font-semibold">{editingId === 'NEW' ? 'Create Article' : 'Edit Article'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase">Slug</label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-stone-500 uppercase">Summary</label>
              <Input value={summary} onChange={(e) => setSummary(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase">Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
                <option value="">Select Category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-stone-500 uppercase">Content (Markdown)</label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={15} className="w-full rounded-lg border-stone-200 font-mono text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-stone-900 text-white">Save Article</Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-stone-50 text-stone-500 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">Title</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {articles.map((article) => (
              <tr key={article.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-6 py-4 font-medium text-stone-900">{article.title}</td>
                <td className="px-6 py-4 text-stone-500">{article.help_categories?.title || article.category}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold uppercase ${
                    article.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {article.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(article)}><Edit className="h-4 w-4 text-stone-500" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(article.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </td>
              </tr>
            ))}
            {articles.length === 0 && !loading && (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-stone-500">No articles found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
