import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Search, Loader2, ChevronDown, X, CheckIcon } from "lucide-react";
import { cn } from "./utils";
import { Input } from "./input";
import { Button } from "./button";

/**
 * API Response types for server-side data
 */
export interface ApiDropdownResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * API Dropdown Props
 */
export interface ApiDropdownProps<T> {
  // Required Props
  fetchData: (params: {
    search: string;
    page: number;
    pageSize: number;
  }) => Promise<ApiDropdownResponse<T>>;
  getItemLabel: (item: T) => string;
  getItemValue: (item: T) => string;
  
  // Selection Props
  value?: string;
  onValueChange?: (value: string, item: T | null) => void;
  
  // Display Props
  placeholder?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  loadMoreText?: string;
  
  // Behavior Props
  pageSize?: number;
  debounceMs?: number;
  disabled?: boolean;
  allowClear?: boolean;
  
  // Styling Props
  className?: string;
  dropdownClassName?: string;
  
  // Render Customization (optional)
  renderItem?: (item: T, isSelected: boolean) => React.ReactNode;
  renderSelectedValue?: (item: T | null) => React.ReactNode;
  
  // Additional display field (for showing extra info like code)
  getItemDescription?: (item: T) => string;
}

/**
 * ApiDropdown Component
 * 
 * A fully featured, reusable dropdown component with:
 * - Server-side search
 * - Server-side pagination (infinite scroll)
 * - Loading, empty, and error states
 * - Keyboard navigation
 * - Clear selection
 * - Customizable rendering
 */
export function ApiDropdown<T>({
  fetchData,
  getItemLabel,
  getItemValue,
  value,
  onValueChange,
  placeholder = "Select...",
  emptyText = "No results found",
  searchPlaceholder = "Search...",
  loadMoreText = "Load more",
  pageSize = 20,
  debounceMs = 300,
  disabled = false,
  allowClear = true,
  className,
  dropdownClassName,
  renderItem,
  renderSelectedValue,
  getItemDescription,
}: ApiDropdownProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [items, setItems] = React.useState<T[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const [total, setTotal] = React.useState(0);
  
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const loadMoreRef = React.useRef<HTMLDivElement>(null);
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Get selected item
  const selectedItem = React.useMemo(() => {
    return items.find((item) => getItemValue(item) === value) || null;
  }, [items, value, getItemValue]);

  // Fetch data function
  const loadData = React.useCallback(
    async (searchQuery: string, pageNum: number, append: boolean = false) => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetchData({
          search: searchQuery,
          page: pageNum,
          pageSize,
        });

        setItems((prev) => append ? [...prev, ...response.items] : response.items);
        setHasMore(response.hasMore);
        setTotal(response.total);
        setPage(pageNum);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [fetchData, pageSize]
  );

  // Debounced search
  React.useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (open) {
        loadData(search, 1, false);
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [search, open, loadData, debounceMs]);

  // Load more on scroll (Intersection Observer)
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadData(search, page + 1, true);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, search, page, loadData]);

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  }, [open]);

  // Reset on close
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearch("");
      setPage(1);
    }
  };

  // Handle item selection
  const handleSelect = (item: T) => {
    const itemValue = getItemValue(item);
    onValueChange?.(itemValue, item);
    setOpen(false);
  };

  // Handle clear
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange?.("", null);
  };

  // Render selected value
  const renderSelectedContent = () => {
    if (renderSelectedValue && selectedItem) {
      return renderSelectedValue(selectedItem);
    }
    
    if (selectedItem) {
      const label = getItemLabel(selectedItem);
      const description = getItemDescription?.(selectedItem);
      
      return (
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate">{label}</span>
          {description && (
            <span className="text-muted-foreground text-sm truncate">
              ({description})
            </span>
          )}
        </div>
      );
    }
    
    return <span className="text-muted-foreground">{placeholder}</span>;
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-input-background px-3 py-1 text-base outline-none transition-[color,box-shadow]",
            "hover:bg-input-background/80",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "md:text-sm",
            className
          )}
        >
          <div className="flex-1 flex items-center gap-2 min-w-0 text-left">
            {renderSelectedContent()}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {allowClear && value && !disabled && (
              <div
                onClick={handleClear}
                className="hover:bg-accent rounded p-0.5 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </div>
            )}
            <ChevronDown className={cn(
              "h-4 w-4 opacity-50 transition-transform",
              open && "transform rotate-180"
            )} />
          </div>
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className={cn(
            "z-50 w-[var(--radix-popover-trigger-width)] rounded-md border bg-popover shadow-lg outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            dropdownClassName
          )}
        >
          <div className="flex flex-col max-h-[320px]">
            {/* Search Input */}
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="pl-9 h-8"
                />
              </div>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto">
              {/* Loading State (Initial) */}
              {loading && items.length === 0 && (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm">Loading...</span>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="px-3 py-8 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => loadData(search, 1, false)}
                  >
                    Retry
                  </Button>
                </div>
              )}

              {/* Empty State */}
              {!loading && !error && items.length === 0 && (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {emptyText}
                </div>
              )}

              {/* Items */}
              {!error && items.length > 0 && (
                <div className="py-1">
                  {items.map((item, index) => {
                    const itemValue = getItemValue(item);
                    const isSelected = itemValue === value;
                    
                    if (renderItem) {
                      return (
                        <div
                          key={itemValue}
                          onClick={() => handleSelect(item)}
                          className={cn(
                            "relative flex cursor-pointer items-center px-3 py-2 text-sm outline-none transition-colors",
                            "hover:bg-accent hover:text-accent-foreground",
                            isSelected && "bg-accent/50"
                          )}
                        >
                          {renderItem(item, isSelected)}
                        </div>
                      );
                    }

                    const label = getItemLabel(item);
                    const description = getItemDescription?.(item);

                    return (
                      <div
                        key={itemValue}
                        onClick={() => handleSelect(item)}
                        className={cn(
                          "relative flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm outline-none transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          isSelected && "bg-accent/50"
                        )}
                      >
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate">{label}</span>
                          {description && (
                            <span className="text-xs text-muted-foreground truncate">
                              {description}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <CheckIcon className="h-4 w-4 shrink-0 text-primary" />
                        )}
                      </div>
                    );
                  })}

                  {/* Load More Trigger */}
                  {hasMore && (
                    <div
                      ref={loadMoreRef}
                      className="px-3 py-2 text-center text-sm text-muted-foreground"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading more...</span>
                        </div>
                      ) : (
                        <span>{loadMoreText}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer (Results count) */}
            {items.length > 0 && (
              <div className="px-3 py-1.5 border-t border-border bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  Showing {items.length} of {total} results
                </p>
              </div>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
