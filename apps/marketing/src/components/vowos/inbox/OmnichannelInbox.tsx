import React, { useState } from 'react';
import { Mail, MessageSquare, Phone, MoreVertical, Search, Filter } from 'lucide-react';
import { inputCls } from '@/components/vowos/ui';

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

const DUMMY_MESSAGES: Message[] = [
  {
    id: 'm1',
    senderName: 'Sarah Jenkins',
    preview: 'I am wondering if my alterations are ready?',
    timestamp: '10:42 AM',
    channel: 'sms',
    brand: 'Roberts Bridal',
    location: 'Downtown Flagship',
    isRead: false,
  },
  {
    id: 'm2',
    senderName: 'Amanda Clark',
    preview: 'Can I reschedule my fitting for next Tuesday?',
    timestamp: 'Yesterday',
    channel: 'email',
    brand: 'VowOS Boutique',
    location: 'Westside Mall',
    isRead: true,
  },
  {
    id: 'm3',
    senderName: 'Jessica Taylor',
    preview: 'Is this gown available in size 6?',
    timestamp: 'Yesterday',
    channel: 'instagram',
    brand: 'Roberts Bridal',
    location: 'Online Store',
    isRead: true,
  }
];

export function OmnichannelInbox() {
  const [activeMessageId, setActiveMessageId] = useState<string | null>(DUMMY_MESSAGES[0].id);
  
  const activeMessage = DUMMY_MESSAGES.find(m => m.id === activeMessageId);

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
          {DUMMY_MESSAGES.map((msg) => (
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
          ))}
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
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                  {activeMessage.senderName.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="bg-stone-50 rounded-2xl rounded-tl-none p-4 text-sm text-stone-700">
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
                  placeholder={`Reply to ${activeMessage.senderName}...`}
                  className={`${inputCls} flex-1`}
                />
                <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-400">
            <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
            <p>Select a conversation to view</p>
          </div>
        )}
      </div>
    </div>
  );
}
