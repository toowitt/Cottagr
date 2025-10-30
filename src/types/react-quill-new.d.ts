declare module 'react-quill-new' {
  import type { ComponentType } from 'react';

  export interface ReactQuillProps {
    theme?: string;
    value?: string;
    onChange?: (value: string, delta?: unknown, source?: unknown, editor?: unknown) => void;
    modules?: Record<string, unknown>;
    formats?: string[];
    placeholder?: string;
    className?: string;
  }

  const ReactQuill: ComponentType<ReactQuillProps>;

  export default ReactQuill;
}
