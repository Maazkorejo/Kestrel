import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Bot,
  ShieldCheck,
  Sparkles,
  ArrowUp,
  Copy,
  Check,
  ChevronDown,
  X,
  RefreshCw,
  Circle,
  Activity,
  FileCode2,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from './controls';
import type { Finding } from './data';
import { patchSnippet } from './data';
import { cn } from '@/lib/utils';
import { askAi } from '@/lib/api';

export type LogEntry = { time: string; level: string; message: string };

export function RightInspector({
  tab,
  setTab,
  onClose,
  finding,
  findings,
  onFix,
  onAction,
  logs,
  clearLogs,
  scanning,
  activeCode,
}: {
  tab: string;
  setTab: (tab: string) => void;
  onClose: () => void;
  finding: Finding | undefined;
  findings: Finding[];
  onFix: () => void;
  onAction: (action: string) => void;
  logs: LogEntry[];
  clearLogs: () => void;
  scanning: boolean;
  activeCode?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [thinking, setThinking] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (tab === 'AI Chat') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [tab]);

  const ask = async (prompt: string) => {
    if (!prompt.trim() || thinking) return;
    setMessages(old => [...old, { role: 'user', text: prompt }]);
    setQuestion('');
    setThinking(true);

    try {
      const res = await askAi({
        question: prompt,
        code: activeCode || '',
        filename: finding?.file || 'src/inference.py',
        finding_title: finding?.title || 'Security Vulnerability',
        cwe_id: finding?.cwe || 'CWE-78',
        line_number: finding?.line || 48,
      });
      setMessages(old => [...old, { role: 'assistant', text: res.answer }]);
    } catch {
      const text = prompt.toLowerCase().includes('exploit')
        ? `**Exploit path (analysis)**\n\nAn attacker can supply shell metacharacters in \`source_ip\`. With \`shell=True\`, the operating system interprets the string as a command.\n\n- Source: incoming API request\n- Sink: \`subprocess.check_output()\`\n- Impact: arbitrary command execution\n\nUse an argument list and validate the IP address. You can verify the change in the sandbox.`
        : `**Suggested fix (analysis)**\n\n${finding?.description ?? 'No active vulnerability. Your current file is clean.'}\n\nUse **strict input validation** and pass commands as argument arrays. Avoid shell interpretation and enforce a timeout.\n\nThe proposed patch addresses ${finding?.cwe ?? 'the selected finding'} without changing the prediction pipeline.`;
      setMessages(old => [...old, { role: 'assistant', text }]);
    } finally {
      setThinking(false);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }, [messages, thinking]);

  return (
    <aside className="right-inspector">
      <div className="inspector-heading">
        <Activity size={14} className="text-muted-foreground" />
        <span>AI Assistant</span>
        <IconButton label="Close Inspector" icon={X} onClick={onClose} className="ml-auto" />
      </div>

      <div className="inspector-tabs" role="tablist">
        {['AI Chat', 'Activity', 'Overview'].map(t => (
          <Button
            key={t}
            role="tab"
            aria-selected={tab === t}
            variant="ghost"
            className={cn('inspector-tab', tab === t && 'active')}
            onClick={() => setTab(t)}
          >
            {t === 'AI Chat' && <Sparkles size={13} />}
            {t}
          </Button>
        ))}
      </div>

      {tab === 'AI Chat' && (
        <>
          <div className="ai-scroll" ref={scrollRef}>
            <div className="assistant-identity">
              <span className="assistant-avatar">
                <Bot size={18} />
              </span>
              <div>
                <span className="text-xs font-medium">Kestrel AI</span>
                <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  <span className="status-dot" />
                  Security assistant <span className="demo-label">NVIDIA NEMOTRON</span>
                </div>
              </div>
              <IconButton label="Clear Conversation" icon={RefreshCw} onClick={() => setMessages([])} className="ml-auto" />
            </div>

            {scanning ? (
              <div className="context-box">
                <Sparkles size={14} className="animate-spin text-primary" />
                <span>Analyzing active file…</span>
              </div>
            ) : (
              <div className="context-box">
                <div className="flex items-center gap-2">
                  <FileCode2 size={13} />
                  <span className="text-[10px] text-muted-foreground">SELECTED CODE</span>
                </div>
                <div className="font-mono text-[11px] mt-2 text-foreground">
                  {finding ? `${finding.file}:${finding.line}` : 'Workspace · no active finding'}
                </div>
                {finding && (
                  <div className="flex gap-2 mt-2 items-center">
                    <span className={cn('severity', finding.severity === 'HIGH' ? 'high' : 'medium')}>
                      {finding.severity}
                    </span>
                    <span className="text-[11px]">
                      {finding.cwe} · {finding.title}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="ai-message">
              <div className="message-byline">
                <Sparkles size={13} className="text-primary" />
                <span>Kestrel AI</span>
                <span className="ml-auto text-[10px] text-muted-foreground">14:32</span>
              </div>
              <div className="markdown">
                <p>
                  {finding ? (
                    <>
                      I found <strong className="text-danger">{finding.title.toLowerCase()}</strong> in your code.
                    </>
                  ) : (
                    <>No open issues in this file.</>
                  )}
                </p>
                <p>{finding?.description ?? 'Select another file to review its security issues.'}</p>
                <div className="ai-reference">
                  <ShieldCheck size={13} />
                  <span>{finding?.cwe ?? 'No issues'}</span>
                  <span className="text-muted-foreground">{finding?.title ?? 'File clean'}</span>
                </div>
                <p>
                  {finding?.cwe === 'CWE-78' ? (
                    <>
                      Validate the IP address and pass arguments without <code>shell=True</code>.
                    </>
                  ) : finding ? (
                    'Review the suggested change before applying it.'
                  ) : (
                    'All reported issues for this file have been resolved.'
                  )}
                </p>
              </div>

              {finding?.cwe === 'CWE-78' && (
                <div className="ai-code">
                  <div className="code-heading">
                    <span>python</span>
                    <IconButton
                      label="Copy Secure Code"
                      icon={copied ? Check : Copy}
                      onClick={() => {
                        navigator.clipboard.writeText(patchSnippet);
                        setCopied(true);
                        window.setTimeout(() => setCopied(false), 1600);
                      }}
                    />
                  </div>
                  <pre>{patchSnippet}</pre>
                </div>
              )}

              <Button size="sm" className="review-patch" disabled={!finding} onClick={onFix}>
                <Sparkles size={14} />
                Review AI Patch
                <ArrowUpRight size={13} className="ml-auto" />
              </Button>
              <div className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                <ShieldCheck size={11} />
                Suggested fix · review before applying
              </div>
            </div>

            <div className="quick-questions">
              <div className="micro-label mb-2">FOLLOW-UP QUESTIONS</div>
              {['Why is this line vulnerable?', 'How can an attacker exploit this?', 'Show recommended secure code'].map(
                q => (
                  <Button key={q} variant="outline" className="quick-question" onClick={() => ask(q)}>
                    {q}
                    <ArrowUpRight size={12} className="ml-auto" />
                  </Button>
                )
              )}
            </div>

            {messages.map((m, i) => (
              <div
                key={i}
                className={cn('ai-message conversation-message', m.role === 'user' && 'user-message')}
              >
                <div className="message-byline">
                  {m.role === 'assistant' ? <Sparkles size={12} className="text-primary" /> : <Circle size={10} />}
                  <span>{m.role === 'assistant' ? 'Kestrel AI' : 'You'}</span>
                </div>
                <div className="markdown">
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                </div>
                {m.role === 'assistant' && (
                  <Button variant="outline" size="sm" onClick={onFix}>
                    Review patch
                  </Button>
                )}
              </div>
            ))}

            {thinking && (
              <div className="p-4 text-xs text-muted-foreground flex gap-2">
                <Sparkles size={13} className="animate-spin" />
                Analyzing vulnerability…
              </div>
            )}
          </div>

          <form
            className="ai-input-area"
            onSubmit={e => {
              e.preventDefault();
              ask(question);
            }}
          >
            <textarea
              ref={inputRef}
              aria-label="Ask AI"
              placeholder="Ask about this vulnerability…"
              value={question}
              onChange={e => setQuestion(e.target.value)}
            />
            <div className="flex items-center">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <ShieldCheck size={11} />
                Context-aware
                <ChevronDown size={11} />
              </span>
              <Button
                type="submit"
                size="icon"
                disabled={!question.trim() || thinking}
                className="ml-auto h-6 w-6"
                aria-label="Send Message"
              >
                <ArrowUp size={14} />
              </Button>
            </div>
            <span className="ai-disclaimer">NVIDIA Nemotron powered · verify generated changes</span>
          </form>
        </>
      )}

      {tab === 'Activity' && (
        <div className="p-3 overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="micro-label">WORKSPACE EVENT STREAM</span>
            <Button size="sm" variant="ghost" onClick={clearLogs}>
              Clear
            </Button>
          </div>
          {logs.map((log, i) => (
            <div className="log-row" key={i}>
              <span className="text-muted-foreground">{log.time}</span>
              <span className={log.level === 'WARN' ? 'text-warning' : 'text-info'}>{log.level}</span>
              <span>{log.message}</span>
            </div>
          ))}
          {!logs.length && <p className="text-xs text-muted-foreground">No events recorded</p>}
        </div>
      )}

      {tab === 'Overview' && (
        <div className="metrics-view">
          <div className="micro-label">REPOSITORY SECURITY SCORE</div>
          <div className="metric-score">
            {findings.length ? 87 : 100}
            <span>/ 100</span>
            <ShieldCheck size={28} className="text-primary ml-auto" />
          </div>
          <div className="metric-track">
            <span className="bg-primary" style={{ width: `${findings.length ? 87 : 100}%` }} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            {findings.length ? 'Good health · remediation recommended' : 'All reported findings resolved'}
          </p>
          <div className="micro-label mt-7 mb-3">SEVERITY BREAKDOWN</div>
          {['Critical', 'High', 'Medium', 'Low'].map(s => (
            <div className="metric-row" key={s}>
              <span
                className={
                  s === 'High' || s === 'Critical'
                    ? 'text-danger'
                    : s === 'Medium'
                    ? 'text-warning'
                    : 'text-info'
                }
              >
                ●
              </span>
              <span>{s}</span>
              <span className="ml-auto font-mono">
                {findings.filter(f => f.severity === s.toUpperCase()).length}
              </span>
            </div>
          ))}
          <div className="micro-label mt-7 mb-4">CATEGORY DISTRIBUTION</div>
          {['Injection', 'Secrets', 'Containers', 'Cryptography', 'Deserialization'].map((c, i) => (
            <div className="mb-4" key={c}>
              <div className="flex text-xs mb-2">
                <span>{c}</span>
                <span className="ml-auto text-muted-foreground">{i < 4 && findings.length ? 1 : 0}</span>
              </div>
              <div className="metric-track">
                <span
                  className={i === 0 ? 'bg-danger' : i === 1 ? 'bg-warning' : 'bg-info'}
                  style={{ width: `${i < 4 && findings.length ? 45 - i * 7 : 0}%` }}
                />
              </div>
            </div>
          ))}
          <div className="text-[10px] text-muted-foreground mt-6">Sample telemetry · last audit active</div>
          <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => onAction('audit')}>
            <RefreshCw size={13} />
            Refresh audit
          </Button>
        </div>
      )}
    </aside>
  );
}
