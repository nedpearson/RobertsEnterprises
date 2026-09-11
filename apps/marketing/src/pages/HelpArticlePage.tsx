import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { HelpArticleView } from '@/features/support/components/HelpArticleView';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function HelpArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-stone-50 pt-8 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Help Center
        </Button>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-stone-200">
          <HelpArticleView slug={slug || ''} />
        </div>
      </div>
    </div>
  );
}
