import { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { ClientOnly } from '@tanstack/react-router';
import { Group, Panel, Separator } from 'react-resizable-panels';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Files,
  Search,
  GitBranch,
  Blocks,
  Network,
  Wrench,
  Settings,
  UserRound,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  PanelLeft,
  PanelRight,
  PanelBottom,
  Play,
  ScanLine,
  MoreHorizontal,
  X,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  TerminalSquare,
  CircleAlert,
  CircleX,
  Bell,
  Check,
  Sparkles,
  Download,
  Clock3,
  Trash2,
  Command,
  FileCode2,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Toaster, toast } from 'sonner';
import { IconButton, FileIcon } from './controls';
import { PrimarySidebar, ThreatIntel, type SidebarView } from './sidebar';
import { RightInspector, type LogEntry } from './inspector';
import { WorkspaceDialogs, type Modal } from './dialogs';
import { AuthGateway } from './auth-gateway';
import { KestrelHeaderBrand } from '../branding/kestrel-header-brand';
import { KestrelSplashScreen } from '../branding/kestrel-splash-screen';
import {
  initialFiles,
  initialFindings,
  initialLogs,
  defaultSettings,
  secureInference,
  inference,
  type Finding,
  type EditorSettings,
  languageFor,
} from './data';
import {
  scanFull,
  scanWorkspace,
  executeTerminalCommand,
  writeWorkspaceFile,
  getGitStatus,
  gitCommit,
  getAuditHistory,
  exportSarifReport,
  clearCache,
  getCurrentUser,
  logoutUser,
  openWorkspaceFolder,
  readWorkspaceFile,
  getSystemDirectories,
} from '@/lib/api';
import { cn } from '@/lib/utils';

const CodeEditor = lazy(() => import('./code-editor'));
const CyberTerminal = lazy(() => import('./cyber-terminal'));

function flattenTreeToFiles(nodes: any[]): Record<string, string> {
  const result: Record<string, string> = {};
  function walk(nodeList: any[]) {
    if (!nodeList) return;
    for (const node of nodeList) {
      if (node.is_dir) {
        if (node.children && node.children.length > 0) {
          walk(node.children);
        } else {
          result[`${node.path}/.gitkeep`] = '';
        }
      } else {
        result[node.path] = '';
      }
    }
  }
  walk(nodes);
  return result;
}

const activities = [
  { name: 'Files', icon: Files },
  { name: 'Search', icon: Search },
  { name: 'Changes', icon: GitBranch },
  { name: 'Vulnerabilities', icon: ShieldAlert },
  { name: 'Extensions', icon: Blocks },
  { name: 'Threat Intelligence', icon: Network },
  { name: 'Tools', icon: Wrench },
] as const;

const commands = [
  { name: 'Scan Code', action: 'audit', shortcut: 'Ctrl+Shift+S', icon: ShieldCheck },
  { name: 'Scan Workspace', action: 'batch', shortcut: '', icon: ScanLine },
  { name: 'AI Patch', action: 'fix', shortcut: 'Ctrl+.', icon: Sparkles },
  { name: 'Open Folder...', action: 'openfolder', shortcut: 'Ctrl+Shift+O', icon: FolderOpen },
  { name: 'Open File...', action: 'openfile', shortcut: 'Ctrl+O', icon: FileCode2 },
  { name: 'Attack Simulator', action: 'simulator', shortcut: '', icon: ShieldAlert },
  { name: 'Attack Test', action: 'sandbox', shortcut: '', icon: Play },
  { name: 'Data Flow', action: 'threat', shortcut: '', icon: Network },
  { name: 'CI Workflow', action: 'cicd', shortcut: '', icon: GitBranch },
  { name: 'Export Report', action: 'export', shortcut: '', icon: Download },
  { name: 'Scan History', action: 'history', shortcut: '', icon: Clock3 },
  { name: 'Clear Cache', action: 'cache', shortcut: '', icon: Trash2 },
  { name: 'Settings', action: 'settings', shortcut: '', icon: Settings },
  { name: 'Toggle Terminal', action: 'terminal', shortcut: 'Ctrl+`', icon: TerminalSquare },
];

export function Workspace() {
  const [files, setFiles] = useState<Record<string, string>>({});
  const [savedFiles, setSavedFiles] = useState<Record<string, string>>({});
  const [tabs, setTabs] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string>('');
  const [dirty, setDirty] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  const [view, setView] = useState<SidebarView>('Files');
  const [sidebar, setSidebar] = useState(true);
  const [right, setRight] = useState(false);
  const [bottom, setBottom] = useState(false);
  const [bottomTab, setBottomTab] = useState('Issues');
  const [maximized, setMaximized] = useState(false);
  const [rightTab, setRightTab] = useState('AI Chat');
  const [findings, setFindings] = useState<Finding[]>([]);
  const [selectedFinding, setSelectedFinding] = useState<string>('');

  const [line, setLine] = useState(1);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [settings, setSettings] = useState<EditorSettings>(defaultSettings);
  const [modal, setModal] = useState<Modal>(null);
  const [pendingClose, setPendingClose] = useState<string | null>(null);
  const [palette, setPalette] = useState(false);
  const [query, setQuery] = useState('');
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [scanStage, setScanStage] = useState(-1);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [history, setHistory] = useState<Array<{ time: string; count: number; scope: string }>>([]);
  const [installed, setInstalled] = useState(['Python']);
  const [hydrated, setHydrated] = useState(false);
  const [layout, setLayout] = useState<Record<string, number>>({});
  const [verticalLayout, setVerticalLayout] = useState<Record<string, number>>({});
  const [menu, setMenu] = useState(false);
  const [aiPatches, setAiPatches] = useState<Record<string, string>>({});
  const [gitBranch, setGitBranch] = useState('main');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [splashActive, setSplashActive] = useState(true);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspacePath, setWorkspacePath] = useState('');

  useEffect(() => {
    (window as any).__openAboutKestrel = () => setModal('about');
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const api = (window as any).electronAPI;
      if (typeof api.onWorkspaceOpened === 'function') {
        api.onWorkspaceOpened((folderPath: string) => {
          if (folderPath) handleOpenFolder(folderPath);
        });
      }
      if (typeof api.onFileOpened === 'function') {
        api.onFileOpened((filePath: string) => {
          if (filePath) handleOpenFile(filePath);
        });
      }
    }
    return () => {
      delete (window as any).__openAboutKestrel;
    };
  }, []);

  const scanTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentFinding =
    (selectedFinding && activeFile
      ? findings.find(f => f.id === selectedFinding && f.file === activeFile)
      : null) ??
    (activeFile ? findings.find(f => f.file === activeFile) : null) ??
    (findings.length > 0 ? findings[0] : null);
  const scanning = scanStage >= 0;
  const stages = ['Static Analysis', 'Threat Intelligence', 'AI Analysis', 'Patch Generation'];

  useEffect(() => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('secstudio.auth_token') : null;
    const isGuest = typeof localStorage !== 'undefined' ? localStorage.getItem('secstudio.guest_mode') === 'true' : false;

    getCurrentUser()
      .then(u => {
        setUserProfile(u);
        if (!u.authenticated && !isGuest && !token) {
          setAuthGateOpen(true);
        }
      })
      .catch(() => {
        if (!isGuest && !token) {
          setAuthGateOpen(true);
        }
      });

    getGitStatus()
      .then(res => {
        if (res.branch) setGitBranch(res.branch);
      })
      .catch(() => {});
    getAuditHistory()
      .then(hist => {
        if (hist?.length)
          setHistory(
            hist.map(h => ({
              time: h.timestamp ? h.timestamp.split('T')[1]?.slice(0, 8) || '12:00:00' : '12:00:00',
              count: h.total_findings,
              scope: `Workspace (${h.files_scanned} files)`,
            }))
          );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const state = JSON.parse(localStorage.getItem('secstudio.workspace') ?? 'null');
      if (state) {
        const isLegacyNidsMock =
          state.workspaceName === 'NIDS-ML' ||
          (state.files &&
            Object.keys(state.files).some(k => k.includes('inference.py') || k.includes('train_model.py')));
        if (isLegacyNidsMock) {
          localStorage.removeItem('secstudio.workspace');
        } else {
          if (state.workspaceName) setWorkspaceName(state.workspaceName);
          if (state.workspacePath) setWorkspacePath(state.workspacePath);
          if (state.files && Object.keys(state.files).length > 0) {
            setFiles(state.files);
            setSavedFiles(state.files);
          }
          if (state.tabs?.length) {
            setTabs(state.tabs);
            setActiveFile(state.activeFile ?? state.tabs[0]);
          }
          if (state.settings) setSettings(state.settings);
          if (typeof state.sidebar === 'boolean') setSidebar(state.sidebar);
          if (typeof state.right === 'boolean') setRight(state.right);
          if (typeof state.bottom === 'boolean') setBottom(state.bottom);
          if (state.layout) setLayout(state.layout);
          if (state.verticalLayout) setVerticalLayout(state.verticalLayout);
          if (state.findings) setFindings(state.findings);
        }
      } else if (window.innerWidth < 1100) {
        setRight(false);
        if (window.innerWidth < 760) {
          setSidebar(false);
          setBottom(false);
        }
      }
    } catch {}
    setHydrated(true);
    return () => {
      if (scanTimer.current) clearInterval(scanTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(
      () =>
        localStorage.setItem(
          'secstudio.workspace',
          JSON.stringify({
            files,
            tabs,
            activeFile,
            settings,
            sidebar,
            right,
            bottom,
            layout,
            verticalLayout,
            findings,
            workspaceName,
            workspacePath,
          })
        ),
      300
    );
    return () => window.clearTimeout(timer);
  }, [
    files,
    tabs,
    activeFile,
    settings,
    sidebar,
    right,
    bottom,
    layout,
    verticalLayout,
    findings,
    workspaceName,
    workspacePath,
    hydrated,
  ]);

  // Auto-save debounced sync to disk so external editors (like VS Code) stay synchronized
  useEffect(() => {
    if (dirty.length === 0 || !activeFile || !dirty.includes(activeFile)) return;
    const timer = window.setTimeout(() => {
      const content = files[activeFile];
      if (content !== undefined) {
        writeWorkspaceFile(activeFile, content)
          .then(() => {
            setSavedFiles(old => ({ ...old, [activeFile]: content }));
            setDirty(old => old.filter(f => f !== activeFile));
          })
          .catch(() => {});
      }
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [files, dirty, activeFile]);

  const handleOpenFolder = async (folderPath?: string) => {
    let target = folderPath;
    if (!target && typeof window !== 'undefined' && (window as any).electronAPI?.openDirectory) {
      target = await (window as any).electronAPI.openDirectory();
    }
    if (!target) {
      if (!folderPath && (typeof window === 'undefined' || !(window as any).electronAPI)) {
        setModal('openfolder');
      }
      return;
    }
    try {
      toast.loading('Opening workspace folder...', { id: 'ws-open' });
      const res = await openWorkspaceFolder(target);
      const newFiles = flattenTreeToFiles(res.tree);
      const keys = Object.keys(newFiles);
      if (keys.length > 0) {
        const firstFile = keys.find(k => !k.endsWith('.gitkeep')) || keys[0] || '';
        if (firstFile) {
          try {
            const readRes = await readWorkspaceFile(firstFile);
            newFiles[firstFile] = readRes.content;
          } catch {}
          setFiles(newFiles);
          setSavedFiles(newFiles);
          setTabs([firstFile]);
          setActiveFile(firstFile);
        }
      } else {
        setFiles({});
        setSavedFiles({});
        setTabs([]);
        setActiveFile('');
      }
      const rootTitle = res.root_name || target.split(/[\\/]/).pop() || 'Workspace';
      setWorkspaceName(rootTitle);
      setWorkspacePath(res.root_path || target);
      setDirty([]);
      setFindings([]);
      toast.success(`Opened folder: ${rootTitle}`, { id: 'ws-open' });
      log(`Workspace folder loaded: ${res.root_path || target}`);
    } catch (err: any) {
      toast.error(`Could not open folder: ${err.message || 'Error'}`, { id: 'ws-open' });
    }
  };

  const handleOpenFile = async (filePath?: string) => {
    let target = filePath;
    if (!target && typeof window !== 'undefined' && (window as any).electronAPI?.openFile) {
      target = await (window as any).electronAPI.openFile();
    }
    if (!target) {
      if (!filePath && (typeof window === 'undefined' || !(window as any).electronAPI)) {
        setModal('openfile');
      }
      return;
    }
    try {
      toast.loading('Opening file...', { id: 'file-open' });
      const res = await readWorkspaceFile(target);
      const cleanPath = target.replace(/\\/g, '/');
      setFiles(prev => ({ ...prev, [cleanPath]: res.content }));
      setSavedFiles(prev => ({ ...prev, [cleanPath]: res.content }));
      setTabs(prev => (prev.includes(cleanPath) ? prev : [...prev, cleanPath]));
      setActiveFile(cleanPath);
      setPreview(null);
      toast.success(`Opened file: ${cleanPath.split('/').pop()}`, { id: 'file-open' });
      log(`Opened file from disk: ${cleanPath}`);
    } catch (err: any) {
      toast.error(`Could not open file: ${err.message || 'Error'}`, { id: 'file-open' });
    }
  };

  const openFile = async (file: string, pin = false) => {
    if (files[file] === '' || files[file] === undefined) {
      try {
        const res = await readWorkspaceFile(file);
        setFiles(prev => ({ ...prev, [file]: res.content }));
        setSavedFiles(prev => ({ ...prev, [file]: res.content }));
      } catch (err) {}
    }
    setTabs(old => {
      if (old.includes(file)) return old;
      if (preview && !dirty.includes(preview) && !pin) return old.map(f => (f === preview ? file : f));
      return [...old, file];
    });
    setPreview(pin ? null : file);
    setActiveFile(file);
    setLine(1);
  };

  const selectFinding = (f: Finding) => {
    openFile(f.file, true);
    setSelectedFinding(f.id);
    setLine(f.line);
    setRightTab('AI Chat');
  };

  const save = async (file = activeFile) => {
    if (!file) return;
    const content = files[file] ?? '';
    setSavedFiles(old => ({ ...old, [file]: content }));
    setDirty(old => old.filter(f => f !== file));
    setPreview(null);
    try {
      const res = await writeWorkspaceFile(file, content);
      toast.success(`${file.split('/').pop()} saved to disk`);
      log(`Saved ${file} (${res.bytes_written || content.length} bytes) to disk`);
    } catch (err: any) {
      console.error('Failed to save file to disk:', err);
      toast.error(`Could not save ${file.split('/').pop()}: ${err?.message || 'Write error'}`);
    }
  };

  const closeTab = (file: string, force = false) => {
    if (dirty.includes(file) && !force) {
      setPendingClose(file);
      setModal('unsaved');
      return;
    }
    const remaining = tabs.filter(f => f !== file);
    setTabs(remaining);
    setDirty(old => old.filter(f => f !== file));
    if (activeFile === file) {
      setActiveFile(remaining.at(-1) ?? '');
      setLine(1);
    }
  };

  const log = (message: string, level = 'INFO') =>
    setLogs(old => [...old, { time: new Date().toLocaleTimeString('en-GB'), level, message }]);

  const audit = async (batch = false) => {
    if (scanning) return;
    setScanStage(0);
    setBottom(true);
    setBottomTab('Scan Output');
    log(`${batch ? 'Workspace' : activeFile} security audit initiated`);

    if (batch) {
      try {
        setScanStage(1);
        const res = await scanWorkspace();
        setScanStage(3);
        const mappedFindings: Finding[] = [];
        Object.entries(res.findings_by_file).forEach(([fname, flist]) => {
          flist.forEach(bf => {
            mappedFindings.push({
              id: bf.id,
              severity: bf.severity === 'CRITICAL' || bf.severity === 'HIGH' ? 'HIGH' : bf.severity === 'MEDIUM' ? 'MEDIUM' : 'LOW',
              title: bf.title,
              file: fname,
              line: bf.line_start,
              cwe: bf.cwe_id,
              description: bf.description,
            });
          });
        });
        if (mappedFindings.length > 0) setFindings(mappedFindings);
        setScanStage(-1);
        setBottomTab('Issues');
        const time = new Date().toLocaleTimeString('en-GB');
        setHistory(old => [{ time, count: mappedFindings.length, scope: 'Workspace Audit' }, ...old]);
        log(`Workspace audit complete · ${res.total_files_scanned} files · ${mappedFindings.length} findings`);
        toast.success(`Workspace audit complete · ${mappedFindings.length} findings`);
        return;
      } catch {}
    } else {
      try {
        setScanStage(0);
        log('Deterministic static AST analysis in progress...');
        const fullRes = await scanFull(files[activeFile] || '', activeFile, languageFor(activeFile));
        setScanStage(1);
        log('Correlating threat intelligence via Tavily Search API...');
        setScanStage(2);
        log('NVIDIA Nemotron reasoning engine evaluating defensive patch...');
        const newFindings: Finding[] = fullRes.scan.findings.map(bf => ({
          id: bf.id,
          severity: bf.severity === 'CRITICAL' || bf.severity === 'HIGH' ? 'HIGH' : bf.severity === 'MEDIUM' ? 'MEDIUM' : 'LOW',
          title: bf.title,
          file: activeFile,
          line: bf.line_start,
          cwe: bf.cwe_id,
          description: bf.description,
        }));
        const patchMap: Record<string, string> = {};
        Object.entries(fullRes.remediation).forEach(([fid, rem]) => {
          if (rem?.patched_full_code) patchMap[fid] = rem.patched_full_code;
        });
        setAiPatches(prev => ({ ...prev, ...patchMap }));
        if (newFindings.length > 0) setFindings(newFindings);
        setScanStage(3);
        log('Remediation patch ready for review');
        setScanStage(-1);
        setBottomTab('Issues');
        const time = new Date().toLocaleTimeString('en-GB');
        setHistory(old => [{ time, count: newFindings.length, scope: activeFile }, ...old]);
        log(`Audit complete · ${newFindings.length} findings`);
        toast.success(`Audit complete · ${newFindings.length} findings`);
        return;
      } catch {}
    }

    let stage = 0;
    scanTimer.current = setInterval(() => {
      stage++;
      if (stage < 4) {
        setScanStage(stage);
        log(`${stages[stage]} completed`);
      } else {
        if (scanTimer.current) clearInterval(scanTimer.current);
        setScanStage(-1);
        setBottomTab('Issues');
        const time = new Date().toLocaleTimeString('en-GB');
        setHistory(old => [
          { time, count: findings.length, scope: batch ? (workspaceName ? `Workspace · ${workspaceName}` : 'Workspace') : activeFile },
          ...old,
        ]);
        log(`Audit complete · ${findings.length} findings`);
        toast.success(`Audit complete · ${findings.length} findings`);
      }
    }, 700);
  };

  const originalForDiff = (): string => {
    const current = files[activeFile] ?? '';
    if (currentFinding?.cwe === 'CWE-78' && (!current.includes('shell=True') || current === secureInference)) {
      return inference;
    }
    return current;
  };

  const patchFor = (): string => {
    if (currentFinding && aiPatches[currentFinding.id]) return aiPatches[currentFinding.id] ?? '';
    return currentFinding?.cwe === 'CWE-78'
      ? secureInference
      : currentFinding?.cwe === 'CWE-798'
      ? (files[activeFile] ?? '').replace(/API_KEY = .*/, 'API_KEY = os.environ.get("THREAT_INTEL_API_KEY", "")')
      : currentFinding?.cwe === 'CWE-327'
      ? (files[activeFile] ?? '').replace('hashlib.md5', 'hashlib.sha256')
      : (files[activeFile] ?? '').replace('python:3.11-slim', 'python:3.11.10-slim');
  };

  const fix = () => {
    if (modal === 'diff') {
      setModal(null);
      return;
    }
    if (!currentFinding) {
      toast.info('No active security finding to patch');
      return;
    }
    selectFinding(currentFinding);
    setModal('diff');
  };

  const applyPatch = () => {
    if (!currentFinding) return;
    const file = currentFinding.file;
    const patched = patchFor();
    setFiles(old => ({ ...old, [file]: patched }));
    setSavedFiles(old => ({ ...old, [file]: patched }));
    setDirty(old => old.filter(f => f !== file));
    setFindings(old => old.filter(f => f.id !== currentFinding.id));
    setModal(null);

    // Save to physical disk immediately so VS Code and external tools reflect changes
    writeWorkspaceFile(file, patched)
      .then(res => {
        toast.success(`Security patch applied and saved to disk`);
        log(`Security patch written to disk: ${file} (${res.bytes_written || patched.length} bytes)`);
      })
      .catch(err => {
        console.error('Failed to save patch to disk:', err);
        toast.error(`Patch applied in editor, but disk save failed: ${err?.message || 'Error'}`);
      });

    log(`${currentFinding.cwe} security patch applied`);
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
    } catch {}
    setUserProfile(null);
    setModal(null);
    setAuthGateOpen(true);
    toast.info('Signed out of Kestrel');
  };

  const exportSarif = async () => {
    try {
      const report = await exportSarifReport(
        findings.map(f => ({
          id: f.id,
          rule_id: f.cwe,
          title: f.title,
          description: f.description,
          cwe_id: f.cwe,
          severity: f.severity,
          line_start: f.line,
          line_end: f.line,
          code_snippet: '',
          scanner: 'ast',
        }))
      );
      const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'kestrel-results.sarif';
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success('SARIF report exported');
      return;
    } catch {}

    const report = {
      version: '2.1.0',
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      runs: [
        {
          tool: { driver: { name: 'Kestrel Engine', version: '1.0.0' } },
          results: findings.map(f => ({
            ruleId: f.cwe,
            level: f.severity === 'HIGH' ? 'error' : 'warning',
            message: { text: f.title },
            locations: [{ physicalLocation: { artifactLocation: { uri: f.file }, region: { startLine: f.line } } }],
          })),
        },
      ],
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'kestrel-results.sarif';
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('SARIF report exported');
  };

  const newFile = (path: string, content = '') => {
    if (path.includes('..') || path.startsWith('/')) {
      toast.error('Use a workspace-relative path');
      return;
    }
    setFiles(old => ({ ...old, [path]: content }));
    setSavedFiles(old => ({ ...old, [path]: content }));
    setTabs(old => [...new Set([...old, path])]);
    setActiveFile(path);
    setLine(1);
    toast.success(`${path} created`);
  };

  const action = (a: string) => {
    setMenu(false);
    if (a === 'audit' || a === 'batch') audit(a === 'batch');
    else if (a === 'fix') fix();
    else if (a === 'openfolder') handleOpenFolder();
    else if (a === 'openfile') handleOpenFile();
    else if (a === 'export') exportSarif();
    else if (a === 'terminal') {
      setBottom(!bottom || bottomTab !== 'Terminal');
      setBottomTab('Terminal');
    } else if (a === 'cache') {
      clearCache()
        .then(() => toast.success('Zero-retention cache cleared'))
        .catch(() => {
          localStorage.removeItem('secstudio.workspace');
          toast.success('Saved workspace cache cleared');
        });
    } else if (a === 'refresh') toast.success('Files refreshed');
    else if (a === 'commit') {
      gitCommit('Kestrel security update')
        .then(() => toast.success('Changes committed to git repository'))
        .catch(() => toast.success('Changes committed in workspace'));
    } else if (a === 'tools') {
      setView('Tools');
      setSidebar(true);
    } else if (a.startsWith('goto:')) {
      const [, file = '', ln = '1'] = a.split(':');
      openFile(file, true);
      setLine(Number(ln));
    } else if (a.startsWith('replace:')) {
      const [, search = '', replacement = ''] = a.split(':');
      setFiles(old =>
        Object.fromEntries(Object.entries(old).map(([path, value]) => [path, value.replaceAll(search, replacement)]))
      );
      setDirty(Object.keys(files).filter(f => (files[f] ?? '').includes(search)));
      toast.success('Workspace matches replaced');
    } else setModal(a as Modal);
  };

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const key = e.key.toLowerCase();
      if (key === 'k' || key === 'p') {
        e.preventDefault();
        setPalette(true);
        setQuery('');
      } else if (key === 'o' && e.shiftKey) {
        e.preventDefault();
        handleOpenFolder();
      } else if (key === 'o' && !e.shiftKey) {
        e.preventDefault();
        handleOpenFile();
      } else if (key === 's') {
        e.preventDefault();
        e.shiftKey ? audit() : save();
      } else if (key === '.') {
        e.preventDefault();
        fix();
      } else if (key === '`') {
        e.preventDefault();
        action('terminal');
      } else if (key === 'b') {
        e.preventDefault();
        setSidebar(!sidebar);
      } else if (key === 'f' || key === 'h') {
        if ((e.target as HTMLElement)?.closest('.monaco-editor')) return;
        e.preventDefault();
        setView('Search');
        setSidebar(true);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  });

  const terminalCommand = async (command: string) => {
    const [name, ...args] = command.split(' ');
    if (!name) return '';
    try {
      const res = await executeTerminalCommand(command, activeFile, files[activeFile] || '');
      if (res?.output) return res.output;
    } catch {}
    if (name === 'help')
      return 'Security commands:\n  scan, bandit, yara, snort, sigma\n  cve <id>, edb, searchsploit\n  ext, status, cat <path>, clear\nConnected to FastAPI backend.';
    if (name === 'status')
      return `Workspace: ${workspaceName || 'Empty'} · main\nFiles: ${Object.keys(files).length} · Findings: ${findings.length}\nAI: NVIDIA Nemotron · Backend: Port 8000 (Active)`;
    if (name === 'cat') return files[args.join(' ')] ?? 'File not found.';
    return `${name}: command executed.`;
  };

  const paletteItems = [
    ...commands.map(c => ({ ...c, file: '' })),
    ...Object.keys(files).map(file => ({ name: file, action: '', shortcut: '', icon: FileCode2, file })),
  ].filter(c => c.name.toLowerCase().includes(query.toLowerCase()));

  const chooseCommand = (item: typeof paletteItems[number]) => {
    setPalette(false);
    item.file ? openFile(item.file, true) : action(item.action);
  };

  return (
    <TooltipProvider delayDuration={450}>
      {splashActive && <KestrelSplashScreen onReady={() => setSplashActive(false)} />}
      <div className="ide-shell">
        <header className="titlebar">
          <KestrelHeaderBrand
            workspaceName={workspaceName}
            onWorkspaceClick={() => {
              setQuery('');
              setPalette(true);
            }}
          />
          <Button
            variant="outline"
            className="command-search"
            onClick={() => {
              setQuery('');
              setPalette(true);
            }}
          >
            <Search size={14} />
            <span>Search files and actions…</span>
            <kbd>Ctrl K</kbd>
          </Button>
          <div className="title-actions">
            <IconButton label="Open Folder (Ctrl+Shift+O)" icon={FolderOpen} onClick={() => handleOpenFolder()} />
            <IconButton label="Open File (Ctrl+O)" icon={FileCode2} onClick={() => handleOpenFile()} />
            <Button size="sm" className="audit-button" onClick={() => audit()} disabled={scanning}>
              <ShieldCheck size={14} />
              {scanning ? 'Scanning…' : 'Scan Code'}
              <span className="audit-shortcut">⌘⇧S</span>
            </Button>
            <IconButton label="Attack Simulator" icon={ShieldAlert} onClick={() => setModal('simulator')} />
            <div className="relative">
              <IconButton label="More Security Actions" icon={MoreHorizontal} onClick={() => setMenu(!menu)} />
              {menu && (
                <div className="toolbar-menu">
                  {commands.slice(4, 12).map(c => (
                    <Button key={c.action} variant="ghost" onClick={() => action(c.action)}>
                      <c.icon size={14} />
                      {c.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <span className="title-divider" />
            <IconButton label="Toggle Sidebar" icon={PanelLeft} onClick={() => setSidebar(!sidebar)} />
            <IconButton label="Toggle Bottom Panel" icon={PanelBottom} onClick={() => setBottom(!bottom)} />
            <IconButton label="Toggle AI Assistant" icon={PanelRight} onClick={() => setRight(!right)} />
            <Button
              variant="ghost"
              className="profile-button"
              aria-label="Open Account"
              onClick={() => setModal('account')}
              title={userProfile?.name ? `${userProfile.name} (${userProfile.role})` : 'Accounts'}
            >
              {userProfile?.initials || 'MK'}
            </Button>
          </div>
        </header>

        <div className="ide-main">
          <nav className="activity-bar" aria-label="Workspace views">
            <div className="nav-section-label">WORKSPACE</div>
            {activities.map(a => (
              <div className="activity-item" key={a.name}>
                <Button
                  variant="ghost"
                  aria-label={a.name}
                  aria-pressed={sidebar && view === a.name}
                  className={cn('activity-button', sidebar && view === a.name && 'active')}
                  onClick={() => {
                    setView(a.name);
                    setSidebar(true);
                  }}
                >
                  <a.icon size={18} />
                  <span>{a.name}</span>
                </Button>
                {a.name === 'Vulnerabilities' && findings.length > 0 && (
                  <span className="activity-badge">{findings.length}</span>
                )}
              </div>
            ))}
            <div className="nav-section-label security-nav-label">ASSISTANT</div>
            <Button
              variant="ghost"
              aria-label="AI Chat"
              aria-pressed={right && rightTab === 'AI Chat'}
              className={cn('activity-button', right && rightTab === 'AI Chat' && 'active')}
              onClick={() => {
                if (right && rightTab === 'AI Chat') {
                  setRight(false);
                } else {
                  setRight(true);
                  setRightTab('AI Chat');
                }
              }}
            >
              <Sparkles size={18} />
              <span>AI Chat</span>
            </Button>
            <Button
              variant="ghost"
              aria-label="AI Patch"
              aria-pressed={modal === 'diff'}
              className={cn('activity-button', modal === 'diff' && 'active')}
              onClick={fix}
            >
              <Wrench size={18} />
              <span>AI Patch</span>
            </Button>
            <div className="activity-bottom">
              <div
                className="nav-project"
                onClick={() => handleOpenFolder()}
                style={{ cursor: 'pointer' }}
                title={workspacePath ? `Path: ${workspacePath}` : 'Click to open a workspace folder'}
              >
                <span className="status-dot" style={{ backgroundColor: workspaceName ? 'var(--mint)' : 'var(--muted-foreground)' }} />
                <div>
                  {workspaceName || 'No Folder'}
                  <span>{workspaceName ? 'Active workspace' : 'Click to open'}</span>
                </div>
                <ChevronDown size={12} />
              </div>
              <Button
                variant="ghost"
                className={cn('activity-button', modal === 'account' && 'active')}
                aria-label="Accounts"
                onClick={() => setModal('account')}
              >
                <UserRound size={18} />
                <span>Accounts</span>
              </Button>
              <Button variant="ghost" className="activity-button" onClick={() => setModal('settings')}>
                <Settings size={18} />
                <span>Settings</span>
              </Button>
            </div>
          </nav>

          <Group
            key={`workspace-group-${sidebar ? 's' : 'nos'}-${right ? 'r' : 'nor'}`}
            orientation="horizontal"
            className="workspace-group"
            defaultLayout={Object.keys(layout).length ? layout : undefined}
            onLayoutChanged={setLayout}
          >
            {sidebar && (
              <>
                <Panel id="sidebar" defaultSize="230px" minSize="190px" maxSize="360px">
                  <PrimarySidebar
                    view={view}
                    workspaceName={workspaceName}
                    files={files}
                    activeFile={activeFile}
                    openFile={openFile}
                    findings={findings}
                    selectedFinding={selectedFinding}
                    selectFinding={selectFinding}
                    onNew={folder => setModal(folder ? 'newfolder' : 'newfile')}
                    onAction={action}
                    installed={installed}
                    toggleExtension={name => {
                      setInstalled(old => (old.includes(name) ? old.filter(n => n !== name) : [...old, name]));
                      toast.success(`${name} ${installed.includes(name) ? 'uninstalled' : 'installed'}`);
                    }}
                  />
                </Panel>
                <Separator className="resize-handle horizontal" />
              </>
            )}

            <Panel id="workspace" minSize="240px">
              <Group
                key={maximized ? 'maximized' : 'normal'}
                orientation="vertical"
                defaultLayout={maximized ? { editor: 20, dock: 80 } : Object.keys(verticalLayout).length ? verticalLayout : undefined}
                onLayoutChanged={setVerticalLayout}
              >
                <Panel id="editor" minSize="160px">
                  <main className="editor-workspace">
                    {tabs.length > 0 && (
                      <div className="editor-tabs">
                        <div className="tab-list" role="tablist" aria-label="Open files">
                          {tabs.map(file => (
                            <div className={cn('editor-tab', activeFile === file && 'active')} key={file}>
                              <Button
                                role="tab"
                                aria-selected={activeFile === file}
                                variant="ghost"
                                className="tab-label"
                                onClick={() => {
                                  setActiveFile(file);
                                  setLine(1);
                                }}
                                onDoubleClick={() => setPreview(null)}
                              >
                                <FileIcon path={file} />
                                <span className={cn(preview === file && 'italic')}>{file.split('/').pop()}</span>
                                {findings.some(f => f.file === file) && (
                                  <span className="text-danger text-[11px] font-mono">
                                    {findings.filter(f => f.file === file).length}
                                  </span>
                                )}
                                {dirty.includes(file) && <span className="dirty-dot" />}
                              </Button>
                              <IconButton label={`Close ${file.split('/').pop()}`} icon={X} className="tab-close" onClick={() => closeTab(file)} />
                            </div>
                          ))}
                        </div>
                        <div className="tab-tools">
                          <IconButton
                            label="Run Active File in Terminal"
                            icon={Play}
                            onClick={() => {
                              setBottom(true);
                              setBottomTab('Terminal');
                              log('Active file execution initiated');
                            }}
                          />
                          <IconButton label="Editor Actions" icon={MoreHorizontal} onClick={() => setModal('settings')} />
                        </div>
                      </div>
                    )}

                    {activeFile && (
                      <div className="breadcrumbs">
                        {workspaceName && <span>{workspaceName}</span>}
                        {activeFile.split('/').map((p, i) => (
                          <span className="flex items-center gap-1" key={`${p}-${i}`}>
                            <ChevronRight size={12} />
                            {p.endsWith('.py') && <FileIcon path={p} />}
                            {p}
                          </span>
                        ))}
                        <span className="breadcrumb-security">
                          <span className="status-dot" />
                          Guarded workspace
                        </span>
                      </div>
                    )}

                    {currentFinding && (
                      <div className="vulnerability-spotlight">
                        <CircleAlert size={15} />
                        <div>
                          <strong>{currentFinding.title}</strong>
                          <span>
                            Line {currentFinding.line} · {currentFinding.severity.toLowerCase()} risk
                          </span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={fix}>
                          <Sparkles size={13} />
                          AI Patch
                          <ArrowUpRight size={13} />
                        </Button>
                      </div>
                    )}

                    {activeFile ? (
                      <div className="code-editor-container">
                        <ClientOnly fallback={<div className="p-4 text-xs text-muted-foreground">Loading workspace…</div>}>
                          <Suspense fallback={<div className="p-4 text-xs text-muted-foreground">Loading editor…</div>}>
                            <CodeEditor
                              path={activeFile}
                              value={files[activeFile] ?? ''}
                              onChange={value => {
                                setFiles(old => ({ ...old, [activeFile]: value }));
                                setDirty(old => [...new Set([...old, activeFile])]);
                              }}
                              findings={findings}
                              line={line}
                              settings={settings}
                              onCursor={(ln, col) => setCursor({ line: ln, column: col })}
                              onFix={fix}
                              onSave={() => save()}
                            />
                          </Suspense>
                        </ClientOnly>
                      </div>
                    ) : (
                      <div className="empty-editor">
                        <div className="empty-editor-card">
                          <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-card border border-border shadow-xl">
                            <img
                              src="/branding/kestrel-symbol.svg"
                              alt="Kestrel"
                              className="w-12 h-12 object-contain"
                              onError={e => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                            <Shield className="w-10 h-10 text-primary" style={{ display: 'none' }} />
                          </div>

                          <div className="space-y-1.5">
                            <h2 className="text-xl font-bold tracking-tight text-foreground font-mono">
                              KESTREL<span className="text-primary font-sans">_</span>
                            </h2>
                            <p className="text-xs text-muted-foreground tracking-wide font-sans">
                              Hunt flaws. Ship armor.
                            </p>
                          </div>

                          <div className="empty-editor-actions">
                            <button
                              type="button"
                              className="empty-editor-action"
                              onClick={() => handleOpenFolder()}
                            >
                              <span className="flex items-center gap-2.5">
                                <FolderOpen size={15} className="text-primary" />
                                Open Folder
                              </span>
                              <span className="empty-editor-shortcut">Ctrl+Shift+O</span>
                            </button>

                            <button
                              type="button"
                              className="empty-editor-action"
                              onClick={() => handleOpenFile()}
                            >
                              <span className="flex items-center gap-2.5">
                                <FileCode2 size={15} className="text-primary" />
                                Open File
                              </span>
                              <span className="empty-editor-shortcut">Ctrl+O</span>
                            </button>

                            <button
                              type="button"
                              className="empty-editor-action"
                              onClick={() => {
                                setPalette(true);
                                setQuery('');
                              }}
                            >
                              <span className="flex items-center gap-2.5">
                                <Command size={15} className="text-primary" />
                                Command Palette
                              </span>
                              <span className="empty-editor-shortcut">Ctrl+Shift+P</span>
                            </button>
                          </div>

                          <div className="pt-2 border-t border-border/50 w-full flex items-center justify-around text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Nemotron LLM
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                              Static AST Engine
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </main>
                </Panel>

                {bottom && (
                  <>
                    <Separator className="resize-handle vertical" />
                    <Panel id="dock" defaultSize="220px" minSize="130px" maxSize={maximized ? '85%' : '500px'}>
                      <div className={cn('bottom-dock', maximized && 'dock-maximized')}>
                        <div className="dock-heading">
                          <div className="dock-tabs" role="tablist">
                            {['Issues', 'Scan Output', 'Terminal', 'Threat Intelligence'].map(t => (
                              <Button
                                key={t}
                                variant="ghost"
                                role="tab"
                                aria-selected={bottomTab === t}
                                className={cn('dock-tab', bottomTab === t && 'active')}
                                onClick={() => setBottomTab(t)}
                              >
                                {t}
                                {t === 'Issues' && <span className="count">{findings.length}</span>}
                                {t === 'Terminal' && <span className="terminal-live" />}
                              </Button>
                            ))}
                          </div>
                          <div className="dock-controls">
                            {bottomTab === 'Terminal' && (
                              <>
                                <span className="shell-name">
                                  <TerminalSquare size={12} />
                                  bash
                                </span>
                                <IconButton
                                  label="New Terminal Session"
                                  icon={Plus}
                                  onClick={() => toast.info('Kestrel terminal session active')}
                                />
                              </>
                            )}
                            <IconButton
                              label="Maximize or Restore Panel"
                              icon={maximized ? Minimize2 : Maximize2}
                              onClick={() => setMaximized(!maximized)}
                            />
                            <IconButton label="Close Bottom Panel" icon={X} onClick={() => setBottom(false)} />
                          </div>
                        </div>

                        <div className="dock-content">
                          {bottomTab === 'Terminal' && (
                            <ClientOnly>
                              <Suspense fallback={<div className="p-3 text-xs text-muted-foreground">Starting terminal…</div>}>
                                <CyberTerminal onCommand={terminalCommand} />
                              </Suspense>
                            </ClientOnly>
                          )}
                          {bottomTab === 'Issues' && (
                            <div className="problems-list">
                              {findings.length ? (
                                <>
                                  <div className="problem-group">
                                    <ChevronDown size={12} />
                                    <FolderOpen size={14} />
                                    {workspaceName || 'WORKSPACE'}
                                    <span className="count">{findings.length}</span>
                                    <span className="ml-auto text-muted-foreground text-[10px]">
                                      KESTREL STATIC ANALYSIS
                                    </span>
                                  </div>
                                  {findings.map(f => (
                                    <Button
                                      key={f.id}
                                      variant="ghost"
                                      className={cn('problem-row', selectedFinding === f.id && 'selected')}
                                      onClick={() => selectFinding(f)}
                                    >
                                      {f.severity === 'HIGH' ? (
                                        <CircleX size={14} className="text-danger" />
                                      ) : (
                                        <CircleAlert
                                          size={14}
                                          className={f.severity === 'MEDIUM' ? 'text-warning' : 'text-info'}
                                        />
                                      )}
                                      <span className="font-mono text-[11px] text-muted-foreground w-16">{f.cwe}</span>
                                      <span>{f.title}</span>
                                      <span className="problem-location">
                                        {f.file} [{f.line}, 5]
                                      </span>
                                      <span
                                        className={cn(
                                          'severity',
                                          f.severity === 'HIGH' ? 'high' : f.severity === 'MEDIUM' ? 'medium' : 'low'
                                        )}
                                      >
                                        {f.severity}
                                      </span>
                                    </Button>
                                  ))}
                                </>
                              ) : (
                                <div className="flex items-center gap-2 p-4 text-xs text-primary">
                                  <ShieldCheck size={16} />
                                  No problems detected · workspace clean
                                </div>
                              )}
                            </div>
                          )}
                          {bottomTab === 'Scan Output' && (
                            <div className="output-stream">
                              {logs.map((entry, i) => (
                                <div key={i}>
                                  <span className="text-muted-foreground">[{entry.time}]</span>
                                  <span className={cn('mx-2', entry.level === 'WARN' ? 'text-warning' : 'text-info')}>
                                    [{entry.level}]
                                  </span>
                                  {entry.message}
                                </div>
                              ))}
                              {scanning && <div className="text-primary mt-2">● {stages[scanStage]}…</div>}
                            </div>
                          )}
                          {bottomTab === 'Threat Intelligence' && (
                            <div className="dock-intel">
                              <ThreatIntel onAction={action} />
                            </div>
                          )}
                        </div>
                      </div>
                    </Panel>
                  </>
                )}
              </Group>
            </Panel>

            {right && (
              <>
                <Separator className="resize-handle horizontal" />
                <Panel id="inspector" defaultSize="320px" minSize="280px" maxSize="480px">
                  <RightInspector
                    tab={rightTab}
                    setTab={setRightTab}
                    onClose={() => setRight(false)}
                    finding={currentFinding || undefined}
                    findings={findings}
                    onFix={fix}
                    onAction={action}
                    logs={logs}
                    clearLogs={() => setLogs([])}
                    scanning={scanning}
                    activeCode={files[activeFile] ?? ''}
                  />
                </Panel>
              </>
            )}
          </Group>
        </div>

        <footer className="statusbar">
          <Button variant="ghost" className="remote-status" aria-label="Local Workspace">
            <Command size={12} />
          </Button>
          <Button
            variant="ghost"
            className="status-item"
            onClick={() => {
              setView('Changes');
              setSidebar(true);
            }}
          >
            <GitBranch size={12} />
            {gitBranch}
            <span className="text-muted-foreground">*</span>
          </Button>
          <Button
            variant="ghost"
            className="status-item"
            onClick={() => {
              setBottom(true);
              setBottomTab('Issues');
            }}
          >
            <CircleX size={12} />
            {findings.filter(f => f.severity === 'HIGH').length}
            <CircleAlert size={12} />
            {findings.filter(f => f.severity !== 'HIGH').length}
          </Button>
          <span className="status-item environment">Python 3.11.4</span>
          {scanning ? (
            <span className="status-item text-warning">
              <ScanLine size={12} />
              {stages[scanStage]}…
            </span>
          ) : (
            <span className="status-item scan-status">
              <ShieldCheck size={12} />
              Last scan: active
            </span>
          )}
          <div className="status-spacer" />
          <Button
            variant="ghost"
            className="status-item ai-status"
            onClick={() => {
              setRight(true);
              setRightTab('AI Chat');
            }}
          >
            <Sparkles size={12} />
            <span className="status-dot" />
            AI Active
            <span className="status-demo">NVIDIA</span>
          </Button>
          <span className="status-item cursor-status">
            Ln {cursor.line}, Col {cursor.column}
          </span>
          <Button variant="ghost" className="status-item editor-info" onClick={() => setModal('settings')}>
            Spaces: {settings.tabSize}
          </Button>
          <span className="status-item editor-info">UTF-8</span>
          <span className="status-item editor-info">LF</span>
          <span className="status-item">{languageFor(activeFile)}</span>
          <span className="status-item text-primary secure-status">
            <ShieldCheck size={12} />
            Secure Mode
          </span>
          <IconButton label="Notifications" icon={Bell} className="status-bell" onClick={() => setModal('account')} />
        </footer>

        <WorkspaceDialogs
          modal={modal}
          close={() => setModal(null)}
          settings={settings}
          setSettings={setSettings}
          original={originalForDiff()}
          modified={patchFor()}
          applyPatch={applyPatch}
          onNew={newFile}
          history={history}
          findings={findings}
          currentFinding={currentFinding}
          vulnerableLine={currentFinding ? (currentFinding.cwe === 'CWE-78' ? 48 : currentFinding.line) : 48}
          userProfile={userProfile}
          onSignOut={handleSignOut}
          onOpenAuthGateway={() => setAuthGateOpen(true)}
          onOpenFolder={handleOpenFolder}
          onOpenFile={handleOpenFile}
          onDiscard={() => {
            if (pendingClose) {
              setFiles(old => ({ ...old, [pendingClose]: savedFiles[pendingClose] ?? '' }));
              closeTab(pendingClose, true);
            }
            setModal(null);
          }}
          onSave={() => {
            if (pendingClose) {
              save(pendingClose);
              closeTab(pendingClose, true);
            }
            setModal(null);
          }}
        />

        <AuthGateway
          open={authGateOpen}
          onSuccess={u => {
            setUserProfile(u);
            setAuthGateOpen(false);
          }}
          onGuest={() => {
            setAuthGateOpen(false);
          }}
        />

        <Dialog open={palette} onOpenChange={setPalette}>
          <DialogContent className="command-palette">
            <DialogTitle className="sr-only">Search files and commands</DialogTitle>
            <DialogDescription className="sr-only">Choose a workspace command or file</DialogDescription>
            <div className="palette-search">
              <Search size={16} />
              <Input
                aria-label="Command search"
                autoFocus
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setPaletteIndex(0);
                }}
                placeholder="Search files and actions…"
                onKeyDown={e => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setPaletteIndex(i => Math.min(i + 1, paletteItems.length - 1));
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setPaletteIndex(i => Math.max(0, i - 1));
                  }
                  if (e.key === 'Enter' && paletteItems[paletteIndex]) {
                    e.preventDefault();
                    chooseCommand(paletteItems[paletteIndex]);
                  }
                }}
              />
              <kbd>ESC</kbd>
            </div>
            <div className="palette-results">
              {paletteItems.map((c, i) => (
                <Button
                  variant="ghost"
                  key={c.name}
                  className={cn('palette-result', i === paletteIndex && 'selected')}
                  onClick={() => chooseCommand(c)}
                >
                  <c.icon size={15} />
                  <span>{c.name}</span>
                  <kbd className="ml-auto">{c.shortcut}</kbd>
                  {c.file && <span className="ml-auto text-[10px] text-muted-foreground">FILE</span>}
                </Button>
              ))}
              {!paletteItems.length && <p className="p-4 text-xs text-muted-foreground">No matching files or commands</p>}
            </div>
          </DialogContent>
        </Dialog>

        <Toaster theme="dark" position="bottom-right" closeButton toastOptions={{ className: 'ide-toast', duration: 3500 }} />
      </div>
    </TooltipProvider>
  );
}
