import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, File } from '@/components/icons';
import { Checkbox } from '@el/Checkbox';
import { Button } from '@el/Button';
import { Badge } from '@el/Badge';
import { Spinner } from '@el/Spinner';
import { cn } from '@utils/index';

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
  file_count?: number;
  size?: string;
}

interface SelectedPath {
  path: string;
  type: 'file' | 'directory';
  name: string;
}

interface TreeViewProps {
  selectedPaths: SelectedPath[];
  onSelectionChange: (paths: SelectedPath[]) => void;
  apiEndpoint: string;
}

export const TreeView: React.FC<TreeViewProps> = ({
  selectedPaths,
  onSelectionChange,
  apiEndpoint,
}) => {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTreeData();
  }, [apiEndpoint]);

  const loadTreeData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(apiEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        // Handle WordPress AJAX response format
        if (data.success) {
          setTreeData(data.data.tree || []);
          setExpandedNodes(new Set()); // Start collapsed
        } else {
          setError(data.data || 'Failed to load file tree');
        }
      } else {
        setError(`Failed to fetch file tree (${response.status})`);
      }
    } catch (err) {
      setError('Error loading file tree: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (path: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedNodes(newExpanded);
  };

  // A path is covered when it (or an ancestor of it) has an explicit entry.
  const isPathCovered = (path: string): boolean => {
    return selectedPaths.some(
      selected => selected.path === path || path.startsWith(selected.path + '/')
    );
  };

  // Tri-state status computed bottom-up from selectedPaths, so a directory reads
  // as 'full' whether it has its own entry, an inherited ancestor entry, or every
  // one of its children independently resolves to 'full'.
  const getNodeStatus = (node: TreeNode): 'full' | 'partial' | 'none' => {
    if (isPathCovered(node.path)) return 'full';
    if (!node.children || node.children.length === 0) return 'none';

    const childStatuses = node.children.map(getNodeStatus);
    if (childStatuses.every(status => status === 'full')) return 'full';
    if (childStatuses.some(status => status !== 'none')) return 'partial';
    return 'none';
  };

  const findNodeByPath = (nodes: TreeNode[], path: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.path === path) return node;
      if (node.children) {
        const found = findNodeByPath(node.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  // Replace a fully-selected ancestor with explicit entries for everything under
  // it except the excluded path, so the excluded subtree reads as unselected
  // while its siblings stay selected (a gitignore-style carve-out).
  const carveOutExclusion = (ancestorNode: TreeNode, excludedPath: string, collected: SelectedPath[]) => {
    if (!ancestorNode.children) return;

    ancestorNode.children.forEach(child => {
      if (child.path === excludedPath) {
        return; // this is the excluded node itself
      }
      if (excludedPath.startsWith(child.path + '/')) {
        carveOutExclusion(child, excludedPath, collected); // child is on the path to the exclusion
        return;
      }
      collected.push({ path: child.path, type: child.type, name: child.name });
    });
  };

  const handleCheckboxChange = (node: TreeNode, checked: boolean) => {
    let newSelectedPaths = [...selectedPaths];

    if (checked) {
      // Drop any entry for this node or its descendants - a single entry for
      // this node covers the whole subtree.
      newSelectedPaths = newSelectedPaths.filter(
        selected => selected.path !== node.path && !selected.path.startsWith(node.path + '/')
      );
      newSelectedPaths.push({ path: node.path, type: node.type, name: node.name });
    } else {
      const literalEntry = selectedPaths.some(selected => selected.path === node.path);

      if (literalEntry) {
        newSelectedPaths = newSelectedPaths.filter(
          selected => selected.path !== node.path && !selected.path.startsWith(node.path + '/')
        );
      } else {
        // Selected only through an inherited ancestor - carve this node out of it.
        const ancestorEntry = selectedPaths.find(
          selected => node.path.startsWith(selected.path + '/')
        );

        if (ancestorEntry) {
          const ancestorNode = findNodeByPath(treeData, ancestorEntry.path);
          newSelectedPaths = newSelectedPaths.filter(selected => selected.path !== ancestorEntry.path);

          if (ancestorNode) {
            const collected: SelectedPath[] = [];
            carveOutExclusion(ancestorNode, node.path, collected);
            newSelectedPaths.push(...collected);
          }
        }
      }
    }

    onSelectionChange(newSelectedPaths);
  };

  const renderNode = (node: TreeNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.path);
    const nodeStatus = getNodeStatus(node);
    const paddingLeft = level * 20;

    return (
      <div key={node.path} className="select-none">
        <div
          className="flex items-center py-1 px-2 hover:bg-base-1 rounded"
          style={{ paddingLeft: `${paddingLeft + 8}px` }}
        >
          {node.type === 'directory' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleExpanded(node.path)}
              className="mr-1 h-4 w-4 min-w-4 p-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}

          {node.type === 'file' && (
            <span className="w-4 mr-1"></span>
          )}

          <div className="mr-2">
            <Checkbox
              checked={nodeStatus === 'partial' ? 'indeterminate' : nodeStatus === 'full'}
              onCheckedChange={(checked) => handleCheckboxChange(node, checked as boolean)}
            />
          </div>

          <div className="mr-2">
            {node.type === 'directory' ? (
              isExpanded ? (
                <FolderOpen className="h-5 w-5 text-muted" />
              ) : (
                <Folder className="h-5 w-5 text-muted" />
              )
            ) : (
              <File className="h-5 w-5 text-muted" />
            )}
          </div>

          <span className="flex-1 text-sm">
            {node.name}
            {node.type === 'directory' && node.file_count && node.file_count > 0 && (
              <Badge variant="count" className="ml-2">
                {node.file_count} {node.file_count === 1 ? 'file' : 'files'}
              </Badge>
            )}
            {node.type === 'file' && node.size && (
              <span className="ml-2 text-xs text-dimmed">
                {node.size}
              </span>
            )}
          </span>
        </div>

        {node.type === 'directory' && isExpanded && node.children && node.children.length > 0 && (
          <div>
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-1 text-dimmed">
          <Spinner size="sm" />
          Loading file tree...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-danger/10 border border-danger rounded">
        <div className="flex justify-between items-center">
          <span className="text-danger">{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={loadTreeData}
            className="ml-4"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (treeData.length === 0) {
    return (
      <div className="p-4 text-center text-dimmed">
        No files or folders found.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3">
        <h4 className="font-medium text-sm">
          WP Content Files Structure
        </h4>
      </div>

      <div className="border border-border rounded px-2 py-4 bg-base-2 max-h-96 overflow-y-auto">
        {treeData.map(node => renderNode(node))}
      </div>
    </div>
  );
};
