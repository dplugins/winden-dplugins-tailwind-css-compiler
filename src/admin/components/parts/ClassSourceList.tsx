import React, { useState, useMemo } from 'react';
import { ReactComponent as ChevronDown } from '@/assets/icons/lucide/chevron-down.svg';

interface ClassSource {
  name: string;
  count: number;
  classes: string[];
}

interface ClassSourceListProps {
  sources: ClassSource[];
  total: number;
  isLoading?: boolean;
}

/**
 * Displays a collapsible list of CSS classes grouped by their source
 */
export const ClassSourceList: React.FC<ClassSourceListProps> = ({
  sources,
  total,
  isLoading = false,
}) => {
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSource = (sourceName: string) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(sourceName)) {
        next.delete(sourceName);
      } else {
        next.add(sourceName);
      }
      return next;
    });
  };

  // Filter classes based on search query
  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const results: string[] = [];
    for (const source of sources) {
      for (const className of source.classes) {
        if (className.toLowerCase().includes(query)) {
          results.push(className);
        }
      }
    }
    return [...new Set(results)].sort();
  }, [searchQuery, sources]);

  if (isLoading) {
    return (
      <div className="class-source-list mt-4">
        <div className="text-sm text-input animate-pulse">
          Loading class sources...
        </div>
      </div>
    );
  }

  if (!sources || sources.length === 0) {
    return (
      <div className="class-source-list mt-4">
        <div className="text-sm text-input">
          No classes found from any source.
        </div>
      </div>
    );
  }

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="class-source-list mt-4">
      <div className="flex items-center justify-between mb-3 gap-4">
        <h4 className="text-sm font-semibold text-base-foreground whitespace-nowrap">
          Fetched classes ({total} total)
        </h4>
        <input
          type="text"
          placeholder="Search classes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-sm px-2 py-1 border border-border rounded bg-base-1 text-base-foreground placeholder:text-input w-40"
        />
      </div>

      {isSearching ? (
        // Search results - flat list
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-base-1">
            {filteredClasses.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 max-h-[300px] overflow-y-auto">
                {filteredClasses.map((className) => (
                  <code
                    key={className}
                    className="text-xs px-1.5 py-0.5 bg-base-3 text-base-foreground rounded font-mono"
                  >
                    {className}
                  </code>
                ))}
              </div>
            ) : (
              <div className="text-sm text-input py-2">
                No classes found matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      ) : (
        // Accordion list by source
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {sources.map((source) => {
            const isExpanded = expandedSources.has(source.name);

            return (
              <div
                key={source.name}
                className="border border-border rounded-lg overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleSource(source.name)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-base-2 hover:bg-base-3 transition-colors text-left"
                >
                  <span className="font-medium text-sm text-base-foreground">
                    {source.name} ({source.count})
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-input transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isExpanded && (
                  <div className="px-3 py-2 bg-base-1 border-t border-border">
                    <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto">
                      {source.classes.map((className) => (
                        <code
                          key={className}
                          className="text-xs px-1.5 py-0.5 bg-base-3 text-base-foreground rounded font-mono"
                        >
                          {className}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClassSourceList;
