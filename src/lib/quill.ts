let QuillConstructor: typeof import('quill').default | null = null;

export async function loadQuill() {
  if (typeof window === 'undefined') return null;
  if (QuillConstructor) return QuillConstructor;
  const QuillModule = await import('quill');
  QuillConstructor = QuillModule.default;
  return QuillConstructor;
}

export interface RichTextValue {
  html?: string;
  text?: string;
}
