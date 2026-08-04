import { requestClient } from './client';

export async function processVoiceText(transcript: string): Promise<any> {
  return requestClient<any>('/voice/process', {
    method: 'POST',
    body: JSON.stringify({ transcript }),
  });
}

export async function executeVoiceCommand(intent: string, params: any, authorId?: number): Promise<any> {
  return requestClient<any>('/voice/execute', {
    method: 'POST',
    body: JSON.stringify({ intent, params, author_id: authorId }),
  });
}
