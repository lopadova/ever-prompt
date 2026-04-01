import { useCallback } from 'react';
import { toast } from 'sonner';

export function useClipboard() {
  const copy = useCallback(async (text: string, label = 'Content') => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      // Fallback for non-secure contexts
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast.success(`${label} copied to clipboard`);
    }
  }, []);

  return { copy };
}
