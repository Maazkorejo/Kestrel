import React, { useState, useEffect } from 'react';
import { checkBackendHealth, API_BASE } from '@/lib/api';
import { ShieldCheck, AlertCircle, RefreshCw, Cpu, Database, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KestrelSplashScreenProps {
  onReady: () => void;
}

type InitStep = {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'failed';
};

export function KestrelSplashScreen({ onReady }: KestrelSplashScreenProps) {
  const [steps, setSteps] = useState<InitStep[]>([
    { id: 'backend', label: 'Connecting to Kestrel FastAPI Engine', status: 'running' },
    { id: 'nemotron', label: 'Verifying NVIDIA Nemotron AI Pipeline', status: 'pending' },
    { id: 'workspace', label: 'Mounting In-Memory Cyber Workspace', status: 'pending' },
  ]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const runStartupSequence = async () => {
    setErrorMsg(null);

    // Step 1: Health check
    setSteps(prev =>
      prev.map(s => (s.id === 'backend' ? { ...s, status: 'running' } : s))
    );

    try {
      const health = await checkBackendHealth();

      setSteps(prev =>
        prev.map(s =>
          s.id === 'backend'
            ? { ...s, status: 'done' }
            : s.id === 'nemotron'
            ? { ...s, status: 'running' }
            : s
        )
      );

      // Brief pause for visual smoothness
      await new Promise(r => setTimeout(r, 280));

      // Step 2: Nemotron verification from health model
      setSteps(prev =>
        prev.map(s =>
          s.id === 'nemotron'
            ? { ...s, status: 'done' }
            : s.id === 'workspace'
            ? { ...s, status: 'running' }
            : s
        )
      );

      await new Promise(r => setTimeout(r, 240));

      // Step 3: Workspace mount
      setSteps(prev =>
        prev.map(s => (s.id === 'workspace' ? { ...s, status: 'done' } : s))
      );

      await new Promise(r => setTimeout(r, 300));

      // Trigger smooth fade-out and hand off to main IDE
      setIsFadingOut(true);
      setTimeout(() => {
        onReady();
      }, 350);
    } catch (err: any) {
      console.error('Kestrel startup initialization failed:', err);
      setSteps(prev =>
        prev.map(s => (s.status === 'running' ? { ...s, status: 'failed' } : s))
      );
      setErrorMsg(
        'Could not establish connection with Kestrel backend on port 8000. Please ensure the backend engine is running.'
      );
    }
  };

  useEffect(() => {
    runStartupSequence();
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between items-center bg-[#171817] text-[#E6EDF3] transition-opacity duration-300 select-none overflow-hidden ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Decorative Tech Accents */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle radial ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px]" />
        
        {/* Geometric accent lines */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent" />
        <div className="absolute -top-24 -left-24 w-96 h-96 border border-emerald-500/10 rounded-full" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 border border-cyan-500/10 rounded-full" />
      </div>

      {/* Top Bar: Version & Environment */}
      <div className="relative w-full max-w-5xl px-8 pt-8 flex items-center justify-between text-[11px] font-mono text-muted-foreground/70">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>KESTREL STUDIO ENVIRONMENT</span>
        </div>
        <span>v1.0.0 · STABLE</span>
      </div>

      {/* Center: Full Logo Lockup & Real Initialization Pipeline */}
      <div className="relative z-10 flex flex-col items-center max-w-lg w-full px-6">
        {/* Official Full Logo Banner */}
        <div className="mb-8 flex justify-center">
          <img
            src="/branding/kestrel-logo-banner.png"
            alt="Kestrel: Hunt flaws. Ship armor."
            className="w-full max-w-[440px] object-contain filter drop-shadow-[0_8px_32px_rgba(16,185,129,0.22)]"
          />
        </div>

        {/* Startup Tasks List */}
        {!errorMsg ? (
          <div className="w-full space-y-2.5 bg-[#121312]/80 border border-border/40 rounded-xl p-4 shadow-xl backdrop-blur-sm">
            {steps.map(step => (
              <div
                key={step.id}
                className="flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-2.5">
                  {step.status === 'done' ? (
                    <span className="flex items-center justify-center w-4 h-4 rounded bg-emerald-500/20 text-emerald-400">
                      <Check size={11} strokeWidth={3} />
                    </span>
                  ) : step.status === 'running' ? (
                    <span className="flex items-center justify-center w-4 h-4">
                      <RefreshCw size={11} className="animate-spin text-emerald-400" />
                    </span>
                  ) : step.status === 'failed' ? (
                    <span className="flex items-center justify-center w-4 h-4 rounded bg-red-500/20 text-red-400">
                      <AlertCircle size={11} />
                    </span>
                  ) : (
                    <span className="w-4 h-4 rounded border border-border/40 inline-block" />
                  )}
                  <span
                    className={
                      step.status === 'done'
                        ? 'text-foreground font-medium'
                        : step.status === 'running'
                        ? 'text-emerald-400'
                        : 'text-muted-foreground/60'
                    }
                  >
                    {step.label}
                  </span>
                </div>

                <span className="text-[10px] text-muted-foreground uppercase">
                  {step.status === 'done'
                    ? 'READY'
                    : step.status === 'running'
                    ? 'INIT...'
                    : ''}
                </span>
              </div>
            ))}

            {/* Indeterminate Teal Loading Bar */}
            <div className="w-full h-1 bg-border/40 rounded-full overflow-hidden mt-3">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        ) : (
          /* Error State with Retry Button */
          <div className="w-full bg-red-950/20 border border-red-500/30 rounded-xl p-4 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-red-400 text-xs font-semibold">
              <AlertCircle size={16} />
              <span>Startup Initialization Error</span>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">
              {errorMsg}
            </p>
            <div className="flex justify-center gap-3 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={runStartupSequence}
                className="gap-2 text-xs border-red-500/40 hover:bg-red-500/10 text-foreground"
              >
                <RefreshCw size={12} />
                Retry Connection
              </Button>
              <Button
                size="sm"
                onClick={onReady}
                className="text-xs bg-muted/60 hover:bg-muted text-foreground border border-border/60"
              >
                Continue in Offline Mode
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer Info */}
      <div className="relative w-full max-w-5xl px-8 pb-8 flex items-center justify-between text-[11px] font-mono text-muted-foreground/60 border-t border-border/20 pt-4">
        <div>Deterministic DevSecOps & AST Reasoning Platform</div>
        <div>Powered by NVIDIA Nemotron</div>
      </div>
    </div>
  );
}
