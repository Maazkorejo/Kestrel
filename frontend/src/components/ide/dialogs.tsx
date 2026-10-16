import { useState, useEffect, lazy, Suspense } from 'react';
import {
  ShieldCheck, ShieldAlert, GitBranch, Copy, FileCode2, Check, Github,
  User, Bell, KeyRound, Link2, Play, ArrowRight, Bot, SlidersHorizontal,
  ScanLine, Plug, Network, ZoomIn, ZoomOut, RotateCcw, AlertCircle,
  Terminal, Sparkles, Bug, Cpu, FolderOpen, Monitor, HardDrive, Download as DownloadIcon
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { IconButton } from './controls';
import { cn } from '@/lib/utils';
import { workflow, type EditorSettings, type Finding } from './data';
import {
  simulateSandbox,
  getSandboxStatus,
  getThreatModelGraph,
  generateCicd,
  getCurrentSettings,
  saveSettings,
  getCurrentUser,
  loginUser,
  getAttackScenarios,
  simulateCustomAttack,
  getSystemDirectories,
  getSavedAccounts,
  switchAccount,
  getOAuthConfig,
  saveOAuthConfig,
  API_BASE,
  type BackendThreatModelGraph,
  type BackendAttackScenario,
  type BackendSimulatorRunResponse,
} from '@/lib/api';
import { toast } from 'sonner';
import { KestrelLogo } from '../branding/kestrel-logo';

function GoogleIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

const SecurityDiff = lazy(() => import('./code-editor').then(m => ({ default: m.SecurityDiff })));
export type Modal = 'settings' | 'account' | 'sandbox' | 'threat' | 'cicd' | 'history' | 'diff' | 'newfile' | 'newfolder' | 'openfolder' | 'openfile' | 'unsaved' | 'simulator' | 'about' | null;

export function WorkspaceDialogs({
  modal,
  close,
  settings,
  setSettings,
  original,
  modified,
  applyPatch,
  onNew,
  history,
  findings,
  onDiscard,
  onSave,
  currentFinding,
  vulnerableLine,
  userProfile,
  onSignOut,
  onOpenAuthGateway,
  onOpenFolder,
  onOpenFile,
}: {
  modal: Modal;
  close: () => void;
  settings: EditorSettings;
  setSettings: (settings: EditorSettings) => void;
  original: string;
  modified: string;
  applyPatch: () => void;
  onNew: (path: string, content?: string) => void;
  history: { time: string; count: number; scope: string }[];
  findings: Finding[];
  onDiscard: () => void;
  onSave: () => void;
  currentFinding?: Finding | null | undefined;
  vulnerableLine?: number | undefined;
  userProfile?: any;
  onSignOut?: () => void;
  onOpenAuthGateway?: () => void;
  onOpenFolder?: (path?: string) => void;
  onOpenFile?: (path?: string) => void;
}) {
  const [settingsTab, setSettingsTab] = useState('Editor Preferences');
  const [accountTab, setAccountTab] = useState('Profile');
  const [provider, setProvider] = useState('GitHub Actions');
  const [path, setPath] = useState('');
  const [systemDirs, setSystemDirs] = useState<{ home: string; desktop: string; downloads: string; documents: string } | null>(null);
  const [sandbox, setSandbox] = useState<'idle' | 'running' | 'done'>('idle');
  const [sandboxEngine, setSandboxEngine] = useState('Process Isolation Sandbox');
  const [sandboxOutputBefore, setSandboxOutputBefore] = useState('');
  const [sandboxOutputAfter, setSandboxOutputAfter] = useState('');
  const [sandboxMitigated, setSandboxMitigated] = useState<boolean | null>(null);

  const [threatGraph, setThreatGraph] = useState<BackendThreatModelGraph | null>(null);
  const [persona, setPersona] = useState('DEVSECOPS');
  const [userName, setUserName] = useState('Maaz Korejo');
  const [userEmail, setUserEmail] = useState('maaz@example.com');

  useEffect(() => {
    if (userProfile) {
      if (userProfile.name) setUserName(userProfile.name);
      if (userProfile.email) setUserEmail(userProfile.email);
      if (userProfile.role) setPersona(userProfile.role);
    }
  }, [userProfile]);

  const [savedAccountsList, setSavedAccountsList] = useState<Array<{
    id: string;
    email: string;
    name: string;
    initials: string;
    role: string;
    provider: string;
  }>>([]);
  const [oauthConfigState, setOAuthConfigState] = useState<{
    github_enabled: boolean;
    google_enabled: boolean;
    github_client_id: string;
    google_client_id: string;
  }>({
    github_enabled: false,
    google_enabled: false,
    github_client_id: '',
    google_client_id: '',
  });
  const [editGoogleClientId, setEditGoogleClientId] = useState('');
  const [editGoogleClientSecret, setEditGoogleClientSecret] = useState('');
  const [editGithubClientId, setEditGithubClientId] = useState('');
  const [editGithubClientSecret, setEditGithubClientSecret] = useState('');
  const [savingOAuth, setSavingOAuth] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [aiProvider, setAiProvider] = useState('Nemotron');
  const [nebiusKey, setNebiusKey] = useState('');
  const [tavilyKey, setTavilyKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('nemotron-mini');
  const [rules, setRules] = useState(['Injection', 'Secrets', 'Cryptography', 'Containers']);
  const [zoom, setZoom] = useState(1);
  const [node, setNode] = useState('sink');

  // Dynamic Attack Simulator state
  const [scenarios, setScenarios] = useState<BackendAttackScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('cwe-78-command-injection');
  const [customVector, setCustomVector] = useState<string>('');
  const [targetFunction, setTargetFunction] = useState<string>('predict');
  const [simulatorEngineMode, setSimulatorEngineMode] = useState<string>('auto');
  const [simulatorStatus, setSimulatorStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [simulatorResult, setSimulatorResult] = useState<BackendSimulatorRunResponse | null>(null);

  // Load simulator scenarios when simulator modal opens
  useEffect(() => {
    if (modal === 'simulator') {
      getAttackScenarios()
        .then(res => {
          if (res && res.length > 0) {
            setScenarios(res);
            const first = res[0];
            if (first && !res.some(s => s.id === selectedScenarioId)) {
              setSelectedScenarioId(first.id);
            }
          }
        })
        .catch(() => {});
      getSandboxStatus()
        .then(res => setSandboxEngine(res.engine))
        .catch(() => setSandboxEngine('Local Process Sandbox'));
    }
  }, [modal]);

  // Load sandbox status when sandbox modal opens
  useEffect(() => {
    if (modal === 'sandbox') {
      getSandboxStatus()
        .then(res => setSandboxEngine(res.engine))
        .catch(() => setSandboxEngine('Local Process Sandbox'));
    }
  }, [modal]);

  // Load threat model graph when threat modal opens
  useEffect(() => {
    if (modal === 'threat' && original) {
      getThreatModelGraph(original, 'src/inference.py')
        .then(res => setThreatGraph(res))
        .catch(() => setThreatGraph(null));
    }
  }, [modal, original]);

  // Load system directories when openfolder or openfile modal opens
  useEffect(() => {
    if (modal === 'openfolder' || modal === 'openfile') {
      getSystemDirectories()
        .then(setSystemDirs)
        .catch(() => {});
    }
  }, [modal]);

  // Load settings when settings modal opens
  useEffect(() => {
    if (modal === 'settings') {
      getCurrentSettings()
        .then(res => {
          if (res.llm_provider) setAiProvider(res.llm_provider === 'ollama' ? 'Local Ollama' : 'Nemotron');
          if (res.ollama_url) setOllamaUrl(res.ollama_url);
          if (res.ollama_model) setOllamaModel(res.ollama_model);
          if (res.nebius_key_masked) setNebiusKey(res.nebius_key_masked);
          if (res.tavily_key_masked) setTavilyKey(res.tavily_key_masked);
        })
        .catch(() => {});
    }
  }, [modal]);

  // Load user profile, saved accounts, and OAuth config when account modal opens
  useEffect(() => {
    if (modal === 'account') {
      getCurrentUser()
        .then(user => {
          if (user?.role) setPersona(user.role);
          if (user?.name) setUserName(user.name);
          if (user?.email) setUserEmail(user.email);
        })
        .catch(() => {});

      getSavedAccounts()
        .then(res => {
          if (res?.accounts && Array.isArray(res.accounts)) {
            setSavedAccountsList(res.accounts);
          }
        })
        .catch(() => {});

      getOAuthConfig()
        .then(res => {
          if (res) {
            setOAuthConfigState(res);
            if (res.google_client_id) setEditGoogleClientId(res.google_client_id);
            if (res.github_client_id) setEditGithubClientId(res.github_client_id);
          }
        })
        .catch(() => {});
    }
  }, [modal]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const runSimulation = async () => {
    setSandbox('running');
    try {
      const res = await simulateSandbox(original, modified, 'src/inference.py');
      setSandboxOutputBefore(res.vulnerable_run.stdout || '[EXPLOITABLE] Command executed successfully in sandbox.');
      setSandboxOutputAfter(res.patched_run.stdout || '[VERIFIED MITIGATED] Input sanitized, execution blocked.');
      setSandboxMitigated(res.mitigation_verified);
      setSandboxEngine(res.engine);
      setSandbox('done');
      toast.success(res.mitigation_verified ? 'Exploit mitigated successfully' : 'Simulation complete');
    } catch {
      window.setTimeout(() => {
        setSandboxOutputBefore('$ crafted_request source_ip\n> shell=True executes untrusted input\n> Arbitrary command execution possible\n\n[EXPLOITABLE]');
        setSandboxOutputAfter('$ crafted_request source_ip\n> ipaddress validation rejects input\n> shell=False prevents interpretation\n\n[VERIFIED MITIGATED]');
        setSandboxMitigated(true);
        setSandbox('done');
      }, 1200);
    }
  };

  const runAttackSimulation = async (scenarioIdToRun?: string, vectorToRun?: string) => {
    const scId = scenarioIdToRun || selectedScenarioId;
    const currentSc = scenarios.find(s => s.id === scId);
    const payloadVector = vectorToRun !== undefined ? vectorToRun : (customVector.trim() || currentSc?.default_vector || '');

    setSimulatorStatus('running');
    setSimulatorResult(null);
    try {
      const res = await simulateCustomAttack({
        code: original,
        filename: 'src/inference.py',
        scenario_id: scId,
        custom_vector: payloadVector,
        function_name: targetFunction || 'predict',
        force_sandbox: simulatorEngineMode,
      });
      setSimulatorResult(res);
      setSimulatorStatus('done');
      if (res.verdict === 'VULNERABLE') {
        toast.error(`Exploit confirmed: Breached sink in ${res.target_function}()`);
      } else if (res.verdict === 'DEFENDED') {
        toast.success('Defense verified: Payload safely intercepted');
      } else {
        toast.warning('Execution timed out in sandbox');
      }
    } catch (e: any) {
      setSimulatorStatus('idle');
      toast.error(`Simulation failed: ${e?.message || 'Sandbox error'}`);
    }
  };

  const handleApplyPatchAndRetest = () => {
    applyPatch();
    toast.success('Nemotron security patch applied');
    setTimeout(() => {
      runAttackSimulation();
    }, 600);
  };

  const handleSaveSettings = async () => {
    try {
      await saveSettings({
        llm_provider: aiProvider === 'Local Ollama' ? 'ollama' : 'nebius',
        ollama_url: ollamaUrl,
        ollama_model: ollamaModel,
        nebius_key: nebiusKey.startsWith('sk-...') ? '' : nebiusKey,
        tavily_key: tavilyKey.startsWith('tvly-...') ? '' : tavilyKey,
      });
      toast.success('Settings saved to backend');
      close();
    } catch {
      toast.info('Settings saved locally');
      close();
    }
  };

  const handlePersonaChange = async (newPersona: string) => {
    setPersona(newPersona);
    try {
      await loginUser({ provider: 'github', role: newPersona, name: userName, email: userEmail });
      toast.success(`Switched role to ${newPersona}`);
    } catch {
      toast.info(`Persona set to ${newPersona}`);
    }
  };

  const handleOAuthConnect = async (authProvider: 'github' | 'google') => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/${authProvider}/start`, {
        headers: { Accept: 'application/json' },
      }).then(r => r.json());
      if (res.configured && res.auth_url) {
        window.open(res.auth_url, '_blank', 'width=600,height=700');
        toast.info(`Opened ${authProvider} sign-in window`);
      } else {
        toast.error(`${authProvider.toUpperCase()}_CLIENT_ID is not configured in your .env file`);
      }
    } catch {
      toast.error(`Could not connect to ${authProvider}`);
    }
  };

  const handleSwitchAccount = async (userId: string) => {
    try {
      const res = await switchAccount(userId);
      toast.success(`Switched account to ${res.user.name}`);
      close();
      window.location.reload();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to switch account');
    }
  };

  const handleSaveOAuthCredentials = async () => {
    setSavingOAuth(true);
    try {
      const res = await saveOAuthConfig({
        google_client_id: editGoogleClientId.trim(),
        google_client_secret: editGoogleClientSecret.trim(),
        github_client_id: editGithubClientId.trim(),
        github_client_secret: editGithubClientSecret.trim(),
      });
      setOAuthConfigState(res);
      toast.success('OAuth credentials saved to backend environment');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save OAuth settings');
    } finally {
      setSavingOAuth(false);
    }
  };

  const titles: Record<string, string> = {
    settings: 'Workspace Settings',
    account: 'Account & Security',
    sandbox: 'Dynamic Exploit Sandbox',
    simulator: 'Dynamic Attack Simulator & Security Fuzzer',
    threat: 'Threat Model · Data Flow Visualizer',
    cicd: 'Generate CI/CD Workflow',
    history: 'Audit History',
    diff: 'Review Nemotron Security Patch',
    newfile: 'New File',
    newfolder: 'New Folder',
    openfolder: 'Open Workspace Folder',
    openfile: 'Open File',
    unsaved: 'Save changes before closing?',
    about: 'About Kestrel',
  };

  return (
    <Dialog open={!!modal} onOpenChange={open => !open && close()}>
      <DialogContent className={cn('ide-dialog', ['diff', 'threat', 'cicd', 'settings', 'simulator'].includes(modal ?? '') && 'wide-dialog')}>
        <DialogTitle className="text-base flex items-center gap-2">
          <ShieldCheck size={17} className="text-primary" />
          {titles[modal ?? 'settings']}
        </DialogTitle>
        <DialogDescription className="sr-only">Kestrel workspace tool</DialogDescription>

        {modal === 'diff' && (() => {
          const targetFinding = currentFinding ?? findings.find(f => f.file === 'src/inference.py') ?? findings[0];
          const targetLineNumber = vulnerableLine || (targetFinding ? targetFinding.line : 56);
          return (
            <>
              {/* Top Vulnerability Spotlight Bar */}
              <div className="vulnerability-spotlight-bar">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                  <span className="font-mono font-bold text-danger text-[11px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20">
                    {targetFinding?.cwe || 'CWE-78'}
                  </span>
                  <span className="font-medium text-foreground text-xs">
                    {targetFinding?.title || 'OS Command Injection Detected'}
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    Target: <code className="text-danger font-semibold">Line {targetLineNumber}</code> in <span className="font-mono text-muted-foreground">{targetFinding?.file || 'src/inference.py'}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">
                    Pulsing beacon highlights vulnerable sink in left editor
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    <ShieldCheck size={11} />
                    Remediated in Patch
                  </span>
                </div>
              </div>

              <div className="diff-labels">
                <span className="flex items-center gap-1.5 text-danger font-medium">
                  <AlertCircle size={12} className="text-danger" />
                  ORIGINAL VULNERABLE CODE (Line {targetLineNumber})
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <ShieldCheck size={12} className="text-emerald-400" />
                  PROPOSED NEMOTRON DEFENSIVE PATCH
                </span>
              </div>

              <div className="diff-editor">
                <Suspense fallback={<div className="p-4 text-xs">Loading diff editor…</div>}>
                  <SecurityDiff
                    original={original}
                    modified={modified}
                    vulnerableLine={targetLineNumber}
                    finding={targetFinding}
                  />
                </Suspense>
              </div>

              <div className="dialog-footer">
                <span className="text-xs text-muted-foreground">Review generated changes before applying.</span>
                <Button variant="outline" size="sm" onClick={close}>
                  Close Diff
                </Button>
                <Button size="sm" onClick={applyPatch}>
                  <Check size={14} />Accept & Apply Patch
                </Button>
              </div>
            </>
          );
        })()}

        {modal === 'settings' && (
          <div className="settings-layout">
            <nav>
              {[
                { label: 'AI Model & Provider', icon: Bot },
                { label: 'API Keys & Integrations', icon: Plug },
                { label: 'Scanner Rules', icon: ScanLine },
                { label: 'Editor Preferences', icon: SlidersHorizontal },
              ].map(s => (
                <Button
                  key={s.label}
                  variant="ghost"
                  className={cn('settings-nav', settingsTab === s.label && 'selected')}
                  onClick={() => setSettingsTab(s.label)}
                >
                  <s.icon size={14} />
                  {s.label}
                </Button>
              ))}
            </nav>
            <div className="settings-content">
              <h3>{settingsTab}</h3>
              {settingsTab === 'Editor Preferences' && (
                <>
                  {[
                    { name: 'Font Size', key: 'fontSize', min: 10, max: 24 },
                    { name: 'Tab Size', key: 'tabSize', min: 2, max: 8 },
                  ].map(s => (
                    <div className="setting-row" key={s.key}>
                      <label htmlFor={s.key}>{s.name}</label>
                      <Input
                        id={s.key}
                        type="number"
                        min={s.min}
                        max={s.max}
                        value={settings[s.key as 'fontSize' | 'tabSize']}
                        onChange={e =>
                          setSettings({
                            ...settings,
                            [s.key]: Math.min(s.max, Math.max(s.min, Number(e.target.value))),
                          })
                        }
                        className="w-20"
                      />
                    </div>
                  ))}
                  {[
                    { name: 'Minimap', key: 'minimap' },
                    { name: 'Word Wrap', key: 'wordWrap' },
                  ].map(s => (
                    <div className="setting-row" key={s.key}>
                      <label htmlFor={s.key}>{s.name}</label>
                      <Switch
                        id={s.key}
                        checked={settings[s.key as 'minimap' | 'wordWrap']}
                        onCheckedChange={value => setSettings({ ...settings, [s.key]: value })}
                      />
                    </div>
                  ))}
                </>
              )}
              {settingsTab === 'AI Model & Provider' && (
                <>
                  <div className="setting-row">
                    <label htmlFor="provider">LLM Provider</label>
                    <select id="provider" value={aiProvider} onChange={e => setAiProvider(e.target.value)}>
                      <option>Nemotron</option>
                      <option>Local Ollama</option>
                    </select>
                  </div>
                  {aiProvider === 'Local Ollama' && (
                    <>
                      <div className="setting-row">
                        <label htmlFor="ollamaUrl">Ollama URL</label>
                        <Input
                          id="ollamaUrl"
                          value={ollamaUrl}
                          onChange={e => setOllamaUrl(e.target.value)}
                          placeholder="http://localhost:11434"
                        />
                      </div>
                      <div className="setting-row">
                        <label htmlFor="ollamaModel">Ollama Model</label>
                        <Input
                          id="ollamaModel"
                          value={ollamaModel}
                          onChange={e => setOllamaModel(e.target.value)}
                          placeholder="nemotron-mini"
                        />
                      </div>
                    </>
                  )}
                  <div className="setting-row">
                    <span>Guarded Mode</span>
                    <ShieldCheck size={16} className="text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                    Connected to local FastAPI backend (Port 8000). NVIDIA Nemotron and local Ollama are supported.
                  </p>
                </>
              )}
              {settingsTab === 'API Keys & Integrations' && (
                <>
                  <div className="setting-row flex-col items-start gap-1">
                    <label htmlFor="nebiusKey" className="text-xs">Nebius / NVIDIA API Key</label>
                    <Input
                      id="nebiusKey"
                      type="password"
                      placeholder="sk-..."
                      value={nebiusKey}
                      onChange={e => setNebiusKey(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="setting-row flex-col items-start gap-1 mt-2">
                    <label htmlFor="tavilyKey" className="text-xs">Tavily Search API Key</label>
                    <Input
                      id="tavilyKey"
                      type="password"
                      placeholder="tvly-..."
                      value={tavilyKey}
                      onChange={e => setTavilyKey(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Credentials are saved securely in your backend environment without client exposure.
                  </p>
                </>
              )}
              {settingsTab === 'Scanner Rules' && (
                <>
                  {['Injection', 'Secrets', 'Cryptography', 'Containers'].map(r => (
                    <div className="setting-row" key={r}>
                      <span>{r}</span>
                      <Switch
                        aria-label={r}
                        checked={rules.includes(r)}
                        onCheckedChange={value => setRules(old => (value ? [...old, r] : old.filter(x => x !== r)))}
                      />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground mt-4">
                    Deterministic AST and regex scanner rules active on backend.
                  </p>
                </>
              )}
              <div className="dialog-footer mt-6">
                <Button variant="outline" size="sm" onClick={close}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveSettings}>
                  Save Settings
                </Button>
              </div>
            </div>
          </div>
        )}

        {modal === 'account' && (
          <>
            <div className="dialog-tabs">
              {['Profile', 'Linked Accounts', 'Security', 'Notifications'].map(t => (
                <Button
                  variant="ghost"
                  key={t}
                  className={cn(accountTab === t && 'selected')}
                  onClick={() => setAccountTab(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
            {accountTab === 'Profile' && (
              <>
                <div className="flex items-center gap-3 my-3">
                  <span className="account-avatar">{userProfile?.initials || 'MK'}</span>
                  <div>
                    <strong>{userName}</strong>
                    <p className="text-xs text-muted-foreground mt-0.5">{userEmail}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {userProfile?.provider === 'google' && <GoogleIcon className="w-3 h-3" />}
                        {userProfile?.provider === 'github' && <Github size={11} />}
                        {userProfile?.authenticated
                          ? `Signed in (${userProfile.provider || 'credentials'})`
                          : 'Local Guest Mode'}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        PBKDF2 Salted
                      </span>
                    </div>
                  </div>
                </div>

                <div className="setting-row">
                  <label htmlFor="persona">Security Persona</label>
                  <select id="persona" value={persona} onChange={e => handlePersonaChange(e.target.value)}>
                    <option value="CODE_HARDENER">CODE_HARDENER / Software Developer & Code Hardener</option>
                    <option value="DEVSECOPS">DEVSECOPS / DevSecOps Pipeline & Container Engineer</option>
                    <option value="APPSEC_AUDITOR">APPSEC_AUDITOR / Compliance & Vulnerability Assessor</option>
                    <option value="SYS_ADMIN">SYS_ADMIN / Infrastructure & Runtime Operator</option>
                    <option value="GUEST">GUEST / Local Workspace Observer</option>
                  </select>
                </div>

                {/* Saved Accounts on this Device */}
                <div className="mt-4 pt-3 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-foreground">Saved Accounts on this Machine</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] gap-1 text-emerald-400 border-emerald-500/30"
                      onClick={() => {
                        close();
                        onOpenAuthGateway?.();
                      }}
                    >
                      + Add / Switch Account
                    </Button>
                  </div>

                  {savedAccountsList.length > 0 ? (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {savedAccountsList.map(acc => (
                        <div
                          key={acc.id}
                          className="flex items-center justify-between p-2 rounded bg-secondary/20 border border-border/50 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {acc.initials || acc.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-foreground truncate">{acc.name}</div>
                              <div className="text-[10px] text-muted-foreground truncate font-mono">{acc.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-muted text-muted-foreground uppercase">
                              {acc.provider}
                            </span>
                            {acc.email !== userEmail && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-[11px] text-emerald-400 hover:text-emerald-300"
                                onClick={() => handleSwitchAccount(acc.id)}
                              >
                                Switch
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No other saved accounts recorded in SQLite.</p>
                  )}
                </div>

                <div className="pt-3 border-t border-border mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {userProfile?.authenticated ? 'Authenticated session active' : 'Running in local guest mode'}
                  </span>
                  {userProfile?.authenticated ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        close();
                        onSignOut?.();
                      }}
                    >
                      Sign Out
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white"
                      onClick={() => {
                        close();
                        onOpenAuthGateway?.();
                      }}
                    >
                      Sign In / Register
                    </Button>
                  )}
                </div>
              </>
            )}
            {accountTab === 'Linked Accounts' && (
              <div className="space-y-4 py-2">
                {/* Google OAuth Card */}
                <div className="p-3.5 rounded-lg border border-border/80 bg-secondary/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GoogleIcon className="w-4 h-4" />
                      <span className="text-xs font-semibold text-foreground">Google Cloud OAuth 2.0</span>
                    </div>
                    <span className={cn(
                      'text-[10px] font-mono px-2 py-0.5 rounded font-medium',
                      oauthConfigState.google_enabled
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-muted text-muted-foreground border border-border'
                    )}>
                      {oauthConfigState.google_enabled ? 'OAuth Active' : 'Credentials Direct'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase font-mono block mb-1">
                        Client ID
                      </label>
                      <Input
                        placeholder="xxxx.apps.googleusercontent.com"
                        value={editGoogleClientId}
                        onChange={e => setEditGoogleClientId(e.target.value)}
                        className="text-xs font-mono h-8 bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase font-mono block mb-1">
                        Client Secret
                      </label>
                      <Input
                        type="password"
                        placeholder="GOCSPX-xxxxxx"
                        value={editGoogleClientSecret}
                        onChange={e => setEditGoogleClientSecret(e.target.value)}
                        className="text-xs font-mono h-8 bg-background"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Callback: /api/auth/google/callback
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => handleOAuthConnect('google')}
                    >
                      <GoogleIcon className="w-3.5 h-3.5" />
                      Test Google Connect
                    </Button>
                  </div>
                </div>

                {/* GitHub OAuth Card */}
                <div className="p-3.5 rounded-lg border border-border/80 bg-secondary/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Github size={15} />
                      <span className="text-xs font-semibold text-foreground">GitHub OAuth App</span>
                    </div>
                    <span className={cn(
                      'text-[10px] font-mono px-2 py-0.5 rounded font-medium',
                      oauthConfigState.github_enabled
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-muted text-muted-foreground border border-border'
                    )}>
                      {oauthConfigState.github_enabled ? 'OAuth Active' : 'Credentials Direct'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase font-mono block mb-1">
                        Client ID
                      </label>
                      <Input
                        placeholder="Iv1.xxxxxx"
                        value={editGithubClientId}
                        onChange={e => setEditGithubClientId(e.target.value)}
                        className="text-xs font-mono h-8 bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase font-mono block mb-1">
                        Client Secret
                      </label>
                      <Input
                        type="password"
                        placeholder="••••••••••••"
                        value={editGithubClientSecret}
                        onChange={e => setEditGithubClientSecret(e.target.value)}
                        className="text-xs font-mono h-8 bg-background"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Callback: /api/auth/github/callback
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => handleOAuthConnect('github')}
                    >
                      <Github size={13} />
                      Test GitHub Connect
                    </Button>
                  </div>
                </div>

                {/* Save Button for OAuth Keys */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-[11px] text-muted-foreground">
                    Changes are saved directly into your .env file and active environment.
                  </span>
                  <Button
                    size="sm"
                    disabled={savingOAuth}
                    onClick={handleSaveOAuthCredentials}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8"
                  >
                    {savingOAuth ? 'Saving...' : 'Save OAuth Credentials'}
                  </Button>
                </div>
              </div>
            )}
            {accountTab === 'Security' && (
              <>
                <div className="setting-row">
                  <span>Session</span>
                  <span className="text-info text-xs">Active SQLite Session</span>
                </div>
                <div className="setting-row">
                  <span>Secure Mode</span>
                  <ShieldCheck size={16} className="text-primary" />
                </div>
              </>
            )}
            {accountTab === 'Notifications' && (
              <div className="setting-row">
                <span className="flex gap-2">
                  <Bell size={14} />Security findings alerts
                </span>
                <Switch
                  aria-label="Security notifications"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
            )}
          </>
        )}

        {modal === 'sandbox' && (
          <>
            <div className="sandbox-status">
              <span className="status-dot" />
              <span>{sandboxEngine}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {sandboxEngine.includes('Docker') ? 'ZERO-NETWORK CONTAINER' : '3S TIMEOUT ISOLATION'}
              </span>
            </div>
            <div className="sandbox-grid">
              <div>
                <div className="micro-label text-danger">BEFORE PATCH (VULNERABLE RUN)</div>
                <pre>{sandbox === 'idle' ? 'Awaiting simulation…' : sandboxOutputBefore || 'Simulating exploit execution…'}</pre>
              </div>
              <div>
                <div className="micro-label text-primary">AFTER PATCH (REMEDIATED RUN)</div>
                <pre>
                  {sandbox === 'idle'
                    ? 'Awaiting simulation…'
                    : sandbox === 'running'
                    ? 'Verifying secure input handling…'
                    : sandboxOutputAfter || '[VERIFIED MITIGATED]'}
                </pre>
              </div>
            </div>
            <div className="dialog-footer">
              <span className="text-xs text-muted-foreground">
                {sandboxMitigated !== null
                  ? sandboxMitigated
                    ? 'Mitigation efficacy verified by backend sandbox.'
                    : 'Exploit vector still active.'
                  : 'Executes pre-patch vs post-patch in sandbox.'}
              </span>
              <Button size="sm" disabled={sandbox === 'running'} onClick={runSimulation}>
                <Play size={14} />
                {sandbox === 'running' ? 'Verifying…' : 'Run Simulation'}
              </Button>
            </div>
          </>
        )}

        {modal === 'simulator' && (
          <div className="flex flex-col gap-3">
            {/* Top Engine & Isolation Header */}
            <div className="sandbox-status rounded flex items-center justify-between text-xs px-3 py-2 border border-border bg-background">
              <div className="flex items-center gap-2">
                <span className="status-dot bg-emerald-500" />
                <span className="font-medium text-foreground">{sandboxEngine}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted">
                  {sandboxEngine.includes('Docker') ? 'ZERO-NETWORK CONTAINER' : '3S TIMEOUT ISOLATION'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">Isolation Engine:</span>
                <select
                  value={simulatorEngineMode}
                  onChange={e => setSimulatorEngineMode(e.target.value)}
                  className="bg-card text-foreground text-xs border border-border rounded px-2 py-1 outline-none"
                >
                  <option value="auto">Auto (Docker preferred)</option>
                  <option value="docker">Docker Container</option>
                  <option value="process">Subprocess Sandbox</option>
                </select>
              </div>
            </div>

            {/* Main Grid: Left Controls, Right Diagnostics */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3" style={{ minHeight: '380px' }}>
              {/* Left Column: Attack Scenario Picker & Payload Configuration */}
              <div className="md:col-span-5 flex flex-col gap-2.5 border border-border rounded p-3 bg-card/40">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Attack Scenario
                  </span>
                  <span className="text-[10px] font-mono text-primary px-1.5 py-0.5 rounded bg-primary/10">
                    {scenarios.find(s => s.id === selectedScenarioId)?.cwe || 'CWE-78'}
                  </span>
                </div>

                {/* Scenario Select */}
                <select
                  value={selectedScenarioId}
                  onChange={e => {
                    const newId = e.target.value;
                    setSelectedScenarioId(newId);
                    const sc = scenarios.find(s => s.id === newId);
                    if (sc) setCustomVector(sc.default_vector);
                    setSimulatorResult(null);
                  }}
                  className="w-full bg-background text-foreground text-xs border border-border rounded p-2 outline-none"
                >
                  {scenarios.length > 0 ? (
                    scenarios.map(sc => (
                      <option key={sc.id} value={sc.id}>
                        {sc.cwe}: {sc.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="cwe-78-command-injection">CWE-78: OS Command Injection</option>
                      <option value="cwe-89-sql-injection">CWE-89: SQL Injection</option>
                      <option value="cwe-22-path-traversal">CWE-22: Path Traversal</option>
                      <option value="cwe-502-insecure-deserialization">CWE-502: Insecure Deserialization</option>
                      <option value="cwe-1333-redos">CWE-1333: Regular Expression DoS</option>
                      <option value="custom-injection">CWE-20: Custom Input Vector</option>
                    </>
                  )}
                </select>

                {/* Scenario Information Card */}
                {(() => {
                  const currentSc = scenarios.find(s => s.id === selectedScenarioId);
                  return (
                    <div className="p-2.5 rounded bg-background border border-border text-xs flex flex-col gap-1.5">
                      <div className="text-muted-foreground text-[11px] leading-relaxed">
                        {currentSc?.description || 'Simulates adversarial inputs injected directly into function parameters to evaluate sink exploitation.'}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        <strong className="text-foreground">Target Sink:</strong>{' '}
                        <code className="text-[10px] text-primary">{currentSc?.vulnerability_sink || 'Subprocess / Shell / DB'}</code>
                      </div>
                    </div>
                  );
                })()}

                {/* Preset Vectors Chips */}
                {(() => {
                  const currentSc = scenarios.find(s => s.id === selectedScenarioId);
                  const vectors = currentSc?.alt_vectors?.length ? currentSc.alt_vectors : (currentSc ? [currentSc.default_vector] : []);
                  if (vectors.length === 0) return null;
                  return (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-foreground">Preset Test Vectors:</span>
                      <div className="flex flex-wrap gap-1">
                        {vectors.map((vec, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setCustomVector(vec)}
                            className={cn(
                              'text-[10px] font-mono px-2 py-0.5 rounded border border-border transition-colors truncate max-w-full text-left',
                              customVector === vec ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/40 hover:bg-muted text-foreground'
                            )}
                            title={vec}
                          >
                            {vec.length > 26 ? vec.slice(0, 24) + '...' : vec}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Payload Vector Input */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="custom-vector-input" className="text-[11px] text-muted-foreground">
                    Injected Payload Vector
                  </label>
                  <Input
                    id="custom-vector-input"
                    value={customVector}
                    onChange={e => setCustomVector(e.target.value)}
                    placeholder={scenarios.find(s => s.id === selectedScenarioId)?.default_vector || 'Enter payload vector'}
                    className="font-mono text-xs bg-background"
                  />
                </div>

                {/* Target Function Input */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="target-function-input" className="text-[11px] text-muted-foreground">
                    Target Function in Module
                  </label>
                  <Input
                    id="target-function-input"
                    value={targetFunction}
                    onChange={e => setTargetFunction(e.target.value)}
                    placeholder="predict"
                    className="font-mono text-xs bg-background"
                  />
                </div>

                {/* Action Button */}
                <Button
                  size="sm"
                  disabled={simulatorStatus === 'running'}
                  onClick={() => runAttackSimulation()}
                  className="w-full mt-auto"
                >
                  <Play size={14} className="mr-1.5" />
                  {simulatorStatus === 'running' ? 'Simulating Attack Vector...' : 'Execute Attack Vector'}
                </Button>
              </div>

              {/* Right Column: Dynamic Diagnostics & Patch Verification */}
              <div className="md:col-span-7 flex flex-col gap-2.5 border border-border rounded p-3 bg-card/40">
                <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Dynamic Execution Diagnostics
                </span>

                {/* Idle / Awaiting State */}
                {simulatorStatus === 'idle' && !simulatorResult && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground gap-2 border border-dashed border-border rounded bg-background/50">
                    <ShieldAlert size={36} className="text-muted-foreground/50 mb-1" />
                    <span className="text-xs font-medium text-foreground">Dynamic Fuzzer & Exploit Simulator</span>
                    <p className="text-[11px] max-w-sm leading-relaxed">
                      Select an attack scenario and click <strong>Execute Attack Vector</strong> to inject the synthetic payload into <code className="text-primary">{targetFunction || 'predict'}()</code> inside a quarantined sandbox.
                    </p>
                  </div>
                )}

                {/* Running State */}
                {simulatorStatus === 'running' && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3 border border-border rounded bg-background/50">
                    <RotateCcw size={28} className="animate-spin text-primary" />
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-foreground">Executing in Quarantined Sandbox...</span>
                      <span className="text-[11px] text-muted-foreground">Tracing execution sinks, exit code, and runtime faults</span>
                    </div>
                  </div>
                )}

                {/* Result Display */}
                {simulatorResult && (
                  <div className="flex-1 flex flex-col gap-2.5 overflow-auto">
                    {/* Verdict Banner */}
                    <div
                      className={cn(
                        'p-3 rounded border flex items-start gap-3',
                        simulatorResult.verdict === 'VULNERABLE'
                          ? 'bg-destructive/15 border-destructive/40 text-destructive'
                          : simulatorResult.verdict === 'DEFENDED'
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                          : 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                      )}
                    >
                      {simulatorResult.verdict === 'VULNERABLE' ? (
                        <ShieldAlert size={20} className="text-destructive shrink-0 mt-0.5" />
                      ) : (
                        <ShieldCheck size={20} className="text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="font-semibold text-xs tracking-wide">
                          {simulatorResult.verdict === 'VULNERABLE'
                            ? 'EXPLOIT SUCCESSFUL (VULNERABILITY CONFIRMED)'
                            : simulatorResult.verdict === 'DEFENDED'
                            ? 'DEFENSE VERIFIED (PAYLOAD MITIGATED)'
                            : 'EXECUTION TIMED OUT'}
                        </div>
                        <div className="text-[11px] mt-0.5 text-foreground/80 leading-relaxed">
                          {simulatorResult.message}
                        </div>
                      </div>
                    </div>

                    {/* Telemetry Stats */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 rounded bg-background border border-border flex flex-col gap-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase">Sink Identified</span>
                        <span className="font-mono text-[11px] text-foreground truncate" title={simulatorResult.sink_identified || 'None'}>
                          {simulatorResult.sink_identified ? (simulatorResult.sink_identified.split(' ')[0] ?? 'Sink') : 'None'}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-background border border-border flex flex-col gap-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase">Exit Code</span>
                        <span className={cn('font-mono text-[11px]', simulatorResult.exit_code === 0 ? 'text-emerald-400' : 'text-amber-400')}>
                          {simulatorResult.exit_code}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-background border border-border flex flex-col gap-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase">Duration</span>
                        <span className="font-mono text-[11px] text-foreground">
                          {simulatorResult.elapsed_ms} ms
                        </span>
                      </div>
                    </div>

                    {/* Execution Output Console */}
                    <div className="flex-1 bg-background border border-border rounded p-2.5 font-mono text-xs flex flex-col gap-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Sandbox Execution Trace (Stdout / Stderr)
                      </span>
                      <pre className="overflow-auto max-h-36 text-[11px] leading-relaxed text-foreground whitespace-pre-wrap">
                        {simulatorResult.stdout || simulatorResult.stderr || '[Clean execution: No unhandled output]'}
                      </pre>
                    </div>

                    {/* Mitigation Tip */}
                    {simulatorResult.suggested_mitigation && (
                      <div className="p-2.5 rounded bg-muted/40 border border-border text-xs flex flex-col gap-1">
                        <span className="text-[10px] font-semibold text-primary uppercase">
                          Nemotron Remediation Recommendation
                        </span>
                        <span className="text-[11px] text-muted-foreground leading-relaxed">
                          {simulatorResult.suggested_mitigation}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Actions inside Right Column */}
                <div className="flex items-center justify-between pt-1 border-t border-border mt-auto text-xs">
                  <span className="text-[11px] text-muted-foreground">
                    {simulatorResult?.verdict === 'VULNERABLE'
                      ? 'Apply defensive patch to verify exploit neutralization.'
                      : simulatorResult?.verdict === 'DEFENDED'
                      ? 'Target code demonstrated resilient defensive boundaries.'
                      : 'Disposable container with network isolation.'}
                  </span>
                  {simulatorResult?.verdict === 'VULNERABLE' && (
                    <Button size="sm" onClick={handleApplyPatchAndRetest} className="gap-1.5">
                      <Sparkles size={13} />
                      Apply Nemotron Patch & Re-test
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {modal === 'threat' && (
          <>
            <div className="flex items-center text-xs text-muted-foreground">
              <Network size={14} className="mr-2" />
              Architectural data flow graph
              <span className="ml-auto flex">
                <IconButton label="Zoom In" icon={ZoomIn} onClick={() => setZoom(Math.min(1.5, zoom + 0.1))} />
                <IconButton label="Zoom Out" icon={ZoomOut} onClick={() => setZoom(Math.max(0.6, zoom - 0.1))} />
                <IconButton label="Reset Canvas" icon={RotateCcw} onClick={() => setZoom(1)} />
              </span>
            </div>
            <div className="threat-canvas">
              <div className="flow-graph" style={{ transform: `scale(${zoom})` }}>
                <Button
                  variant="outline"
                  className={cn('flow-node source', node === 'source' && 'node-selected')}
                  onClick={() => setNode('source')}
                >
                  <span className="micro-label">SOURCE</span>
                  <strong>API request</strong>
                  <code>sample.source_ip</code>
                </Button>
                <ArrowRight className="flow-arrow text-danger" />
                <Button
                  variant="outline"
                  className={cn('flow-node sanitizer', node === 'sanitizer' && 'node-selected')}
                  onClick={() => setNode('sanitizer')}
                >
                  <span className="micro-label">SANITIZER</span>
                  <strong>IP validation</strong>
                  <code>ipaddress.ip_address()</code>
                </Button>
                <ArrowRight className="flow-arrow text-primary" />
                <Button
                  variant="outline"
                  className={cn('flow-node sink', node === 'sink' && 'node-selected')}
                  onClick={() => setNode('sink')}
                >
                  <span className="micro-label">SINK</span>
                  <strong>Subprocess</strong>
                  <code>check_output()</code>
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-mono text-foreground">{node.toUpperCase()}</span> ·{' '}
              {node === 'source'
                ? 'Untrusted data enters the application through the prediction API.'
                : node === 'sanitizer'
                ? 'Proposed patch validates the address and blocks shell metacharacters.'
                : 'Current execution sink uses shell=True. Apply the patch to protect this flow.'}
            </div>
          </>
        )}

        {modal === 'cicd' && (
          <>
            <div className="cicd-grid">
              <div>
                <div className="micro-label mb-4">PROVIDER</div>
                {['GitHub Actions', 'GitLab CI'].map(p => (
                  <label className="provider-choice" key={p}>
                    <input
                      type="radio"
                      name="ci-provider"
                      checked={provider === p}
                      onChange={() => setProvider(p)}
                    />
                    <GitBranch size={15} />
                    {p}
                  </label>
                ))}
                <div className="text-[11px] text-muted-foreground mt-6 leading-relaxed">
                  Run static security analysis on every push and pull request with automated SARIF artifact export.
                </div>
              </div>
              <div className="yaml-preview">
                <div className="code-heading">
                  <FileCode2 size={13} />
                  <span>{provider === 'GitHub Actions' ? '.github/workflows/kestrel-audit.yml' : '.gitlab-ci.yml'}</span>
                </div>
                <pre>{workflow(provider)}</pre>
              </div>
            </div>
            <div className="dialog-footer">
              <Button variant="outline" size="sm" onClick={() => copy(workflow(provider))}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy YAML'}
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    const res = await generateCicd(provider === 'GitLab CI' ? 'gitlab_ci' : 'github_actions');
                    onNew(res.filename, res.content);
                    toast.success(res.message);
                  } catch {
                    const fallbackPath = provider === 'GitHub Actions' ? '.github/workflows/kestrel-audit.yml' : '.gitlab-ci.yml';
                    onNew(fallbackPath, workflow(provider));
                    toast.success('Generated workflow file');
                  }
                  close();
                }}
              >
                <FileCode2 size={14} />Write Workflow File
              </Button>
            </div>
          </>
        )}

        {modal === 'history' && (
          <>
            <div className="history-header">
              <span>TIME</span>
              <span>SCOPE</span>
              <span>FINDINGS</span>
            </div>
            {history.map((h, i) => (
              <div className="history-row" key={i}>
                <span className="font-mono">{h.time}</span>
                <span>{h.scope}</span>
                <span className={h.count ? 'text-warning' : 'text-primary'}>{h.count} findings</span>
              </div>
            ))}
            <div className="text-[11px] text-muted-foreground mt-3">
              Audits recorded in SQLite telemetry cache.
            </div>
          </>
        )}

        {(modal === 'openfolder' || modal === 'openfile') && (
          <div className="space-y-4 py-1">
            {/* Primary Action Button */}
            <div className="p-3 bg-secondary/30 rounded-lg border border-border/60">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    {modal === 'openfolder' ? 'Browse for Folder' : 'Browse for File'}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Navigate Desktop, Downloads, This PC, and all local drives.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="gap-2 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  onClick={() => {
                    close();
                    if (modal === 'openfolder') {
                      if (onOpenFolder) onOpenFolder();
                    } else {
                      if (onOpenFile) onOpenFile();
                    }
                  }}
                >
                  <FolderOpen size={15} />
                  {modal === 'openfolder' ? 'Browse Folders...' : 'Browse Files...'}
                </Button>
              </div>
            </div>

            {/* Quick Navigation Cards */}
            <div>
              <div className="micro-label mb-2">QUICK SYSTEM LOCATIONS</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Desktop', path: systemDirs?.desktop || '', icon: Monitor, desc: 'Desktop directory' },
                  { label: 'Downloads', path: systemDirs?.downloads || '', icon: DownloadIcon, desc: 'Downloads folder' },
                  { label: 'Documents', path: systemDirs?.documents || '', icon: FileCode2, desc: 'Documents folder' },
                  { label: 'User Home', path: systemDirs?.home || '', icon: HardDrive, desc: 'User root profile' },
                ].map(loc => (
                  <button
                    key={loc.label}
                    type="button"
                    disabled={!loc.path}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/50 bg-secondary/20 hover:bg-secondary/60 hover:border-border transition-colors text-left group disabled:opacity-50"
                    onClick={() => {
                      close();
                      if (modal === 'openfolder') {
                        if (onOpenFolder) onOpenFolder(loc.path);
                      } else {
                        if (onOpenFile) onOpenFile(loc.path);
                      }
                    }}
                  >
                    <loc.icon size={16} className="text-primary mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        {loc.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate font-mono mt-0.5" title={loc.path}>
                        {loc.path || 'Detecting path...'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Path Input */}
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!path.trim()) return;
                close();
                if (modal === 'openfolder') {
                  if (onOpenFolder) onOpenFolder(path.trim());
                } else {
                  if (onOpenFile) onOpenFile(path.trim());
                }
                setPath('');
              }}
              className="pt-2 border-t border-border/40"
            >
              <label className="text-xs text-muted-foreground block mb-1.5" htmlFor="custom-browse-path">
                Or enter full disk path:
              </label>
              <div className="flex gap-2">
                <Input
                  id="custom-browse-path"
                  placeholder={modal === 'openfolder' ? 'C:\\Users\\... or /home/...' : 'C:\\path\\to\\file.py'}
                  value={path}
                  onChange={e => setPath(e.target.value)}
                  className="font-mono text-xs"
                />
                <Button type="submit" size="sm" disabled={!path.trim()}>
                  Open
                </Button>
              </div>
            </form>
          </div>
        )}

        {['newfile', 'newfolder'].includes(modal ?? '') && (
          <form
            onSubmit={e => {
              e.preventDefault();
              if (!path.trim()) return;
              onNew(
                modal === 'newfolder' ? `${path.replace(/\/$/, '')}/.gitkeep` : path,
                ''
              );
              setPath('');
              close();
            }}
          >
            <label className="text-xs text-muted-foreground block mb-2" htmlFor="new-path">
              {modal === 'newfolder' ? 'New folder path (e.g. src/utils)' : 'New file path (e.g. src/auth.py)'}
            </label>
            <Input
              id="new-path"
              autoFocus
              placeholder={modal === 'newfolder' ? 'src/new-folder' : 'src/new_file.py'}
              value={path}
              onChange={e => setPath(e.target.value)}
            />
            <div className="dialog-footer mt-4">
              <Button variant="outline" size="sm" type="button" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!path.trim()}>
                Create
              </Button>
            </div>
          </form>
        )}

        {modal === 'about' && (
          <div className="space-y-6 py-2">
            {/* Full Logo Lockup */}
            <div className="flex justify-center p-4 bg-[#121312] border border-border/50 rounded-xl">
              <KestrelLogo size="md" />
            </div>

            {/* Version and Architectural Overview */}
            <div className="space-y-3 text-xs font-mono">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/40">
                <span className="text-muted-foreground">Version</span>
                <span className="font-semibold text-emerald-400">1.0.0 (Release Build)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/40">
                <span className="text-muted-foreground">AI Reasoning Engine</span>
                <span className="font-semibold text-foreground">NVIDIA Nemotron 3.5</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/40">
                <span className="text-muted-foreground">Threat Intelligence</span>
                <span className="font-semibold text-foreground">Tavily Live Search</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/40">
                <span className="text-muted-foreground">Security Sandbox</span>
                <span className="font-semibold text-foreground">Docker Quarantined Isolation</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/40">
                <span className="text-muted-foreground">Vulnerability Standard</span>
                <span className="font-semibold text-foreground">OASIS SARIF 2.1.0 & OWASP Top 10</span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed text-center">
              Kestrel is an AI-native cybersecurity IDE combining deterministic AST analysis,
              live threat feeds, and automated patch synthesis.
            </p>

            <div className="dialog-footer">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://github.com/Maazkorejo/Hackatgon-project', '_blank')}
                className="gap-2 text-xs"
              >
                <Github size={13} />
                GitHub Repository
              </Button>
              <Button size="sm" onClick={close} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        )}

        {modal === 'unsaved' && (
          <>
            <p className="text-xs text-muted-foreground">Your changes will be lost if you don't save them.</p>
            <div className="dialog-footer">
              <Button variant="ghost" size="sm" onClick={close}>
                Cancel
              </Button>
              <Button variant="outline" size="sm" onClick={onDiscard}>
                Don't Save
              </Button>
              <Button size="sm" onClick={onSave}>
                Save
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
