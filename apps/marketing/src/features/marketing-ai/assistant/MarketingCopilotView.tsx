import { useState } from 'react';
import { askMarketingCopilot } from '../api/marketingAIApi';
import { Bot, Send, Sparkles, ShieldCheck, CheckCircle2, FileText, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { btnPrimary, btnSecondary } from '@/components/vowos/ui';

interface MarketingCopilotViewProps {
  brandFilter: string;
}

export default function MarketingCopilotView({ brandFilter }: MarketingCopilotViewProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<any>>([
    {
      id: 'm0',
      role: 'assistant',
      content: `Hello Ramsey! I am your VowOS Executive Marketing Assistant for ${brandFilter}. Ask me anything about campaign performance, gross profit optimization, creative fatigue, budget allocations, or competitor intelligence.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      citations: ['VowOS Database', 'Proper & Co Ledger']
    }
  ]);
  const [pendingAction, setPendingAction] = useState<any>(null);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput('');

    const userMsg = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await askMarketingCopilot(userText, brandFilter);
      setMessages(prev => [...prev, res]);
      if (res.actionPreview?.requiresConfirmation) {
        setPendingAction(res.actionPreview);
      }
    } catch (e) {
      toast({ title: 'Copilot Error', description: 'Could not fetch response', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = () => {
    toast({ title: 'Action Dispatched', description: `Executing: ${pendingAction.description}` });
    setPendingAction(null);
  };

  return (
    <div className="space-y-6 select-none max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Bot className="h-6 w-6 text-purple-600" />
            Executive Marketing Copilot
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">Grounded NLP Assistant with audit trails &amp; confirmation controls.</p>
        </div>
        <div className="flex items-center gap-2 bg-purple-50 text-purple-900 px-3 py-1.5 rounded-full text-xs font-semibold border border-purple-200">
          <ShieldCheck className="h-4 w-4 text-purple-600" /> Grounded in VowOS Ledger
        </div>
      </div>

      {/* Messages Feed */}
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 space-y-4 min-h-[420px] max-h-[550px] overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-2xl rounded-2xl p-4 text-sm shadow-xs ${
                m.role === 'user'
                  ? 'bg-stone-900 text-white rounded-br-none'
                  : 'bg-white text-stone-800 border border-stone-200 rounded-bl-none'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] opacity-70 mb-1">
                <span className="font-bold uppercase tracking-wider">{m.role === 'user' ? 'You' : 'Copilot AI'}</span>
                <span>{m.timestamp}</span>
              </div>
              <div className="whitespace-pre-line leading-relaxed">{m.content}</div>

              {m.citations && (
                <div className="mt-3 pt-2 border-t border-stone-200/60 text-[10px] text-stone-500 flex items-center gap-2 flex-wrap">
                  <FileText className="h-3 w-3" /> Grounded Citations:
                  {m.citations.map((c: string, idx: number) => (
                    <span key={idx} className="bg-stone-100 px-2 py-0.5 rounded font-mono text-stone-700">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-stone-200 rounded-2xl p-4 text-xs font-semibold text-purple-700 flex items-center gap-2 animate-pulse">
              <Sparkles className="h-4 w-4 text-purple-600 animate-spin" /> Analyzing knowledge graph and campaign metrics...
            </div>
          </div>
        )}
      </div>

      {/* Pending Action Preview Modal / Card */}
      {pendingAction && (
        <div className="rounded-2xl border-2 border-purple-500 bg-purple-500/10 p-5 text-purple-950 shadow-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-purple-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-sm text-purple-950 uppercase tracking-wide">Action Confirmation Required</h4>
              <p className="text-xs text-purple-900 mt-1 font-medium">{pendingAction.description}</p>
              <p className="text-[11px] text-purple-700 mt-0.5">Financial Exposure: ${(pendingAction.financialExposureCents / 100).toLocaleString()}</p>
              <div className="flex gap-3 mt-4">
                <button onClick={handleConfirmAction} className={`${btnPrimary} bg-purple-600 hover:bg-purple-700 border-none text-white text-xs px-4 py-2`}>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" /> Authorize &amp; Execute
                </button>
                <button onClick={() => setPendingAction(null)} className={`${btnSecondary} text-xs px-4 py-2`}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input Box */}
      <div className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask Copilot e.g., 'What generated actual gross profit in Baton Rouge this month?'..."
          className="flex-1 bg-white border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
        />
        <button onClick={handleSend} disabled={loading} className={`${btnPrimary} px-6 bg-purple-600 hover:bg-purple-700`}>
          <Send className="h-4 w-4 mr-2" /> Ask
        </button>
      </div>
    </div>
  );
}
