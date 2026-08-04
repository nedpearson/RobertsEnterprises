import { requestClient } from './client';
import type { ChatChannel, ChatMessage, PaginatedResponse } from './types';

export async function getChannels(page?: number, limit?: number): Promise<PaginatedResponse<ChatChannel>> {
  return requestClient<PaginatedResponse<ChatChannel>>('/chat/channels', {
    params: { page, limit },
  });
}

export async function createChannel(name: string, boutiqueId?: number): Promise<ChatChannel> {
  return requestClient<ChatChannel>('/chat/channels', {
    method: 'POST',
    body: JSON.stringify({ name, boutique_id: boutiqueId }),
  });
}

export async function getChannelMessages(channelId: number, page?: number, limit?: number): Promise<PaginatedResponse<ChatMessage>> {
  return requestClient<PaginatedResponse<ChatMessage>>(`/chat/channels/${channelId}/messages`, {
    params: { page, limit },
  });
}

export async function sendChannelMessage(channelId: number, body: string, authorId: number): Promise<ChatMessage> {
  return requestClient<ChatMessage>(`/chat/channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body, author_id: authorId }),
  });
}
