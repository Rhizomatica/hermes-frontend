export interface Message {
  id: number;
  inbox: boolean;
  draft: boolean;
  orig: string;
  dest: string[] | string;
  name: string;
  text: string | null;
  file: string | null;
  fileid: string | null;
  mimetype: string | null;
  secure: boolean;
  sent_at: string;
}

/** Normalize dest to always be an array */
export function destArray(dest: Message['dest']): string[] {
  if (Array.isArray(dest)) return dest;
  if (typeof dest === 'string') return dest ? [dest] : [];
  return [];
}
