import React, { useState } from 'react';
import '@/types/global.d.ts';
import { TreeView } from '../TreeView';
import { Button } from '@el/Button';
import { SwitchWithLabel } from '@el/SwitchWithLabel';
import { FormTokenField } from '@el/FormTokenField';
import { Folder } from '../icons';
import DeleteOutlineOutlinedIcon from '@/assets/icons/DeleteOutlineOutlinedIcon.svg';

interface SelectedPath {
  path: string;
  type: 'file' | 'directory';
  name: string;
}

interface FilesScanTabProps {
  settings: any;
  handleChange: (field: string) => (value: any) => void;
}

export const FilesScanTab: React.FC<FilesScanTabProps> = ({ settings, handleChange }) => {
  // Initialize selectedPaths from settings.scan_path
  const [selectedPaths, setSelectedPaths] = useState<SelectedPath[]>(() => {
    if (settings?.scan_path && Array.isArray(settings.scan_path)) {
      return settings.scan_path.map((path: string) => ({
        path: path,
        type: 'directory' as const,
        name: path.split('/').pop() || path // Extract folder name from path
      }));
    }
    return [];
  });

  const [fileFormats, setFileFormats] = useState<string[]>(
    settings?.scan_file_formats?.length && Array.isArray(settings?.scan_file_formats)
      ? settings?.scan_file_formats
      : []
  );

  const handlePathSelectionChange = (newSelectedPaths: SelectedPath[]) => {
    // Filter out subfolders - only keep parent folders
    const filteredPaths = newSelectedPaths.filter((path, index, array) => {
      // Check if this path is a subfolder of any other path in the array
      return !array.some((otherPath, otherIndex) => {
        if (index === otherIndex) return false;
        // Check if current path starts with another path (is a subfolder)
        return path.path.startsWith(otherPath.path + '/');
      });
    });

    setSelectedPaths(filteredPaths);
    // Convert to the format expected by settings
    const paths = filteredPaths.map(p => p.path);
    handleChange('scan_path')(paths);
  };

  const removeSelectedPath = (pathToRemove: string) => {
    const updatedPaths = selectedPaths.filter(path => path.path !== pathToRemove);
    setSelectedPaths(updatedPaths);
    const paths = updatedPaths.map(p => p.path);
    handleChange('scan_path')(paths);
  };

  const clearAllPaths = () => {
    setSelectedPaths([]);
    handleChange('scan_path')([]);
  };

  // Use WordPress AJAX endpoint
  const apiEndpoint = `${window.ajaxUrl || ''}?action=winden_browse_files&_nonce=${window.nonce || ''}`;

  return (
    <div className="space-y-6">
      {/* File Formats Filter */}
      <div>
        <FormTokenField
          label="Scan only these file formats (leave empty to scan all)"
          value={fileFormats}
          onChange={(newFormats) => {
            setFileFormats(newFormats);
            handleChange('scan_file_formats')(newFormats);
          }}
          suggestions={['php', 'html', 'js', 'jsx', 'ts', 'tsx', 'twig']}
        />
      </div>

      {/* Tree View */}
      <div>
        <TreeView
          selectedPaths={selectedPaths}
          onSelectionChange={handlePathSelectionChange}
          apiEndpoint={apiEndpoint}
        />
      </div>

      {/* Selected Items Summary */}
      {selectedPaths.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">
              Selected Items ({selectedPaths.length})
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllPaths}
              className="text-danger hover:text-danger"
            >
              Clear All
            </Button>
          </div>

          <div className="max-h-48 overflow-y-auto border border-border rounded bg-base-1">
            {selectedPaths.map((path, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 border-b border-border last:border-b-0 hover:bg-base-2"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Folder className="h-4 w-4 text-muted flex-shrink-0" />
                  <span className="text-sm truncate" title={path.path}>
                    {path.path}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeSelectedPath(path.path)}
                  className="text-danger hover:text-danger ml-2 flex-shrink-0"
                >
                  <DeleteOutlineOutlinedIcon className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-dimmed">
        <p>Common development folders like node_modules, vendor, .git, etc. are automatically ignored.</p>
        <p className="mt-1">Select folders or files above. If nothing is selected, the scan will have nothing to search.</p>
      </div>
    </div>
  );
};
