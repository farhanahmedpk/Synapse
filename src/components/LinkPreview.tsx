/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

interface Metadata {
  title: string;
  description: string;
  image: string;
  siteName: string;
  url: string;
}

export function LinkPreview({ url }: { url: string }) {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    async function fetchMetadata() {
      try {
        setLoading(true);
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (isMounted) {
          setMetadata(data);
          setError(false);
        }
      } catch (e) {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchMetadata();
    return () => { isMounted = false; };
  }, [url]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 mt-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 animate-pulse">
        <Loader2 size={14} className="animate-spin text-accent" />
        <span className="text-[10px] text-gray-400">Loading preview...</span>
      </div>
    );
  }

  if (error || !metadata) {
    return null;
  }

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex flex-col sm:flex-row gap-3 p-3 mt-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:border-accent/30 dark:hover:border-accent/30 hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-all group overflow-hidden max-w-lg no-underline"
    >
      {metadata.image && (
        <div className="w-full sm:w-32 h-24 sm:h-auto shrink-0 rounded-xl overflow-hidden bg-gray-200 dark:bg-white/10 border border-gray-200 dark:border-white/5 group-hover:scale-105 transition-transform duration-500">
          <img 
            src={metadata.image} 
            alt="Link preview" 
            className="w-full h-full object-cover"
            onError={(e) => {
               (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-accent/70">{metadata.siteName}</span>
          <ExternalLink size={10} className="text-gray-400" />
        </div>
        <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">{metadata.title}</h4>
        {metadata.description && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{metadata.description}</p>
        )}
      </div>
    </a>
  );
}
