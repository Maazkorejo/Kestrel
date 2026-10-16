import React from 'react';

interface KestrelHeaderBrandProps {
  workspaceName?: string;
  onWorkspaceClick?: () => void;
}

export function KestrelHeaderBrand({
  workspaceName = 'NIDS-ML',
  onWorkspaceClick,
}: KestrelHeaderBrandProps) {
  return (
    <div className="kestrel-header-brand flex items-center gap-2.5 h-full px-2.5 select-none shrink-0">
      {/* Standalone Brand Falcon Symbol (Transparent, fixed 24x24) */}
      <img
        src="/branding/kestrel-symbol-tight.png"
        alt="Kestrel Brand Symbol"
        aria-hidden="true"
        className="w-6 h-6 object-contain shrink-0 filter drop-shadow-[0_0_8px_rgba(16,185,129,0.35)]"
      />

      {/* Wordmark matching the official typeface styling: KESTREL_ */}
      <div className="flex items-center tracking-wider font-bold text-sm text-foreground">
        <span className="tracking-[0.14em] text-[13px] font-mono text-[#E6EDF3]">
          KESTREL
        </span>
        <span className="text-emerald-400 font-mono font-black ml-0.5 animate-pulse text-[13px]">
          _
        </span>
      </div>

      <span className="h-3.5 w-px bg-border/70 mx-1.5" aria-hidden="true" />

      {/* Workspace pill selector */}
      {workspaceName && (
        <button
          type="button"
          onClick={onWorkspaceClick}
          className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/80 px-2 py-0.5 rounded border border-border/50 transition-colors"
          title="Active Workspace Directory"
        >
          <span>{workspaceName}</span>
        </button>
      )}
    </div>
  );
}
