import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  FilePlus2,
  FolderPlus,
  RefreshCw,
  MoreHorizontal,
  Folder,
  FolderOpen,
  Search,
  ShieldCheck,
  ShieldAlert,
  GitBranch,
  Check,
  Download,
  Package,
  Star,
  Network,
  TerminalSquare,
  Bot,
  ExternalLink,
  ArrowUpRight,
  Play,
  FileCode2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconButton, FileIcon } from './controls';
import { cn } from '@/lib/utils';
import type { Finding } from './data';

export type SidebarView =
  | 'Files'
  | 'Search'
  | 'Changes'
  | 'Vulnerabilities'
  | 'Extensions'
  | 'Threat Intelligence'
  | 'Tools';

export function PrimarySidebar({
  view,
  workspaceName = '',
  files,
  activeFile,
  openFile,
  findings,
  selectedFinding,
  selectFinding,
  onNew,
  onAction,
  installed,
  toggleExtension,
}: {
  view: SidebarView;
  workspaceName?: string;
  files: Record<string, string>;
  activeFile: string;
  openFile: (file: string, pin?: boolean) => void;
  findings: Finding[];
  selectedFinding: string;
  selectFinding: (finding: Finding) => void;
  onNew: (folder: boolean) => void;
  onAction: (action: string) => void;
  installed: string[];
  toggleExtension: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [replace, setReplace] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [word, setWord] = useState(false);
  const [regex, setRegex] = useState(false);
  const [commit, setCommit] = useState('');
  const [staged, setStaged] = useState<string[]>([]);
  const [committed, setCommitted] = useState(false);
  const [filter, setFilter] = useState('All');

  const toggle = (folder: string) =>
    setExpanded(old => (old.includes(folder) ? old.filter(f => f !== folder) : [...old, folder]));

  const tree = (parent: string, depth: number) => {
    const names = [
      ...new Set(
        Object.keys(files)
          .filter(p => p.startsWith(parent ? `${parent}/` : ''))
          .map(p => p.slice(parent ? parent.length + 1 : 0).split('/')[0] ?? '')
      ),
    ].sort((a, b) => {
      const af = !files[parent ? `${parent}/${a}` : a];
      const bf = !files[parent ? `${parent}/${b}` : b];
      return af === bf ? a.localeCompare(b) : af ? -1 : 1;
    });

    return names.map(name => {
      const path = parent ? `${parent}/${name}` : name;
      const isFolder = files[path] === undefined;
      const found = findings.filter(f => f.file === path);

      return (
        <div key={path}>
          <Button
            variant="ghost"
            className={cn('tree-row', activeFile === path && 'selected')}
            style={{ paddingLeft: 12 + depth * 16 }}
            onClick={() => (isFolder ? toggle(path) : openFile(path))}
            onDoubleClick={() => !isFolder && openFile(path, true)}
          >
            {isFolder ? (
              <>
                {expanded.includes(path) ? <ChevronDown className="tree-chevron" /> : <ChevronRight className="tree-chevron" />}
                {expanded.includes(path) ? <FolderOpen className="text-folder" /> : <Folder className="text-folder" />}
              </>
            ) : (
              <>
                <span className="w-3 shrink-0" />
                <FileIcon path={path} />
              </>
            )}
            <span
              className={cn(
                'truncate',
                found.some(f => f.severity === 'HIGH') && 'text-danger',
                found.some(f => f.severity === 'MEDIUM') && 'text-warning'
              )}
            >
              {name}
            </span>
            {found.length > 0 && (
              <span
                className={cn(
                  'ml-auto text-[11px]',
                  found.some(f => f.severity === 'HIGH') ? 'text-danger' : 'text-warning'
                )}
              >
                {found.length}
              </span>
            )}
          </Button>
          {isFolder && expanded.includes(path) && tree(path, depth + 1)}
        </div>
      );
    });
  };

  const results = Object.entries(files).flatMap(([file, code]) =>
    code.split('\n').flatMap((line, index) => {
      if (!search) return [];
      let matches = false;
      try {
        matches = regex
          ? new RegExp(search, matchCase ? '' : 'i').test(line)
          : word
          ? new RegExp(`\\b${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, matchCase ? '' : 'i').test(line)
          : (matchCase ? line : line.toLowerCase()).includes(matchCase ? search : search.toLowerCase());
      } catch {}
      return matches ? [{ file, line: index + 1, text: line.trim() }] : [];
    })
  );

  return (
    <aside className="primary-sidebar">
      <div className="sidebar-heading">
        <span>{view.toUpperCase()}</span>
        <div className="flex ml-auto items-center gap-0.5">
          {view === 'Files' ? (
            <>
              <IconButton label="Open Folder (Ctrl+Shift+O)" icon={FolderOpen} onClick={() => onAction('openfolder')} />
              <IconButton label="Open File (Ctrl+O)" icon={FileCode2} onClick={() => onAction('openfile')} />
              <IconButton label="New File" icon={FilePlus2} onClick={() => onNew(false)} />
              <IconButton label="New Folder" icon={FolderPlus} onClick={() => onNew(true)} />
              <IconButton label="Refresh Files" icon={RefreshCw} onClick={() => onAction('refresh')} />
              <IconButton label="Collapse Folders" icon={ChevronsDownUp} onClick={() => setExpanded([])} />
            </>
          ) : (
            <IconButton label="More Actions" icon={MoreHorizontal} onClick={() => onAction('tools')} />
          )}
        </div>
      </div>

      {view === 'Files' && (
        <>
          {workspaceName || Object.keys(files).length > 0 ? (
            <>
              <Button variant="ghost" className="workspace-heading" onClick={() => toggle('root')}>
                <ChevronDown size={14} />
                {(workspaceName || 'WORKSPACE').toUpperCase()}
                <span className="ml-auto text-[10px] text-muted-foreground font-normal">WORKSPACE</span>
              </Button>
              {!expanded.includes('root') && (
                <div className="file-tree">
                  {Object.keys(files).length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground space-y-3">
                      <p>No files in this workspace.</p>
                      <Button size="sm" variant="outline" className="w-full gap-2 cursor-pointer" onClick={() => onAction('openfolder')}>
                        <FolderOpen size={14} />
                        Open Folder...
                      </Button>
                      <Button size="sm" variant="outline" className="w-full gap-2 cursor-pointer" onClick={() => onAction('openfile')}>
                        <FileCode2 size={14} />
                        Open File...
                      </Button>
                    </div>
                  ) : (
                    tree('', 0)
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="p-4 text-xs text-muted-foreground space-y-3">
              <div className="font-semibold text-foreground text-xs tracking-wider">
                NO FOLDER OPENED
              </div>
              <p className="text-[11px] leading-relaxed">
                You have not opened a folder yet. Open a folder or file to explore and secure your code.
              </p>
              <div className="space-y-2 pt-2">
                <Button size="sm" className="w-full gap-2 justify-start cursor-pointer" onClick={() => onAction('openfolder')}>
                  <FolderOpen size={14} />
                  Open Folder
                  <span className="ml-auto text-[10px] opacity-70 font-mono">Ctrl+Shift+O</span>
                </Button>
                <Button size="sm" variant="outline" className="w-full gap-2 justify-start cursor-pointer" onClick={() => onAction('openfile')}>
                  <FileCode2 size={14} />
                  Open File
                  <span className="ml-auto text-[10px] opacity-70 font-mono">Ctrl+O</span>
                </Button>
              </div>
            </div>
          )}
            <div className="workspace-health">
              <ShieldCheck size={16} className="text-primary" />
              <div>
                <span>Workspace protection</span>
                <span className="text-muted-foreground text-[11px] block mt-1">
                  Active mode · Local workspace
                </span>
              </div>
              <span className="status-dot ml-auto" />
            </div>
        </>
      )}

      {view === 'Search' && (
        <div className="p-3 space-y-2">
          <div className="search-modifiers">
            <Input
              placeholder="Search"
              aria-label="Search workspace"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Button
              variant="ghost"
              className={cn('modifier', matchCase && 'text-info bg-accent')}
              onClick={() => setMatchCase(!matchCase)}
            >
              Aa
            </Button>
            <Button
              variant="ghost"
              aria-label="Match whole word"
              className={cn('modifier', word && 'text-info bg-accent')}
              onClick={() => setWord(!word)}
            >
              ab
            </Button>
            <Button
              variant="ghost"
              aria-label="Use regular expression"
              className={cn('modifier', regex && 'text-info bg-accent')}
              onClick={() => setRegex(!regex)}
            >
              .*
            </Button>
          </div>
          <Input
            placeholder="Replace"
            aria-label="Replacement"
            value={replace}
            onChange={e => setReplace(e.target.value)}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={!search || !results.length}
            onClick={() => onAction(`replace:${search}:${replace}`)}
          >
            Replace all ({results.length})
          </Button>
          <p className="text-xs text-muted-foreground py-2">
            {search ? `${results.length} results in ${new Set(results.map(r => r.file)).size} files` : 'Search across workspace files'}
          </p>
          {results.map(r => (
            <Button
              key={`${r.file}:${r.line}`}
              variant="ghost"
              className="search-result"
              onClick={() => onAction(`goto:${r.file}:${r.line}`)}
            >
              <span className="text-foreground text-xs">
                {r.file}
                <span className="text-muted-foreground ml-2">:{r.line}</span>
              </span>
              <span className="font-mono text-xs text-muted-foreground truncate">{r.text}</span>
            </Button>
          ))}
        </div>
      )}

      {view === 'Changes' && (
        <div className="p-3">
          <div className="flex items-center gap-2 mb-4 text-xs">
            <GitBranch size={14} />
            main
            <span className="text-primary ml-auto">Up to date</span>
          </div>
          <Input
            aria-label="Commit message"
            placeholder="Message (Ctrl+Enter to commit)"
            value={commit}
            onChange={e => setCommit(e.target.value)}
          />
          <Button
            size="sm"
            className="w-full my-2"
            disabled={!commit.trim() || !staged.length}
            onClick={() => {
              setCommitted(true);
              setStaged([]);
              setCommit('');
              onAction('commit');
            }}
          >
            <Check size={14} />
            Commit staged changes
          </Button>
          <div className="micro-label mt-4 mb-2">
            CHANGES <span className="count">{committed ? 0 : 2}</span>
          </div>
          {!committed &&
            ['src/inference.py', 'src/config.py'].map(file => (
              <div className="flex items-center gap-1" key={file}>
                <Button variant="ghost" className="tree-row flex-1" onClick={() => openFile(file, true)}>
                  <FileIcon path={file} />
                  <span>{file.split('/').pop()}</span>
                  <span className="ml-auto text-warning">M</span>
                </Button>
                <IconButton
                  label={staged.includes(file) ? 'Unstage Change' : 'Stage Change'}
                  icon={staged.includes(file) ? Check : FilePlus2}
                  onClick={() =>
                    setStaged(old => (old.includes(file) ? old.filter(f => f !== file) : [...old, file]))
                  }
                />
              </div>
            ))}
          <p className="text-[11px] text-muted-foreground mt-6">
            Local repository wired to backend Git service.
          </p>
        </div>
      )}

      {view === 'Vulnerabilities' && (
        <>
          <div className="security-summary">
            <ShieldAlert className="text-warning" size={20} />
            <div>
              <span className="font-medium">{findings.length} security findings</span>
              <p className="text-xs text-muted-foreground mt-1">Last audit · active</p>
            </div>
            <span className="ml-auto font-mono text-xl text-primary">
              {findings.length ? '87' : '100'}
              <span className="text-[10px] text-muted-foreground">/100</span>
            </span>
          </div>
          <div className="flex px-3 gap-1 mb-3">
            {['All', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
              <Button
                key={f}
                variant="ghost"
                className={cn('filter-button', filter === f && 'bg-accent text-foreground')}
                onClick={() => setFilter(f)}
              >
                {f === 'All' ? 'All findings' : f}
              </Button>
            ))}
          </div>
          {findings
            .filter(f => filter === 'All' || f.severity === filter)
            .map(f => (
              <Button
                key={f.id}
                variant="ghost"
                className={cn('finding-entry', selectedFinding === f.id && 'selected')}
                onClick={() => selectFinding(f)}
              >
                <div className="flex items-center gap-2 w-full">
                  <span
                    className={cn(
                      'severity',
                      f.severity === 'HIGH' ? 'high' : f.severity === 'MEDIUM' ? 'medium' : 'low'
                    )}
                  >
                    {f.severity}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">{f.cwe}</span>
                </div>
                <span className="text-xs font-medium">{f.title}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {f.file}:{f.line}
                </span>
              </Button>
            ))}
          {!findings.length && (
            <div className="p-4 text-primary text-xs flex gap-2">
              <ShieldCheck size={16} />
              No problems detected
            </div>
          )}
        </>
      )}

      {view === 'Extensions' && (
        <div className="p-3">
          <Input
            placeholder="Search extensions"
            aria-label="Search extensions"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="micro-label my-4">RECOMMENDED FOR THIS WORKSPACE</div>
          {[
            {
              name: 'Python',
              author: 'Microsoft',
              description: 'Python language support and debugging.',
              icon: 'py',
              rating: '4.8',
              downloads: '142M',
            },
            {
              name: 'YARA Rules',
              author: 'Kestrel',
              description: 'Threat detection rule syntax and validation.',
              icon: 'Y',
              rating: '4.9',
              downloads: '18K',
            },
            {
              name: 'Docker',
              author: 'Microsoft',
              description: 'Build and secure containerized applications.',
              icon: '▤',
              rating: '4.7',
              downloads: '28M',
            },
            {
              name: 'Sigma Rules',
              author: 'Security Community',
              description: 'Detection engineering for SIEM platforms.',
              icon: 'Σ',
              rating: '4.8',
              downloads: '42K',
            },
          ]
            .filter(e => `${e.name} ${e.description}`.toLowerCase().includes(search.toLowerCase()))
            .map(e => (
              <div className="extension-entry" key={e.name}>
                <span className="extension-glyph">{e.icon}</span>
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{e.name}</span>
                  <div className="text-muted-foreground text-[11px] mt-1">{e.author}</div>
                  <p className="text-xs text-muted-foreground my-2">{e.description}</p>
                  <div className="flex text-[10px] text-muted-foreground items-center gap-2">
                    <Star size={11} className="text-warning" />
                    {e.rating}
                    <Download size={11} />
                    {e.downloads}
                    <Button
                      size="sm"
                      variant={installed.includes(e.name) ? 'outline' : 'default'}
                      className="ml-auto h-6 px-2 text-[11px]"
                      onClick={() => toggleExtension(e.name)}
                    >
                      {installed.includes(e.name) ? 'Uninstall' : 'Install'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          <p className="text-[10px] text-muted-foreground mt-4">
            Kestrel extensions integration enabled.
          </p>
        </div>
      )}

      {view === 'Threat Intelligence' && (
        <div className="p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <Network size={15} />
            Related threats
          </div>
          <ThreatIntel onAction={onAction} />
        </div>
      )}

      {view === 'Tools' && (
        <div className="p-3">
          {[
            { title: 'Attack Simulator', detail: 'Fuzz and simulate attack payloads', icon: ShieldAlert, action: 'simulator' },
            { title: 'Scan Code', detail: 'Analyze the active file', icon: ShieldCheck, action: 'audit' },
            { title: 'Scan Workspace', detail: 'Scan the entire workspace', icon: Search, action: 'batch' },
            { title: 'Attack Test', detail: 'Verify exploit mitigation in sandbox', icon: TerminalSquare, action: 'sandbox' },
            { title: 'Data Flow', detail: 'Explore source-to-sink flows', icon: Network, action: 'threat' },
            { title: 'CI Workflow', detail: 'Create security workflows', icon: GitBranch, action: 'cicd' },
            { title: 'Export Report', detail: 'Download SARIF security findings', icon: Download, action: 'export' },
            { title: 'Scan History', detail: 'Previous workspace scans', icon: ShieldAlert, action: 'history' },
          ].map(tool => (
            <Button
              variant="ghost"
              key={tool.title}
              className="tool-entry"
              onClick={() => onAction(tool.action)}
            >
              <tool.icon size={18} className="text-muted-foreground" />
              <div className="min-w-0">
                <span className="block">{tool.title}</span>
                <span className="block text-[11px] text-muted-foreground mt-1">{tool.detail}</span>
              </div>
              <ArrowUpRight size={14} className="ml-auto text-muted-foreground" />
            </Button>
          ))}
          <div className="mt-6 text-[11px] text-muted-foreground flex gap-2">
            <Bot size={14} />
            Kestrel AI · Guarded
          </div>
        </div>
      )}
    </aside>
  );
}

export function ThreatIntel({ onAction }: { onAction: (action: string) => void }) {
  return (
    <div className="threat-intel-list">
      <div className="intel-entry">
        <div className="flex gap-2 items-center">
          <span className="severity high">HIGH</span>
          <span className="font-mono text-xs">CVE-2020-10987</span>
          <ExternalLink size={12} className="ml-auto text-muted-foreground" />
        </div>
        <p className="text-xs font-medium mt-3 mb-2">OS Command Injection</p>
        <div className="font-mono text-[11px] text-muted-foreground">CWE-78 · CVSS 9.8</div>
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
          Tenda AC15 firmware permits remote command execution through an unvalidated command parameter. Related by weakness, not a dependency match.
        </p>
        <div className="flex gap-2 mt-3">
          <span className="text-warning text-[10px]">● Known exploit vector</span>
          <span className="text-muted-foreground text-[10px]">NVD reference</span>
        </div>
        <div className="intel-detail">
          <span>Vendor mitigation</span>
          <p>Upgrade affected firmware; validate input and avoid shell execution.</p>
        </div>
        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => onAction('simulator')}>
          Simulate attack vector
          <ArrowUpRight size={13} />
        </Button>
      </div>
      <div className="intel-entry">
        <div className="flex gap-2">
          <span className="severity medium">MEDIUM</span>
          <span className="font-mono text-xs">CWE-327</span>
        </div>
        <p className="text-xs my-2">Weak Cryptographic Algorithm</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Collision attacks can bypass integrity checks built with MD5. Prefer SHA-256 for flow fingerprinting.
        </p>
      </div>
    </div>
  );
}
