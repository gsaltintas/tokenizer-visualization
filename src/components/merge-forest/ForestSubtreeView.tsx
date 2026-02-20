import type { MergeForestSubtreeNode } from '../../types';

interface ForestSubtreeViewProps {
  node: MergeForestSubtreeNode;
  depth?: number;
  onJumpToRank?: (rank: number) => void;
}

export function ForestSubtreeView({ node, depth = 0, onJumpToRank }: ForestSubtreeViewProps) {
  const indent = depth * 24;
  const isLeaf = node.is_leaf;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-0.5"
        style={{ paddingLeft: `${indent}px` }}
      >
        {depth > 0 && (
          <span className="text-gray-300 font-mono text-xs select-none">{'├─'}</span>
        )}
        <span
          className={`inline-block px-1.5 py-0.5 rounded font-mono text-sm border ${
            isLeaf
              ? 'bg-blue-50 text-blue-800 border-blue-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          } ${!isLeaf && onJumpToRank ? 'cursor-pointer hover:ring-1 hover:ring-amber-400' : ''}`}
          onClick={() => {
            if (!isLeaf && onJumpToRank) onJumpToRank(node.rank);
          }}
          title={
            isLeaf
              ? `Leaf byte: 0x${node.token_hex}`
              : `Rank ${node.rank} — click to jump`
          }
        >
          {JSON.stringify(node.token)}
        </span>
        <span className="text-xs text-gray-400">
          rank {node.rank}
        </span>
        {!isLeaf && (
          <span className="text-xs text-gray-300">
            0x{node.token_hex}
          </span>
        )}
      </div>
      {node.left && (
        <ForestSubtreeView node={node.left} depth={depth + 1} onJumpToRank={onJumpToRank} />
      )}
      {node.right && (
        <ForestSubtreeView node={node.right} depth={depth + 1} onJumpToRank={onJumpToRank} />
      )}
    </div>
  );
}