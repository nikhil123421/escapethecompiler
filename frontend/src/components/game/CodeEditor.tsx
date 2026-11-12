import { useMemo } from "react";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { EditorView, keymap } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";

import { cn } from "@/lib/cn";
import type { SupportedLanguage } from "@/types/api";

const LANG_OPTIONS: { id: SupportedLanguage; label: string }[] = [
  { id: "javascript", label: "JavaScript (ES2024)" },
  { id: "python", label: "Python 3" },
  { id: "cpp", label: "C++17" },
  { id: "java", label: "Java" },
];

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  readOnly?: boolean;
  className?: string;
  height?: string;
  language?: SupportedLanguage;
  onLanguageChange?: (lang: SupportedLanguage) => void;
}

export function CodeEditor({
  value,
  onChange,
  onRun,
  readOnly = false,
  className,
  height = "320px",
  language = "javascript",
  onLanguageChange,
}: CodeEditorProps) {
  const extensions = useMemo(() => {
    let langExt;
    if (language === "python") langExt = python();
    else if (language === "cpp") langExt = cpp();
    else if (language === "java") langExt = java();
    else langExt = javascript();

    const exts = [langExt, EditorView.lineWrapping];

    if (onRun) {
      exts.push(
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              onRun();
              return true;
            },
          },
        ]),
      );
    }

    return exts;
  }, [language, onRun]);

  return (
    <div
      className={cn(
        "relative rounded-xl border border-line bg-inset font-mono text-[13.5px] overflow-hidden focus-within:border-accent/40 focus-within:ring-1 focus-within:ring-accent/20 transition-all",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-line bg-elevated/70 px-4 py-2 text-xs">
        {onLanguageChange && !readOnly ? (
          <div className="flex items-center gap-2">
            <span className="mono-label text-faint">LANGUAGE:</span>
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
              className="rounded border border-line bg-surface px-2 py-0.5 font-mono text-xs text-ink focus:border-accent focus:outline-none"
            >
              {LANG_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <span className="mono-label text-faint">
            {LANG_OPTIONS.find((l) => l.id === language)?.label.toUpperCase() ?? language.toUpperCase()}
          </span>
        )}
        <span className="text-[11px] text-faint hidden sm:inline">
          Press <kbd className="rounded border border-line bg-surface px-1 py-0.5 text-[10px]">Ctrl/Cmd+Enter</kbd> to run
        </span>
      </div>
      <CodeMirror
        value={value}
        height={height}
        theme="dark"
        extensions={extensions}
        onChange={onChange}
        readOnly={readOnly}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          foldGutter: false,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          indentOnInput: true,
        }}
      />
    </div>
  );
}
