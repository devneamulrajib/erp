import { useRef, useEffect } from 'react';
import {
  Bold, Italic, Highlighter, AlignLeft, AlignCenter, AlignRight,
  AlignJustify, List, ListOrdered, Indent, Outdent,
} from 'lucide-react';

// Lightweight contentEditable-based rich text editor — not TinyMCE, but gives
// the same toolbar/behavior shape (bold, italic, alignment, lists, indent).
export default function RichTextEditor({ value, onChange, placeholder }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exec(command, arg = null) {
    document.execCommand(command, false, arg);
    editorRef.current.focus();
    handleInput();
  }

  function handleInput() {
    if (onChange) onChange(editorRef.current.innerHTML);
  }

  const buttons = [
    { icon: Bold, cmd: 'bold' },
    { icon: Italic, cmd: 'italic' },
    { icon: Highlighter, cmd: 'hiliteColor', arg: '#fef08a' },
    { icon: AlignLeft, cmd: 'justifyLeft' },
    { icon: AlignCenter, cmd: 'justifyCenter' },
    { icon: AlignRight, cmd: 'justifyRight' },
    { icon: AlignJustify, cmd: 'justifyFull' },
    { icon: List, cmd: 'insertUnorderedList' },
    { icon: ListOrdered, cmd: 'insertOrderedList' },
    { icon: Outdent, cmd: 'outdent' },
    { icon: Indent, cmd: 'indent' },
  ];

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-200 bg-gray-50 flex-wrap">
        {buttons.map(({ icon: Icon, cmd, arg }, i) => (
          <button
            key={i}
            type="button"
            onClick={() => exec(cmd, arg)}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
          >
            <Icon size={14} />
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        data-placeholder={placeholder}
        className="min-h-[140px] px-3 py-2 text-sm focus:outline-none rt-editor"
        suppressContentEditableWarning
      />
      <style>{`
        .rt-editor:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}