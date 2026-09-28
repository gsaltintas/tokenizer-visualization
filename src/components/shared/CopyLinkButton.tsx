import { useState } from 'react';

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={copy}
      title="Copy a shareable link to this view"
      className="px-3 py-1 text-xs bg-white hover:bg-gray-100 text-gray-700 rounded border border-gray-200 shadow-sm transition-colors"
    >
      {copied ? 'Link copied' : 'Copy link'}
    </button>
  );
}
