export interface Message {
  id: number;
  body: string;
  orig: string;
  dest: string;
  time: string;
  inbox: boolean;
}

export const sampleMessages: Message[] = [
  { id: 1, body: 'Hello, this is a test message.', orig: 'XZ1ABC', dest: 'mycall', time: '2026-08-06T12:00:00Z', inbox: true },
  { id: 2, body: 'GPS position updated: 23.45S, 46.78W', orig: 'mycall', dest: 'XZ1ABC', time: '2026-08-06T12:05:00Z', inbox: false },
];