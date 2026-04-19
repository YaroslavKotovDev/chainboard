'use client';

import { Check, Copy, ExternalLink } from 'lucide-react';
import * as React from 'react';

import { cn } from '../lib/utils';

export interface WalletAddressProps {
  address: string;
  explorerUrl?: string;
  prefixLength?: number;
  suffixLength?: number;
  showCopy?: boolean;
  showExplorer?: boolean;
  /** visual variant */
  variant?: 'default' | 'pill' | 'subtle';
  className?: string;
}

function truncateAddress(address: string, prefix = 6, suffix = 4): string {
  if (address.length <= prefix + suffix) return address;
  return `${address.slice(0, prefix)}…${address.slice(-suffix)}`;
}

export function WalletAddress({
  address,
  explorerUrl,
  prefixLength = 6,
  suffixLength = 4,
  showCopy = true,
  showExplorer = false,
  variant = 'default',
  className,
}: WalletAddressProps) {
  const [copied, setCopied] = React.useState(false);
  const truncated = truncateAddress(address, prefixLength, suffixLength);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — fail silently
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        variant === 'pill' && [
          'rounded-full px-3 py-1 text-xs',
          'bg-white/[0.04] border border-white/[0.06]',
          'hover:bg-white/[0.06] transition-colors duration-200',
        ],
        variant === 'subtle' && 'opacity-70 hover:opacity-100 transition-opacity',
        className,
      )}
    >
      <span
        className="font-mono text-sm tabular-nums text-zinc-300"
        title={address}
        aria-label={`Wallet address: ${address}`}
      >
        {/* Prefix in slightly brighter color, suffix dimmer */}
        <span className="text-zinc-200">{truncated.slice(0, prefixLength)}</span>
        <span className="text-zinc-500">…</span>
        <span className="text-zinc-400">{truncated.slice(-suffixLength)}</span>
      </span>

      {showCopy && (
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'flex items-center justify-center rounded transition-all duration-150',
            'text-zinc-500 hover:text-zinc-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500',
          )}
          aria-label={copied ? 'Copied' : 'Copy address'}
          title={copied ? 'Copied!' : 'Copy address'}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      )}

      {showExplorer && explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-500 transition-colors hover:text-blue-400 focus:outline-none"
          aria-label="View on block explorer"
          title="View on block explorer"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </span>
  );
}
