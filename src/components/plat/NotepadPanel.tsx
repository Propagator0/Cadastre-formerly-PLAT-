'use client';

import { useState, useEffect, useRef } from 'react';
import { usePlat } from '@/lib/plat/store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, NotebookPen, Check } from 'lucide-react';

interface NotepadPanelProps {
  onClose: () => void;
}

export function NotepadPanel({ onClose }: NotepadPanelProps) {
  const notepad = usePlat((s) => s.tower.notepad);
  const setNotepad = usePlat((s) => s.setNotepad);
  // Uncontrolled field: init from the store once, then track locally. We
  // DON'T sync from the store after mount — the store value only changes via
  // this panel (the single writer), so a controlled field would loop. The
  // debounce is inside setNotepad itself.
  const [val, setVal] = useState(notepad);
  const [savedFlash, setSavedFlash] = useState(false);
  // Track whether the user is actively typing — when they are, ignore store
  // updates so we don't fight their keystrokes.
  const typing = useRef(false);

  // If the store value changes externally (e.g. reset tower), sync the field
  // — but only if the user isn't actively typing. This is the legitimate
  // sync-external-into-local-state pattern; the lint rule fires by default.
  useEffect(() => {
    if (typing.current) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVal(notepad);
  }, [notepad]);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    typing.current = true;
    const v = e.target.value;
    setVal(v);
    setNotepad(v);
    setSavedFlash(true);
    // Re-enable store-sync after the debounce window passes.
    window.setTimeout(() => { typing.current = false; }, 800);
    // Flash "saved" briefly to confirm autosave.
    window.setTimeout(() => setSavedFlash(false), 1200);
  };

  const wordCount = val.trim() ? val.trim().split(/\s+/).length : 0;
  const lineCount = val ? val.split('\n').length : 0;

  return (
    <div className="flex h-full flex-col bg-[#1c1a17] text-[#efe9dc]">
      {/* header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <NotebookPen className="h-3.5 w-3.5 text-white/55" />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/65">
            notepad
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {savedFlash ? (
            <span className="flex items-center gap-1 font-mono text-[9px] text-[#9bc59e]">
              <Check className="h-2.5 w-2.5" />
              saved
            </span>
          ) : (
            <span className="font-mono text-[9px] text-white/30">
              autosaves
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 text-white/40 hover:text-white/70 hover:bg-white/5"
            title="close notepad"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* the textarea — fills the panel */}
      <div className="flex-1 p-2.5 min-h-0">
        <Textarea
          value={val}
          onChange={onChange}
          placeholder={
            'project-level scratchpad.\n\nwhat is this city for? what is the next thing to build? what is blocking me?\n\n(this autosaves — no need to commit.)'
          }
          className="h-full w-full resize-none bg-white/5 border-white/10 text-[11.5px] leading-relaxed text-white/85 placeholder:text-white/30 font-mono focus-visible:border-white/25 focus-visible:ring-0"
          style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
        />
      </div>

      {/* footer with metadata */}
      <div className="px-3 py-1.5 border-t border-white/10 flex items-center justify-between">
        <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-white/25">
          {wordCount} words · {lineCount} lines
        </span>
        <span className="font-mono text-[8.5px] text-white/25 italic">
          stored on the tower
        </span>
      </div>
    </div>
  );
}
