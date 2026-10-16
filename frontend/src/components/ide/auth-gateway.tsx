import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Github,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Terminal,
  Cpu,
  Boxes,
  Zap,
  Info,
  CheckCircle2,
  KeyRound,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  UserCheck,
  ArrowLeft,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  loginWithCredentials,
  registerUser,
  continueAsGuest,
  API_BASE,
  getSavedAccounts,
  switchAccount,
  getOAuthConfig,
  saveOAuthConfig,
} from '@/lib/api';

interface AuthGatewayProps {
  open: boolean;
  onSuccess: (user: any) => void;
  onGuest: () => void;
}

interface SavedAccount {
  id: string;
  email: string;
  name: string;
  initials: string;
  role: string;
  avatar_url?: string;
  provider: string;
  last_login: number;
}

const PERSONA_DETAILS: Record<
  string,
  { title: string; subtitle: string; description: string; badge: string }
> = {
  CODE_HARDENER: {
    title: 'Software Developer & Code Hardener',
    subtitle: 'Application Security & Input Sanitization',
    description:
      'Focuses on writing safe code and hardening existing functions. Detects SQL injection and OS command injection vulnerabilities in real time and automatically applies verified Nemotron defensive patches.',
    badge: 'Code Level',
  },
  DEVSECOPS: {
    title: 'DevSecOps Engineer',
    subtitle: 'CI/CD Pipelines & Container Security',
    description:
      'Focuses on automated build security. Generates automated GitHub Actions and GitLab CI workflows with SARIF 2.1.0 reporting and audits Dockerfiles for container security best practices.',
    badge: 'Pipeline Level',
  },
  APPSEC_AUDITOR: {
    title: 'AppSec Auditor & Compliance Assessor',
    subtitle: 'Vulnerability Assessment & Exploit Testing',
    description:
      'Focuses on compliance and exploit validation. Maps findings to official CWE and OWASP Top 10 standards, simulates exploits in ephemeral Docker containers, and exports audit records.',
    badge: 'Compliance Level',
  },
  SYS_ADMIN: {
    title: 'Systems Administrator & Runtime Operator',
    subtitle: 'Infrastructure & Container Isolation',
    description:
      'Focuses on infrastructure hardening and runtime execution. Checks container root privileges, monitors system calls, guards against directory traversal, and enforces sandbox resource limits.',
    badge: 'System Level',
  },
};

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

export function AuthGateway({ open, onSuccess, onGuest }: AuthGatewayProps) {
  // Modes: 'main' (default login), 'google' (dedicated Google auth), 'github' (dedicated GitHub auth)
  const [activeScreen, setActiveScreen] = useState<'main' | 'google' | 'github'>('main');
  const [tab, setTab] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('CODE_HARDENER');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Saved accounts list
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [showSavedList, setShowSavedList] = useState(true);

  // OAuth config state
  const [oauthConfig, setOAuthConfig] = useState<{
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

  // OAuth credential configuration expandable drawer
  const [showOAuthSetup, setShowOAuthSetup] = useState(false);
  const [setupClientId, setSetupClientId] = useState('');
  const [setupClientSecret, setSetupClientSecret] = useState('');
  const [savingOAuth, setSavingOAuth] = useState(false);

  // Load saved accounts and OAuth configuration on modal open
  useEffect(() => {
    if (open) {
      loadSavedAccounts();
      loadOAuthConfig();
    }
  }, [open]);

  const loadSavedAccounts = async () => {
    try {
      const res = await getSavedAccounts();
      if (res?.accounts && Array.isArray(res.accounts)) {
        setSavedAccounts(res.accounts);
      }
    } catch {
      // Graceful fallback if backend offline
    }
  };

  const loadOAuthConfig = async () => {
    try {
      const res = await getOAuthConfig();
      if (res) {
        setOAuthConfig(res);
      }
    } catch {
      // Graceful fallback
    }
  };

  // Listen for OAuth completion messages posted by the OAuth callback popup window
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.user) {
        toast.success(`Authenticated via ${event.data.user.provider || 'OAuth'}!`);
        onSuccess(event.data.user);
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [onSuccess]);

  // Handle switching to a previously saved account
  const handleQuickSwitch = async (account: SavedAccount) => {
    setLoading(true);
    setError(null);
    try {
      const res = await switchAccount(account.id);
      toast.success(`Welcome back, ${res.user.name}!`);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err?.message || 'Failed to switch account.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent, providerOverride?: string) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const targetProvider = providerOverride || (activeScreen === 'google' ? 'google' : activeScreen === 'github' ? 'github' : undefined);
      const res = await loginWithCredentials({ email, password, provider: targetProvider });
      toast.success(`Welcome back, ${res.user.name}!`);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent, providerOverride?: string) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide an email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const targetProvider = providerOverride || (activeScreen === 'google' ? 'google' : activeScreen === 'github' ? 'github' : undefined);
      const defaultName = activeScreen === 'google' ? 'Google Developer' : activeScreen === 'github' ? 'GitHub Developer' : 'Developer';
      const res = await registerUser({
        email,
        password,
        name: name.trim() || (email.split('@')[0] ?? defaultName),
        role,
        provider: targetProvider,
      });
      toast.success(`Account created! Welcome, ${res.user.name}.`);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthConnect = async (authProvider: 'github' | 'google') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/${authProvider}/start`, {
        headers: { Accept: 'application/json' },
      }).then(r => r.json());

      if (res.configured && res.auth_url) {
        window.open(res.auth_url, '_blank', 'width=600,height=700');
        toast.info(`Opening ${authProvider === 'github' ? 'GitHub' : 'Google'} sign-in window...`);
      } else {
        // Open the dedicated Google / GitHub sign-in screen
        setActiveScreen(authProvider);
        if (authProvider === 'google') {
          setEmail(prev => (prev.includes('@') ? prev : ''));
        } else {
          setEmail(prev => (prev.includes('@') ? prev : ''));
        }
      }
    } catch {
      setActiveScreen(authProvider);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOAuthCredentials = async (provider: 'google' | 'github') => {
    if (!setupClientId.trim() || !setupClientSecret.trim()) {
      toast.error('Please enter both Client ID and Client Secret.');
      return;
    }
    setSavingOAuth(true);
    try {
      const payload = provider === 'google'
        ? { google_client_id: setupClientId.trim(), google_client_secret: setupClientSecret.trim() }
        : { github_client_id: setupClientId.trim(), github_client_secret: setupClientSecret.trim() };
      const updated = await saveOAuthConfig(payload);
      setOAuthConfig(updated);
      toast.success(`${provider === 'google' ? 'Google' : 'GitHub'} OAuth credentials saved and activated!`);
      setShowOAuthSetup(false);
      setSetupClientId('');
      setSetupClientSecret('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save OAuth credentials.');
    } finally {
      setSavingOAuth(false);
    }
  };

  const handleGuest = async () => {
    try {
      await continueAsGuest();
      toast.info('Workspace loaded in Local Guest mode');
      onGuest();
    } catch {
      onGuest();
    }
  };

  const currentPersona = PERSONA_DETAILS[role] ?? PERSONA_DETAILS['CODE_HARDENER']!;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="ide-dialog auth-gateway-dialog sm:max-w-4xl md:max-w-4xl w-[95vw] p-0 border border-border/80 bg-[#0d1117] text-foreground shadow-2xl rounded-2xl overflow-hidden"
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
          {/* Left Column: Kestrel Branding and Security Architecture */}
          <div className="hidden md:flex md:col-span-5 bg-gradient-to-b from-[#090d14] via-[#0d1422] to-[#070a10] p-8 border-r border-border/70 flex-col justify-between relative overflow-hidden">
            <div className="absolute -top-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              {/* Brand Logo and Title */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.25)]">
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    Kestrel <span className="text-emerald-400 font-mono">AI</span>
                  </DialogTitle>
                  <span className="text-[10px] font-mono tracking-wider text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
                    Hunt flaws. Ship armor.
                  </span>
                </div>
              </div>

              <DialogDescription className="text-xs text-muted-foreground leading-relaxed mb-6">
                Intelligent AST vulnerability defense environment and automated exploit mitigation suite.
              </DialogDescription>

              {/* Feature Highlights */}
              <div className="space-y-3.5">
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[#141b26]/70 border border-border/50 transition-all hover:border-emerald-500/40">
                  <div className="h-7 w-7 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <Zap size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">Deterministic AST Scanner</h4>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Sub-millisecond detection of SQL injection, Command Injection, and OWASP Top 10 flaws.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[#141b26]/70 border border-border/50 transition-all hover:border-emerald-500/40">
                  <div className="h-7 w-7 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                    <Boxes size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">Disposable Exploit Sandbox</h4>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Simulate live attack vectors in quarantined Docker containers to verify exploitability.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[#141b26]/70 border border-border/50 transition-all hover:border-emerald-500/40">
                  <div className="h-7 w-7 rounded-md bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                    <Cpu size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">Nemotron Defensive Engine</h4>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      1-click AST defensive patch synthesis with verified unified diffs and zero hallucinations.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Security Guarantee */}
            <div className="pt-6 border-t border-border/50 mt-6 flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
              <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
              <span>Persistent Salted PBKDF2 Credentials in SQLite</span>
            </div>
          </div>

          {/* Right Column: Authentication & Sign-In Form */}
          <div className="col-span-1 md:col-span-7 p-6 sm:p-8 flex flex-col justify-between bg-[#0d1117] max-h-[85vh] overflow-y-auto">
            <div>
              {/* Back button if in provider screen */}
              {activeScreen !== 'main' && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveScreen('main');
                    setError(null);
                    setShowOAuthSetup(false);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Back to all sign-in options</span>
                </button>
              )}

              {/* Header Title */}
              <div className="mb-5">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  {activeScreen === 'google' ? (
                    <>
                      <GoogleIcon className="w-5 h-5" /> Sign In with Google
                    </>
                  ) : activeScreen === 'github' ? (
                    <>
                      <Github size={20} /> Sign In with GitHub
                    </>
                  ) : tab === 'signin' ? (
                    'Sign In to Kestrel'
                  ) : (
                    'Create Kestrel Profile'
                  )}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activeScreen === 'google'
                    ? 'Authenticate using your Google account. All data is saved permanently in your local database.'
                    : activeScreen === 'github'
                    ? 'Authenticate using your GitHub account. All data is saved permanently in your local database.'
                    : tab === 'signin'
                    ? 'Access your persistent security workspace and audit records.'
                    : 'Configure your security persona and begin auditing code.'}
                </p>
              </div>

              {/* SAVED ACCOUNTS SELECTOR (Choose an account like Google Identity Services) */}
              {activeScreen === 'main' && savedAccounts.length > 0 && (
                <div className="mb-5 p-3 rounded-xl bg-[#141b26]/90 border border-emerald-500/25 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck size={13} />
                      Saved Accounts on this Machine ({savedAccounts.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSavedList(!showSavedList)}
                      className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      {showSavedList ? 'Hide' : 'Show'}
                      {showSavedList ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>

                  {showSavedList && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {savedAccounts.map(acc => (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => handleQuickSwitch(acc)}
                          disabled={loading}
                          className="w-full flex items-center justify-between p-2 rounded-lg bg-[#161b22] hover:bg-[#21262d] border border-border/60 hover:border-emerald-500/40 text-left transition-all group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/30">
                              {acc.initials || acc.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-foreground truncate group-hover:text-emerald-400 transition-colors">
                                {acc.name}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate font-mono">
                                {acc.email}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-[#0d1117] text-muted-foreground border border-border/50 uppercase">
                              {acc.provider}
                            </span>
                            <ArrowRight size={13} className="text-muted-foreground group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* DEDICATED GOOGLE SCREEN */}
              {activeScreen === 'google' && (
                <div className="space-y-4">
                  {/* Quick Live OAuth button if configured */}
                  {oauthConfig.google_enabled ? (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 size={14} /> Google Cloud OAuth 2.0 Ready
                        </span>
                      </div>
                      <Button
                        type="button"
                        onClick={() => handleOAuthConnect('google')}
                        disabled={loading}
                        className="w-full h-10 bg-white hover:bg-gray-100 text-gray-800 font-medium text-xs flex items-center justify-center gap-2 shadow-sm"
                      >
                        <GoogleIcon className="w-4 h-4" />
                        Sign In with Google Account
                      </Button>
                    </div>
                  ) : null}

                  {/* Manual Google Account Entry */}
                  <div className="rounded-xl border border-border/80 bg-[#161b22]/70 p-4 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <GoogleIcon className="w-4 h-4" />
                        <span className="text-xs font-semibold text-foreground">
                          {tab === 'signin' ? 'Google Account Credentials' : 'Register New Google Profile'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => { setTab('signin'); setError(null); }}
                          className={`text-[11px] px-2 py-0.5 rounded ${tab === 'signin' ? 'bg-emerald-500/20 text-emerald-400 font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          Sign In
                        </button>
                        <button
                          type="button"
                          onClick={() => { setTab('register'); setError(null); }}
                          className={`text-[11px] px-2 py-0.5 rounded ${tab === 'register' ? 'bg-emerald-500/20 text-emerald-400 font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          Register
                        </button>
                      </div>
                    </div>

                    <form onSubmit={e => (tab === 'signin' ? handleSignIn(e, 'google') : handleRegister(e, 'google'))} className="space-y-3">
                      {tab === 'register' && (
                        <div>
                          <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                            Google Display Name
                          </label>
                          <Input
                            type="text"
                            placeholder="e.g. Maaz Korejo"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="text-xs h-9 bg-[#0d1117] border-border/80 focus-visible:ring-emerald-500"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                          Google Email Address
                        </label>
                        <div className="relative">
                          <Mail size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                          <Input
                            type="email"
                            required
                            placeholder="your.name@gmail.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="pl-8 text-xs h-9 bg-[#0d1117] border-border/80 focus-visible:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                          Password
                        </label>
                        <div className="relative">
                          <Lock size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            required
                            placeholder="Account password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="pl-8 pr-8 text-xs h-9 bg-[#0d1117] border-border/80 focus-visible:ring-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      {tab === 'register' && (
                        <div>
                          <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                            Security Persona
                          </label>
                          <select
                            value={role}
                            onChange={e => setRole(e.target.value)}
                            className="w-full h-8 px-2 text-xs bg-[#0d1117] border border-border/80 rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="CODE_HARDENER">Software Developer & Code Hardener</option>
                            <option value="DEVSECOPS">DevSecOps Engineer (CI/CD & Containers)</option>
                            <option value="APPSEC_AUDITOR">AppSec Auditor & Compliance Assessor</option>
                            <option value="SYS_ADMIN">Systems Administrator & Runtime Operator</option>
                          </select>
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-9 mt-1 flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 size={14} className="animate-spin" /> Saving Account...
                          </>
                        ) : tab === 'signin' ? (
                          <>
                            Sign In with Google Account <ArrowRight size={14} />
                          </>
                        ) : (
                          <>
                            Save and Register Google Profile <ArrowRight size={14} />
                          </>
                        )}
                      </Button>
                    </form>
                  </div>

                  {/* Expandable Google Cloud OAuth Credentials Form */}
                  <div className="rounded-xl border border-border/60 bg-[#141b26]/50 p-3.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setShowOAuthSetup(!showOAuthSetup)}
                      className="w-full flex items-center justify-between text-muted-foreground hover:text-foreground font-medium text-xs"
                    >
                      <span className="flex items-center gap-1.5">
                        <KeyRound size={14} className="text-emerald-400" />
                        Configure Live Google Cloud OAuth 2.0 Keys
                      </span>
                      {showOAuthSetup ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {showOAuthSetup && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-3 animate-in fade-in duration-150">
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Want real Google pop-up sign-in? Create an OAuth Client ID in your{' '}
                          <a
                            href="https://console.cloud.google.com/apis/credentials"
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-400 hover:underline inline-flex items-center gap-0.5"
                          >
                            Google Cloud Console <ExternalLink size={10} />
                          </a>
                          {' '}with redirect URI: <code className="bg-black/50 px-1 py-0.5 rounded text-foreground font-mono text-[10px]">http://127.0.0.1:8000/api/auth/google/callback</code>
                        </p>

                        <div>
                          <label className="block text-[10px] uppercase font-mono text-muted-foreground mb-1">
                            Google Client ID
                          </label>
                          <Input
                            placeholder="xxxxxx.apps.googleusercontent.com"
                            value={setupClientId}
                            onChange={e => setSetupClientId(e.target.value)}
                            className="h-8 text-xs font-mono bg-[#0d1117]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-mono text-muted-foreground mb-1">
                            Google Client Secret
                          </label>
                          <Input
                            type="password"
                            placeholder="GOCSPX-xxxxxx"
                            value={setupClientSecret}
                            onChange={e => setSetupClientSecret(e.target.value)}
                            className="h-8 text-xs font-mono bg-[#0d1117]"
                          />
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          disabled={savingOAuth}
                          onClick={() => handleSaveOAuthCredentials('google')}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8"
                        >
                          {savingOAuth ? 'Saving...' : 'Save and Activate Live Google OAuth'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* DEDICATED GITHUB SCREEN */}
              {activeScreen === 'github' && (
                <div className="space-y-4">
                  {oauthConfig.github_enabled ? (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 size={14} /> GitHub OAuth App Configured
                        </span>
                      </div>
                      <Button
                        type="button"
                        onClick={() => handleOAuthConnect('github')}
                        disabled={loading}
                        className="w-full h-10 bg-[#21262d] hover:bg-[#30363d] text-white font-medium text-xs flex items-center justify-center gap-2 shadow-sm border border-border"
                      >
                        <Github size={16} />
                        Sign In with GitHub OAuth
                      </Button>
                    </div>
                  ) : null}

                  {/* Manual GitHub Credentials Entry */}
                  <div className="rounded-xl border border-border/80 bg-[#161b22]/70 p-4 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Github size={15} />
                        <span className="text-xs font-semibold text-foreground">
                          {tab === 'signin' ? 'GitHub Account Credentials' : 'Register New GitHub Profile'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => { setTab('signin'); setError(null); }}
                          className={`text-[11px] px-2 py-0.5 rounded ${tab === 'signin' ? 'bg-emerald-500/20 text-emerald-400 font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          Sign In
                        </button>
                        <button
                          type="button"
                          onClick={() => { setTab('register'); setError(null); }}
                          className={`text-[11px] px-2 py-0.5 rounded ${tab === 'register' ? 'bg-emerald-500/20 text-emerald-400 font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          Register
                        </button>
                      </div>
                    </div>

                    <form onSubmit={e => (tab === 'signin' ? handleSignIn(e, 'github') : handleRegister(e, 'github'))} className="space-y-3">
                      {tab === 'register' && (
                        <div>
                          <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                            GitHub Username or Handle
                          </label>
                          <Input
                            type="text"
                            placeholder="e.g. octocat"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="text-xs h-9 bg-[#0d1117] border-border/80 focus-visible:ring-emerald-500"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                          <Input
                            type="email"
                            required
                            placeholder="developer@github.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="pl-8 text-xs h-9 bg-[#0d1117] border-border/80 focus-visible:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                          Password
                        </label>
                        <div className="relative">
                          <Lock size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            required
                            placeholder="Account password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="pl-8 pr-8 text-xs h-9 bg-[#0d1117] border-border/80 focus-visible:ring-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      {tab === 'register' && (
                        <div>
                          <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                            Security Persona
                          </label>
                          <select
                            value={role}
                            onChange={e => setRole(e.target.value)}
                            className="w-full h-8 px-2 text-xs bg-[#0d1117] border border-border/80 rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="CODE_HARDENER">Software Developer & Code Hardener</option>
                            <option value="DEVSECOPS">DevSecOps Engineer (CI/CD & Containers)</option>
                            <option value="APPSEC_AUDITOR">AppSec Auditor & Compliance Assessor</option>
                            <option value="SYS_ADMIN">Systems Administrator & Runtime Operator</option>
                          </select>
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-9 mt-1 flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 size={14} className="animate-spin" /> Saving Account...
                          </>
                        ) : tab === 'signin' ? (
                          <>
                            Sign In with GitHub Account <ArrowRight size={14} />
                          </>
                        ) : (
                          <>
                            Save and Register GitHub Profile <ArrowRight size={14} />
                          </>
                        )}
                      </Button>
                    </form>
                  </div>

                  {/* Expandable GitHub OAuth Keys Form */}
                  <div className="rounded-xl border border-border/60 bg-[#141b26]/50 p-3.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setShowOAuthSetup(!showOAuthSetup)}
                      className="w-full flex items-center justify-between text-muted-foreground hover:text-foreground font-medium text-xs"
                    >
                      <span className="flex items-center gap-1.5">
                        <KeyRound size={14} className="text-emerald-400" />
                        Configure Live GitHub OAuth App Credentials
                      </span>
                      {showOAuthSetup ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {showOAuthSetup && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-3 animate-in fade-in duration-150">
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Register an OAuth App in your{' '}
                          <a
                            href="https://github.com/settings/developers"
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-400 hover:underline inline-flex items-center gap-0.5"
                          >
                            GitHub Developer Settings <ExternalLink size={10} />
                          </a>
                          {' '}with Authorization callback URL: <code className="bg-black/50 px-1 py-0.5 rounded text-foreground font-mono text-[10px]">http://127.0.0.1:8000/api/auth/github/callback</code>
                        </p>

                        <div>
                          <label className="block text-[10px] uppercase font-mono text-muted-foreground mb-1">
                            GitHub Client ID
                          </label>
                          <Input
                            placeholder="Iv1.xxxxxx"
                            value={setupClientId}
                            onChange={e => setSetupClientId(e.target.value)}
                            className="h-8 text-xs font-mono bg-[#0d1117]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-mono text-muted-foreground mb-1">
                            GitHub Client Secret
                          </label>
                          <Input
                            type="password"
                            placeholder="xxxxxx"
                            value={setupClientSecret}
                            onChange={e => setSetupClientSecret(e.target.value)}
                            className="h-8 text-xs font-mono bg-[#0d1117]"
                          />
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          disabled={savingOAuth}
                          onClick={() => handleSaveOAuthCredentials('github')}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8"
                        >
                          {savingOAuth ? 'Saving...' : 'Save and Activate Live GitHub OAuth'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MAIN SCREEN: Google / GitHub One-Click Buttons + Standard Email Tabs */}
              {activeScreen === 'main' && (
                <>
                  {/* Fast OAuth Buttons */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex items-center justify-center gap-2 h-10 text-xs border-border/80 bg-[#161b22] hover:bg-[#21262d] hover:text-foreground hover:border-emerald-500/40 transition-all font-medium"
                      onClick={() => handleOAuthConnect('google')}
                      disabled={loading}
                    >
                      <GoogleIcon className="w-4 h-4 shrink-0" />
                      <span>Google Account</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex items-center justify-center gap-2 h-10 text-xs border-border/80 bg-[#161b22] hover:bg-[#21262d] hover:text-foreground hover:border-emerald-500/40 transition-all font-medium"
                      onClick={() => handleOAuthConnect('github')}
                      disabled={loading}
                    >
                      <Github size={15} className="shrink-0" />
                      <span>GitHub</span>
                    </Button>
                  </div>

                  {/* Divider */}
                  <div className="relative flex items-center justify-center my-4">
                    <div className="border-t border-border/70 w-full" />
                    <span className="bg-[#0d1117] px-3 text-[10px] uppercase font-mono tracking-wider text-muted-foreground absolute">
                      or sign in with email credentials
                    </span>
                  </div>

                  {/* Tabs: Sign In / Create Account */}
                  <div className="flex rounded-lg bg-[#161b22] p-1 mb-4 border border-border/60">
                    <button
                      type="button"
                      className={`flex-1 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                        tab === 'signin'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => {
                        setTab('signin');
                        setError(null);
                      }}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      className={`flex-1 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                        tab === 'register'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => {
                        setTab('register');
                        setError(null);
                      }}
                    >
                      Create Account
                    </button>
                  </div>

                  {/* Error Alert */}
                  {error && (
                    <div className="flex items-start gap-2 p-3 mb-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs animate-in fade-in duration-150">
                      <AlertCircle size={15} className="shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Form Content */}
                  {tab === 'signin' ? (
                    <form onSubmit={handleSignIn} className="space-y-3.5">
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail size={15} className="absolute left-3 top-3 text-muted-foreground" />
                          <Input
                            type="email"
                            required
                            placeholder="developer@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="pl-9 text-xs h-10 bg-[#161b22] border-border/80 focus-visible:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                          Password
                        </label>
                        <div className="relative">
                          <Lock size={15} className="absolute left-3 top-3 text-muted-foreground" />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            required
                            placeholder="••••••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="pl-9 pr-9 text-xs h-10 bg-[#161b22] border-border/80 focus-visible:ring-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-10 mt-2 flex items-center justify-center gap-2 shadow-sm transition-all"
                      >
                        {loading ? (
                          <>
                            <Loader2 size={15} className="animate-spin" /> Authenticating...
                          </>
                        ) : (
                          <>
                            Sign In to Kestrel <ArrowRight size={15} />
                          </>
                        )}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleRegister} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                            Full Name or Handle
                          </label>
                          <Input
                            type="text"
                            placeholder="Alex Chen"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="text-xs h-9 bg-[#161b22] border-border/80 focus-visible:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                            Email Address
                          </label>
                          <div className="relative">
                            <Mail size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                            <Input
                              type="email"
                              required
                              placeholder="alex@kestrel.ai"
                              value={email}
                              onChange={e => setEmail(e.target.value)}
                              className="pl-8 text-xs h-9 bg-[#161b22] border-border/80 focus-visible:ring-emerald-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                          Password
                        </label>
                        <div className="relative">
                          <Lock size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            required
                            placeholder="Minimum 6 characters"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="pl-8 pr-8 text-xs h-9 bg-[#161b22] border-border/80 focus-visible:ring-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Security Persona Selector */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-medium text-muted-foreground">
                            Security Persona
                          </label>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                            {currentPersona.badge}
                          </span>
                        </div>
                        <select
                          value={role}
                          onChange={e => setRole(e.target.value)}
                          className="w-full h-9 px-2.5 text-xs bg-[#161b22] border border-border/80 rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="CODE_HARDENER">Software Developer & Code Hardener</option>
                          <option value="DEVSECOPS">DevSecOps Engineer (CI/CD & Containers)</option>
                          <option value="APPSEC_AUDITOR">AppSec Auditor & Compliance Assessor</option>
                          <option value="SYS_ADMIN">Systems Administrator & Runtime Operator</option>
                        </select>

                        {/* Dynamic Persona Explainer Card */}
                        <div className="mt-2 p-2.5 rounded-lg bg-[#141b26] border border-emerald-500/25 text-[11px] leading-relaxed text-muted-foreground transition-all">
                          <div className="flex items-center gap-1.5 font-semibold text-emerald-300 text-xs mb-1">
                            <Info size={13} className="shrink-0" />
                            <span>{currentPersona.title}</span>
                          </div>
                          <p>{currentPersona.description}</p>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-9.5 mt-2 flex items-center justify-center gap-2 shadow-sm transition-all"
                      >
                        {loading ? (
                          <>
                            <Loader2 size={15} className="animate-spin" /> Creating Profile...
                          </>
                        ) : (
                          <>
                            Create Security Profile <ArrowRight size={15} />
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </>
              )}
            </div>

            {/* Guest Footer */}
            <div className="mt-5 pt-3.5 border-t border-border/60 text-center">
              <button
                type="button"
                onClick={handleGuest}
                className="text-xs text-muted-foreground hover:text-emerald-400 transition-colors inline-flex items-center gap-2 py-1 px-3 rounded hover:bg-[#161b22]"
              >
                <Terminal size={13} className="text-emerald-400" />
                <span>Continue as Guest (Local Workspace Only)</span>
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
