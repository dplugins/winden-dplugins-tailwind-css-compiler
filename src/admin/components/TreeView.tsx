import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, File } from '@/components/icons';
import { Checkbox } from '@el/Checkbox';
import { Button } from '@el/Button';
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

  const isSelected = (path: string) => {
    return selectedPaths.some(selected => selected.path === path);
  };

  const getAllChildPaths = (node: TreeNode): string[] => {
    let paths: string[] = [];

    if (node.children) {
      node.children.forEach(child => {
        paths.push(child.path);
        if (child.type === 'directory') {
          paths = paths.concat(getAllChildPaths(child));
        }
      });
    }

    return paths;
  };

  const getAllChildNodes = (node: TreeNode): TreeNode[] => {
    let nodes: TreeNode[] = [];

    if (node.children) {
      node.children.forEach(child => {
        nodes.push(child);
        if (child.type === 'directory') {
          nodes = nodes.concat(getAllChildNodes(child));
        }
      });
    }

    return nodes;
  };

  const isIndeterminate = (node: TreeNode): boolean => {
    if (node.type !== 'directory' || !node.children) return false;

    const childPaths = getAllChildPaths(node);
    const selectedChildCount = childPaths.filter(path => isSelected(path)).length;

    return selectedChildCount > 0 && selectedChildCount < childPaths.length;
  };

  const handleCheckboxChange = (node: TreeNode, checked: boolean) => {
    let newSelectedPaths = [...selectedPaths];

    if (checked) {
      // Add the node
      if (!isSelected(node.path)) {
        newSelectedPaths.push({
          path: node.path,
          type: node.type,
          name: node.name,
        });
      }

      // If it's a directory, add all children
      if (node.type === 'directory' && node.children) {
        const childNodes = getAllChildNodes(node);

        childNodes.forEach(childNode => {
          if (!isSelected(childNode.path)) {
            newSelectedPaths.push({
              path: childNode.path,
              type: childNode.type,
              name: childNode.name,
            });
          }
        });
      }
    } else {
      // Remove the node
      newSelectedPaths = newSelectedPaths.filter(selected => selected.path !== node.path);

      // If it's a directory, remove all children
      if (node.type === 'directory' && node.children) {
        const childPaths = getAllChildPaths(node);
        newSelectedPaths = newSelectedPaths.filter(selected => !childPaths.includes(selected.path));
      }
    }

    onSelectionChange(newSelectedPaths);
  };

  const renderNode = (node: TreeNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.path);
    const nodeSelected = isSelected(node.path);
    const nodeIndeterminate = isIndeterminate(node);
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
              checked={nodeSelected}
              // @ts-ignore - Radix supports indeterminate
              indeterminate={nodeIndeterminate ? 'true' : undefined}
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
              <span className="ml-2 text-xs text-dimmed">
                ({node.file_count} {node.file_count === 1 ? 'file' : 'files'})
              </span>
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
        <div className="text-dimmed">Loading file tree...</div>
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
