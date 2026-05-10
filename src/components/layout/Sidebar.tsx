import { useState, useRef, useCallback, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listTokenizers } from '../../api/client';
import { TokenizerSelector } from './TokenizerSelector';
import { useTokenizer } from '../../hooks/useTokenizer';

const NAV_ITEMS = [
  { to: '/', label: 'Tokenize', icon: '✦' },
  { to: '/vocab', label: 'Vocabulary', icon: '📖' },
  { to: '/multiplicity', label: 'Multiplicity', icon: '⊕' },
  { to: '/language', label: 'Language', icon: '🌐' },
  { to: '/morphemes', label: 'Morphemes', icon: '🔬' },
  { to: '/undertrained', label: 'Under-trained', icon: '⚠' },
  { to: '/compare', label: 'Comparison', icon: '⇌' },
  { to: '/merge-tree', label: 'Merge Tree', icon: '🌲' },
  { to: '/merge-forest', label: 'Merge Forest', icon: '🌳' },
];

const COLLAPSED_WIDTH = 48;
const DEFAULT_WIDTH = 256;
const MIN_WIDTH = 160;
const MAX_WIDTH = 480;
// Below this width the sidebar acts as "collapsed" (icons only)
const COLLAPSE_THRESHOLD = 120;

export function Sidebar() {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const { comparisonIds, toggleComparison } = useTokenizer();
  const { data: tokenizers = [] } = useQuery({
    queryKey: ['tokenizers'],
    queryFn: listTokenizers,
  });

  const loadedTokenizers = tokenizers.filter((t) => t.vocab_size > 0);
  const expanded = width > COLLAPSE_THRESHOLD;

  const toggle = () => {
    setWidth((w) => (w > COLLAPSE_THRESHOLD ? COLLAPSED_WIDTH : DEFAULT_WIDTH));
  };

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartX.current = e.clientX;
    dragStartWidth.current = width;
    setIsDragging(true);
  }, [width]);

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - dragStartX.current;
      const next = dragStartWidth.current + delta;
      if (next < COLLAPSE_THRESHOLD) {
        setWidth(COLLAPSED_WIDTH);
      } else {
        setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next)));
      }
    };

    const onMouseUp = () => setIsDragging(false);

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  return (
    <aside
      style={{ width }}
      className="relative bg-white border-r border-gray-200 flex flex-col h-screen shrink-0"
    >
      {/* Header */}
      <div className="flex items-center border-b px-2 py-4 gap-2">
        <button
          onClick={toggle}
          className="p-1 rounded hover:bg-gray-100 text-gray-500 shrink-0"
          title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {expanded ? '◀' : '▶'}
        </button>
        {expanded && (
          <h1 className="text-lg font-bold text-gray-900 truncate">Tokenizer Explorer</h1>
        )}
      </div>

      {/* Nav */}
      <nav className="px-1 py-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={!expanded ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <span className="shrink-0 w-5 text-center">{item.icon}</span>
            {expanded && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Comparison checkboxes */}
      {expanded && loadedTokenizers.length > 1 && (
        <div className="px-4 py-3 border-t">
          <p className="text-xs font-medium text-gray-500 mb-2">Compare (select 2+)</p>
          <div className="space-y-1">
            {loadedTokenizers.map((t) => (
              <label
                key={t.id}
                className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
              >
                <input
                  type="checkbox"
                  checked={comparisonIds.includes(t.id)}
                  onChange={() => toggleComparison(t.id)}
                  className="rounded border-gray-300"
                />
                <span className="truncate">{t.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1" />

      {/* Tokenizer selector */}
      {expanded && (
        <div className="px-4 py-4 border-t overflow-y-auto max-h-[50vh]">
          <TokenizerSelector />
        </div>
      )}

      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        className={`absolute top-0 right-0 w-1 h-full cursor-col-resize transition-colors ${
          isDragging ? 'bg-blue-400' : 'hover:bg-blue-300'
        }`}
      />
    </aside>
  );
}
