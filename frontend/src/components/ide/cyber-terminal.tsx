import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useEffect, useRef } from 'react';
export default function CyberTerminal({ onCommand }: { onCommand: (command: string) => string | Promise<string> }) {
  const host = useRef<HTMLDivElement>(null); const callback = useRef(onCommand); callback.current = onCommand;
  useEffect(() => { if (!host.current) return; const terminal = new Terminal({ fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 12, lineHeight: 1.6, cursorBlink: true, theme: { background: '#0F0F10', foreground: '#CCCCCC', cursor: '#CCCCCC', green: '#22C55E', red: '#F14C4C', yellow: '#F59E0B', blue: '#3794FF' } }); const fit = new FitAddon(); terminal.loadAddon(fit); terminal.open(host.current);    fit.fit();
    terminal.writeln('\x1b[90mKestrel Cyber Terminal · live backend connected\x1b[0m');
    terminal.writeln('\x1b[32m✓\x1b[0m Ready. Type \x1b[36mhelp\x1b[0m for available security commands.');
    terminal.writeln('');
    const prompt = () => terminal.write('\x1b[32mkestrel\x1b[0m:\x1b[34m~\x1b[0m$ ');
    prompt(); let input = ''; terminal.onData(async data => { if (data === '\r') { terminal.writeln(''); const cmd = input.trim(); input = ''; if (cmd === 'clear') { terminal.clear(); prompt(); } else if (cmd) { try { const result = await callback.current(cmd); terminal.writeln(result.replaceAll('\n', '\r\n')); } catch (err: any) { terminal.writeln(`\x1b[31mError:\x1b[0m ${err?.message || err}`); } prompt(); } else { prompt(); } } else if (data === '\x7f') { if (input.length) { input = input.slice(0, -1); terminal.write('\b \b'); } } else if (data === '\x03') { input = ''; terminal.write('^C'); prompt(); } else if (!data.startsWith('\x1b')) { input += data; terminal.write(data); } }); const observer = new ResizeObserver(() => { try { fit.fit(); } catch {} }); observer.observe(host.current); return () => { observer.disconnect(); terminal.dispose(); }; }, []);
  return <div ref={host} className="terminal-host" />;
}
