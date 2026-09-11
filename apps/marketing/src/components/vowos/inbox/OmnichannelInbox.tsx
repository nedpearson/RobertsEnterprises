import React, { useState, useEffect } from 'react';
import { Mail, MessageSquare, Phone, MoreVertical, Search, Filter } from 'lucide-react';
import { inputCls } from '@/components/vowos/ui';
import { supabase } from '@/lib/supabase';

interface Message {
  id: string;
  senderName: string;
  senderAvatar?: string;
  preview: string;
  timestamp: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'instagram' | 'facebook';
  brand: string;
  location: string;
  isRead: boolean;
}

export function OmnichannelInbox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    async function fetchMessages() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('omnichannel_inbox')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const formatted: Message[] = data.map((row: any) => ({
          id: row.id,
          senderName: row.sender_name || 'Unknown',
          preview: row.content || '',
          timestamp: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          channel: (row.message_type as any) || 'sms',
          brand: 'Roberts Bridal', // hardcoded defaults since missing from DB
          location: 'Main Store',
          isRead: row.status === 'read',
        }));
        setMessages(formatted);
        if (formatted.length > 0) setActiveMessageId(formatted[0].id);
      }
      setIsLoading(false);
    }
    fetchMessages();
  }, []);

  const activeMessage = messages.find((m) => m.id === activeMessageId);

  const handleSend = async () => {
    if (!replyText.trim() || !activeMessage) return;

    // Simulated reply insertion
    const { data, error } = await supabase
      .from('omnichannel_inbox')
      .insert({
        sender_name: 'Store Agent',
        content: replyText,
        message_type: activeMessage.channel,
        status: 'read',
      })
      .select()
      .single();

    if (data && !error) {
      const mappedMsg: Message = {
        id: data.id,
        senderName: data.sender_name || 'Store Agent',
        preview: data.content || '',
        timestamp: new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        channel: (data.message_type as any) || 'sms',
        brand: 'Roberts Bridal',
        location: 'Main Store',
        isRead: true,
      };
      setMessages((prev) => [mappedMsg, ...prev]);
      setActiveMessageId(mappedMsg.id);
      setReplyText('');
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
      {/* Left Sidebar - Message List */}
      <div className="w-1/3 border-r border-stone-200 flex flex-col bg-stone-50/50">
        <div className="p-4 border-b border-stone-200">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">Unified Inbox</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              className={`${inputCls} pl-9`}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-full text-stone-400">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="flex justify-center items-center h-full text-stone-400">No messages found.</div>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg.id}
                onClick={() => setActiveMessageId(msg.id)}
                className={`p-4 border-b border-stone-200 cursor-pointer hover:bg-stone-50 transition-colors ${activeMessageId === msg.id ? 'bg-stone-100 border-l-2 border-l-emerald-600' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`font-medium ${!msg.isRead ? 'text-stone-900' : 'text-stone-700'}`}>
                    {msg.senderName}
                  </span>
                  <span className="text-xs text-stone-500">{msg.timestamp}</span>
                </div>
                <p className="text-sm text-stone-500 line-clamp-1 mb-2">{msg.preview}</p>
                
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-stone-200 text-stone-700">
                    {msg.brand}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
                    {msg.location}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 capitalize">
                    {msg.channel}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Side - Message Detail */}
      <div className="flex-1 flex flex-col bg-white">
        {activeMessage ? (
          <>
            <div className="p-6 border-b border-stone-200 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold text-stone-900">{activeMessage.senderName}</h3>
                <div className="flex gap-2 mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-800">
                    Brand: {activeMessage.brand}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-800">
                    Location: {activeMessage.location}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-800 capitalize">
                    Via: {activeMessage.channel}
                  </span>
                </div>
              </div>
              <button className="p-2 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100">
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="flex items-start gap-4 mb-6">
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                  {activeMessage.senderName ? activeMessage.senderName.charAt(0) : '?'}
                </div>
                <div className="flex-1">
                  <div className="bg-stone-50 rounded-2xl rounded-tl-none p-4 text-sm text-stone-700 whitespace-pre-wrap">
                    {activeMessage.preview}
                  </div>
                  <span className="text-xs text-stone-400 mt-1 block">{activeMessage.timestamp}</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-stone-200">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSend();
                  }}
                  placeholder={`Reply to ${activeMessage.senderName}...`}
                  className={`${inputCls} flex-1`}
                />
                <button 
                  onClick={handleSend}
                  disabled={!replyText.trim()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-400">
            <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
            <p>{isLoading ? 'Loading...' : 'Select a conversation to view'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
