import { useState, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { Copy, Check, Pencil, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClipboard } from '@/hooks/use-clipboard';
import { cn } from '@/lib/utils';

interface PromptEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  className?: string;
}

export function PromptEditor({
  value,
  onChange,
  readOnly: defaultReadOnly = true,
  className,
}: PromptEditorProps) {
  const [isEditing, setIsEditing] = useState(!defaultReadOnly);
  const [copied, setCopied] = useState(false);
  const { copy } = useClipboard();
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;
  const lineCount = value.split('\n').length;

  const handleCopy = async () => {
    await copy(value, 'Prompt');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  return (
    <div className={cn('rounded-lg border border-zinc-800 overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-3 py-1.5">
        <div className="flex items-center gap-2">
          {defaultReadOnly && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[11px]"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Read-only
                </>
              ) : (
                <>
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </>
              )}
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[11px]"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 mr-1 text-green-400" />
              <span className="text-green-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Editor */}
      <Editor
        height="300px"
        defaultLanguage="markdown"
        value={value}
        onChange={(v) => onChange?.(v ?? '')}
        onMount={handleEditorMount}
        theme="vs-dark"
        options={{
          readOnly: !isEditing,
          minimap: { enabled: false },
          lineNumbers: 'on',
          fontSize: 13,
          fontFamily: 'JetBrains Mono, monospace',
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: 'none',
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          scrollbar: {
            vertical: 'auto',
            horizontal: 'hidden',
            verticalScrollbarSize: 6,
          },
          domReadOnly: !isEditing,
          contextmenu: false,
        }}
      />

      {/* Footer stats */}
      <div className="flex items-center gap-4 border-t border-zinc-800 bg-zinc-900/50 px-3 py-1">
        <span className="text-[10px] text-zinc-600 tabular-nums">
          {lineCount} {lineCount === 1 ? 'line' : 'lines'}
        </span>
        <span className="text-[10px] text-zinc-600 tabular-nums">
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </span>
        <span className="text-[10px] text-zinc-600 tabular-nums">
          {charCount} {charCount === 1 ? 'char' : 'chars'}
        </span>
      </div>
    </div>
  );
}
