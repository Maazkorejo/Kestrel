import type { LucideIcon } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
export function IconButton({ icon: Icon, label, className, ...props }: ButtonProps & { icon: LucideIcon; label: string }) {
  return <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label={label} className={cn('ide-icon', className)} {...props}><Icon size={16} /></Button></TooltipTrigger><TooltipContent side="bottom" className="border border-border bg-popover text-popover-foreground px-2 py-1 text-[11px]">{label}</TooltipContent></Tooltip>;
}
export function FileIcon({ path }: { path: string }) { return <span className={cn('file-icon', path.endsWith('.py') ? 'text-file-python' : path.endsWith('.md') ? 'text-info' : path.endsWith('.yml') ? 'text-danger' : path === 'Dockerfile' ? 'text-info' : 'text-muted-foreground')}>{path.endsWith('.py') ? <svg viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M10 1c-5 0-5 2-5 5h6v1H3c-3 0-3 6 0 6h2v-3c0-2 1-3 3-3h5c2 0 3-1 3-3V3c0-2-3-2-6-2zm-2 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 4v3c0 2-1 3-3 3H7c-2 0-3 1-3 3v1c0 2 3 2 6 2 5 0 5-2 5-5H9v-1h8c3 0 3-6 0-6h-2zm-3 8a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg> : path.endsWith('.md') ? 'M↓' : path.endsWith('.yml') ? '≡' : path === 'Dockerfile' ? '▤' : path.endsWith('.txt') ? '≡' : '{ }'}</span>; }
