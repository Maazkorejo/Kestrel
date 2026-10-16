import Editor, { DiffEditor, loader, type OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker.js?worker';
import { useEffect, useRef } from 'react';
import type { Finding, EditorSettings } from './data';
import { languageFor } from './data';

function tokenColor(name: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 1; canvas.height = 1;
  const context = canvas.getContext('2d');
  if (!context) return '#808080';
  context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return '#' + [r, g, b].map(v => (v ?? 0).toString(16).padStart(2, '0')).join('');
}

function defineEditorTheme(monacoInstance?: typeof monaco) {
  const m = monacoInstance || monaco;
  m.editor.defineTheme('secstudio', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: tokenColor('--syntax-comment').slice(1) },
      { token: 'keyword', foreground: tokenColor('--syntax-keyword').slice(1) },
      { token: 'string', foreground: tokenColor('--syntax-string').slice(1) },
      { token: 'number', foreground: tokenColor('--syntax-number').slice(1) },
    ],
    colors: {
      'editor.background': tokenColor('--editor'),
      'editor.foreground': tokenColor('--foreground'),
      'editorLineNumber.foreground': tokenColor('--text-dim'),
      'editorLineNumber.activeForeground': tokenColor('--foreground'),
      'editor.lineHighlightBackground': tokenColor('--muted'),
      'editor.selectionBackground': tokenColor('--selected'),
      'editorGutter.background': tokenColor('--editor'),
      'editorCursor.foreground': tokenColor('--foreground'),
      'editorIndentGuide.background1': tokenColor('--border'),
      'editorError.foreground': tokenColor('--danger'),
      'editorOverviewRuler.border': tokenColor('--editor'),
      'minimap.background': tokenColor('--editor'),
      'diffEditor.insertedTextBackground': '#10b98133',
      'diffEditor.removedTextBackground': '#ef444433',
      'diffEditor.insertedLineBackground': '#10b98122',
      'diffEditor.removedLineBackground': '#ef444422',
    },
  });
}

function initializeEditor() {
  self.MonacoEnvironment = {
    getWorker(_id, label) {
      return label === 'json' ? new JsonWorker() : new EditorWorker();
    },
  };
  loader.config({ monaco });
  defineEditorTheme();
}

initializeEditor();

for (const language of ['yara', 'snort']) {
  if (!monaco.languages.getLanguages().some(item => item.id === language)) {
    monaco.languages.register({ id: language });
    monaco.languages.setMonarchTokensProvider(language, {
      tokenizer: {
        root: [
          [/\b(rule|meta|strings|condition|any|of|them|alert|tcp|udp|msg|sid|rev)\b/, 'keyword'],
          [/".*?"/, 'string'],
          [/\/\/.*$/, 'comment'],
          [/\d+/, 'number'],
        ],
      },
    });
  }
}

export default function CodeEditor({
  path,
  value,
  onChange,
  findings,
  line,
  settings,
  onCursor,
  onFix,
  onSave,
}: {
  path: string;
  value: string;
  onChange: (value: string) => void;
  findings: Finding[];
  line: number;
  settings: EditorSettings;
  onCursor: (line: number, column: number) => void;
  onFix: () => void;
  onSave?: () => void;
}) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorations = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const fixRef = useRef(onFix);
  fixRef.current = onFix;
  const cursorRef = useRef(onCursor);
  cursorRef.current = onCursor;
  const saveRef = useRef(onSave);
  saveRef.current = onSave;

  const updateIndicators = (editor: monaco.editor.IStandaloneCodeEditor) => {
    const model = editor.getModel();
    if (!model) return;
    const active = findings.filter(f => f.file === path && f.line <= model.getLineCount());
    monaco.editor.setModelMarkers(
      model,
      'secstudio',
      active.map(f => ({
        startLineNumber: f.line,
        endLineNumber: f.line,
        startColumn: 1,
        endColumn: model.getLineMaxColumn(f.line),
        message: `${f.title} · ${f.cwe}\n${f.description}\nReview AI Patch to resolve this issue.`,
        severity: f.severity === 'HIGH' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
      }))
    );
    decorations.current?.set(
      active.map(f => ({
        range: new monaco.Range(f.line, 1, f.line, model.getLineMaxColumn(f.line)),
        options: {
          isWholeLine: true,
          className: 'vulnerable-line',
          inlineClassName: 'vulnerable-inline',
          glyphMarginClassName: 'vulnerable-glyph',
          lineNumberClassName: 'vulnerable-line-number',
          hoverMessage: { value: `**${f.title}**\n\n${f.description}` },
          overviewRuler: { color: tokenColor('--danger'), position: monaco.editor.OverviewRulerLane.Full },
        },
      }))
    );
  };

  useEffect(() => {
    if (editorRef.current) updateIndicators(editorRef.current);
  }, [findings, path, value]);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && line) {
      editor.revealLineInCenter(
        line,
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? monaco.editor.ScrollType.Immediate
          : monaco.editor.ScrollType.Smooth
      );
      editor.setPosition({ lineNumber: line, column: 5 });
    }
  }, [line, path]);

  useEffect(() => {
    const provider = monaco.languages.registerCodeActionProvider('python', {
      provideCodeActions(model, range) {
        const markers = monaco.editor
          .getModelMarkers({ resource: model.uri })
          .filter(m => m.startLineNumber === range.startLineNumber);
        return {
          actions: markers.map(m => ({
            title: 'Review AI Patch',
            kind: 'quickfix',
            diagnostics: [m],
            isPreferred: true,
            command: { id: 'secstudio.patch', title: 'AI Patch' },
          })),
          dispose() {},
        };
      },
    });
    return () => provider.dispose();
  }, []);

  const onMount: OnMount = editor => {
    editorRef.current = editor;
    decorations.current = editor.createDecorationsCollection();
    editor.addAction({
      id: 'secstudio.patch',
      label: 'Review AI Patch',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Period],
      run: () => fixRef.current(),
    });
    editor.addAction({
      id: 'secstudio.save',
      label: 'Save File to Disk',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => saveRef.current?.(),
    });
    editor.onDidChangeCursorPosition(e => cursorRef.current(e.position.lineNumber, e.position.column));
    if (line) {
      editor.revealLineInCenter(line);
      editor.setPosition({ lineNumber: line, column: 5 });
    }
    updateIndicators(editor);
  };

  return (
    <Editor
      theme="secstudio"
      path={path}
      value={value}
      language={languageFor(path)}
      onChange={v => onChange(v ?? '')}
      onMount={onMount}
      loading={<div className="text-muted-foreground text-xs p-4">Loading editor…</div>}
      options={{
        fontFamily: 'JetBrains Mono, Consolas, monospace',
        fontSize: settings.fontSize,
        lineHeight: 24,
        tabSize: settings.tabSize,
        minimap: { enabled: settings.minimap, maxColumn: 65, scale: 1 },
        wordWrap: settings.wordWrap ? 'on' : 'off',
        padding: { top: 16 },
        scrollBeyondLastLine: false,
        renderLineHighlight: 'all',
        smoothScrolling: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        glyphMargin: true,
        folding: true,
        automaticLayout: true,
        overviewRulerBorder: false,
        scrollbar: { verticalScrollbarSize: 7, horizontalScrollbarSize: 7 },
        bracketPairColorization: { enabled: true },
      }}
    />
  );
}

export function findVulnerableLine(code: string, cwe?: string): number {
  const lines = code.split('\n');
  if (cwe === 'CWE-78' || !cwe) {
    const idx = lines.findIndex(l => l.includes('shell=True') || l.includes('subprocess.check_output') || l.includes('f"ping'));
    if (idx !== -1) return idx + 1;
  }
  if (cwe === 'CWE-798') {
    const idx = lines.findIndex(l => l.includes('API_KEY =') || l.includes('demo_insecure_key'));
    if (idx !== -1) return idx + 1;
  }
  if (cwe === 'CWE-327') {
    const idx = lines.findIndex(l => l.includes('md5'));
    if (idx !== -1) return idx + 1;
  }
  if (cwe === 'CWE-1104' || cwe === 'CWE-250') {
    const idx = lines.findIndex(l => l.includes('FROM ') || l.includes('slim'));
    if (idx !== -1) return idx + 1;
  }
  return 48;
}

export function findPatchedLines(code: string, cwe?: string): { start: number; end: number } {
  const lines = code.split('\n');
  if (cwe === 'CWE-78' || !cwe) {
    const start = lines.findIndex(l => l.includes('import ipaddress') || l.includes('ipaddress.ip_address') || l.includes('shell=False'));
    if (start !== -1) {
      let end = start;
      while (
        end < lines.length &&
        (lines[end]?.includes('ipaddress') ||
          lines[end]?.includes('shell=False') ||
          lines[end]?.includes('subprocess') ||
          lines[end]?.includes('target') ||
          lines[end]?.includes('timeout='))
      ) {
        end++;
      }
      return { start: start + 1, end: Math.max(start + 1, end) };
    }
  }
  if (cwe === 'CWE-798') {
    const idx = lines.findIndex(l => l.includes('THREAT_INTEL_API_KEY'));
    if (idx !== -1) return { start: idx + 1, end: idx + 1 };
  }
  if (cwe === 'CWE-327') {
    const idx = lines.findIndex(l => l.includes('sha256'));
    if (idx !== -1) return { start: idx + 1, end: idx + 1 };
  }
  return { start: 48, end: 51 };
}

export function SecurityDiff({
  original,
  modified,
  vulnerableLine,
  finding,
}: {
  original: string;
  modified: string;
  vulnerableLine?: number | undefined;
  finding?: Finding | null | undefined;
}) {
  const diffRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const originalDecsRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const modifiedDecsRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const applyDecorations = (editor: monaco.editor.IStandaloneDiffEditor) => {
    const originalEditor = editor.getOriginalEditor();
    const modifiedEditor = editor.getModifiedEditor();
    if (!originalEditor || !modifiedEditor) return;

    const origLine = vulnerableLine || findVulnerableLine(original, finding?.cwe);
    const patchLines = findPatchedLines(modified, finding?.cwe);

    const origDecoration: monaco.editor.IModelDeltaDecoration = {
      range: new monaco.Range(origLine, 1, origLine, 1),
      options: {
        isWholeLine: true,
        className: 'monaco-vulnerable-line-highlight',
        glyphMarginClassName: 'monaco-vulnerable-glyph',
        linesDecorationsClassName: 'monaco-vulnerable-line-gutter',
        overviewRuler: {
          color: '#ef4444',
          position: monaco.editor.OverviewRulerLane.Full,
        },
        after: {
          content: '  ⚠️ VULNERABLE EXECUTION SINK',
          inlineClassName: 'monaco-vulnerable-inline-badge',
        },
        hoverMessage: {
          value: `### ⚠️ VULNERABLE LINE ${origLine} (${finding?.cwe || 'CWE-78'})\n**${finding?.title || 'Execution Sink Breached'}**\n${finding?.description || 'Untrusted input reaches shell execution without validation.'}`,
        },
      },
    };

    if (originalDecsRef.current) {
      originalDecsRef.current.set([origDecoration]);
    } else {
      originalDecsRef.current = originalEditor.createDecorationsCollection([origDecoration]);
    }

    const patchDecoration: monaco.editor.IModelDeltaDecoration = {
      range: new monaco.Range(patchLines.start, 1, patchLines.end, 1),
      options: {
        isWholeLine: true,
        className: 'monaco-patched-line-highlight',
        glyphMarginClassName: 'monaco-patched-glyph',
        linesDecorationsClassName: 'monaco-patched-line-gutter',
        overviewRuler: {
          color: '#10b981',
          position: monaco.editor.OverviewRulerLane.Full,
        },
        after: {
          content: '  🛡️ NEMOTRON DEFENSIVE PATCH',
          inlineClassName: 'monaco-patched-inline-badge',
        },
        hoverMessage: {
          value: `### 🛡️ NEMOTRON DEFENSIVE PATCH\nRemediated with strict validation and safe argument isolation.`,
        },
      },
    };

    if (modifiedDecsRef.current) {
      modifiedDecsRef.current.set([patchDecoration]);
    } else {
      modifiedDecsRef.current = modifiedEditor.createDecorationsCollection([patchDecoration]);
    }

    try {
      originalEditor.revealLineInCenter(origLine);
      modifiedEditor.revealLineInCenter(patchLines.start);
    } catch {}
  };

  useEffect(() => {
    return () => {
      const editor = diffRef.current;
      const models = editor?.getModel();
      editor?.setModel(null);
      models?.original?.dispose?.();
      models?.modified?.dispose?.();
    };
  }, []);

  useEffect(() => {
    if (diffRef.current) {
      applyDecorations(diffRef.current);
    }
  }, [original, modified, vulnerableLine, finding]);

  return (
    <DiffEditor
      beforeMount={defineEditorTheme}
      theme="secstudio"
      original={original}
      modified={modified}
      language="python"
      keepCurrentOriginalModel
      keepCurrentModifiedModel
      onMount={editor => {
        diffRef.current = editor;
        applyDecorations(editor);
      }}
      options={{
        readOnly: true,
        renderSideBySide: true,
        renderSideBySideInlineBreakpoint: 700,
        minimap: { enabled: false },
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 12,
        lineHeight: 22,
        lineNumbers: 'on',
        automaticLayout: true,
        scrollBeyondLastLine: false,
        glyphMargin: true,
        renderOverviewRuler: false,
        hideUnchangedRegions: { enabled: false },
        originalEditable: false,
        scrollbar: { verticalScrollbarSize: 7, horizontalScrollbarSize: 7 },
      }}
    />
  );
}
