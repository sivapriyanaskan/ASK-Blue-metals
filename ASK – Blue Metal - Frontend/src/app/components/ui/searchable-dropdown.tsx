import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Search, Loader2, ChevronDown, X, CheckIcon } from "lucide-react";
import { cn } from "./utils";
import { Input } from "./input";

/**
 * Searchable Dropdown Props for local/static data
 */
export interface SearchableDropdownOption {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface SearchableDropdownProps {
  // Data
  options: SearchableDropdownOption[];
  
  // Selection
  value?: string;
  onValueChange?: (value: string) => void;
  
  // Display
  placeholder?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  
  // Behavior
  disabled?: boolean;
  allowClear?: boolean;
  pageSize?: number; // Items per page for pagination
  
  // Styling
  className?: string;
  dropdownClassName?: string;
  
  // Custom rendering
  renderOption?: (option: SearchableDropdownOption, isSelected: boolean) => React.ReactNode;
  renderSelectedValue?: (option: SearchableDropdownOption | null) => React.ReactNode;
}

/**
 * SearchableDropdown Component
 * 
 * A fully featured dropdown for local/static data with:
 * - Instant search/filter
 * - Pagination for large lists
 * - Keyboard navigation
 * - Clear selection
 * - Loading states
 * - Customizable rendering
 */
export function SearchableDropdown(props: SearchableDropdownProps) {
  const {
    options,
    value,
    onValueChange,
    placeholder = "Select...",
    emptyText = "No results found",
    searchPlaceholder = "Search...",
    disabled = false,
    allowClear = true,
    pageSize = 20,
    className,
    dropdownClassName,
    renderOption,
    renderSelectedValue
  } = props;
  
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [displayCount, setDisplayCount] = React.useState(pageSize);
  
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Get selected option
  const selectedOption = React.useMemo(() => {
    return options.find((opt) => opt.value === value) || null;
  }, [options, value]);

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options;
    
    const searchLower = search.toLowerCase();
    return options.filter((option) => {
      const labelMatch = option.label.toLowerCase().includes(searchLower);
      const descriptionMatch = option.description?.toLowerCase().includes(searchLower);
      return labelMatch || descriptionMatch;
    });
  }, [options, search]);

  // Paginate filtered results
  const displayedOptions = React.useMemo(() => {
    return filteredOptions.slice(0, displayCount);
  }, [filteredOptions, displayCount]);

  const hasMore = displayedOptions.length < filteredOptions.length;

  // Handle scroll for pagination
  const handleScroll = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    // Load more when scrolled to 80%
    if (scrollPercentage > 0.8) {
      setDisplayCount((prev) => Math.min(prev + pageSize, filteredOptions.length));
    }
  }, [hasMore, pageSize, filteredOptions.length]);

  // Attach scroll listener
  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

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
      setDisplayCount(pageSize);
    }
  };

  // Reset display count when search changes
  React.useEffect(() => {
    setDisplayCount(pageSize);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [search, pageSize]);

  // Handle item selection
  const handleSelect = (option: SearchableDropdownOption) => {
    if (option.disabled) return;
    onValueChange?.(option.value);
    setOpen(false);
  };

  // Handle clear
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange?.("");
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;

    const enabledOptions = displayedOptions.filter(opt => !opt.disabled);
    const currentIndex = enabledOptions.findIndex(opt => opt.value === value);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (currentIndex < enabledOptions.length - 1) {
          handleSelect(enabledOptions[currentIndex + 1]);
        } else if (currentIndex === -1 && enabledOptions.length > 0) {
          handleSelect(enabledOptions[0]);
        }
        break;
      
      case "ArrowUp":
        e.preventDefault();
        if (currentIndex > 0) {
          handleSelect(enabledOptions[currentIndex - 1]);
        }
        break;
      
      case "Enter":
        e.preventDefault();
        if (enabledOptions.length > 0 && currentIndex === -1) {
          handleSelect(enabledOptions[0]);
        }
        break;
      
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
    }
  };

  // Render selected value
  const renderSelectedContent = () => {
    if (renderSelectedValue && selectedOption) {
      return renderSelectedValue(selectedOption);
    }
    
    if (selectedOption) {
      return (
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate">{selectedOption.label}</span>
          {selectedOption.description && (
            <span className="text-muted-foreground text-sm truncate">
              ({selectedOption.description})
            </span>
          )}
        </div>
      );
    }
    
    return <span className="text-muted-foreground">{placeholder}</span>;
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Trigger
        type="button"
        disabled={disabled}
        onKeyDown={handleKeyDown}
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
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          onKeyDown={handleKeyDown}
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

            {/* Options List */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto"
            >
              {/* Empty State */}
              {filteredOptions.length === 0 && (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {emptyText}
                </div>
              )}

              {/* Options */}
              {filteredOptions.length > 0 && (
                <div className="py-1">
                  {displayedOptions.map((option) => {
                    const isSelected = option.value === value;
                    
                    if (renderOption) {
                      return (
                        <div
                          key={option.value}
                          onClick={() => handleSelect(option)}
                          className={cn(
                            "relative flex cursor-pointer items-center px-3 py-2 text-sm outline-none transition-colors",
                            "hover:bg-accent hover:text-accent-foreground",
                            isSelected && "bg-accent/50",
                            option.disabled && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {renderOption(option, isSelected)}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={option.value}
                        onClick={() => handleSelect(option)}
                        className={cn(
                          "relative flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm outline-none transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          isSelected && "bg-accent/50",
                          option.disabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
                        )}
                      >
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate">{option.label}</span>
                          {option.description && (
                            <span className="text-xs text-muted-foreground truncate">
                              {option.description}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <CheckIcon className="h-4 w-4 shrink-0 text-primary" />
                        )}
                      </div>
                    );
                  })}

                  {/* Load More Indicator */}
                  {hasMore && (
                    <div className="px-3 py-2 text-center text-sm text-muted-foreground border-t border-border">
                      <span>Scroll for more results...</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer (Results count) */}
            {filteredOptions.length > 0 && (
              <div className="px-3 py-1.5 border-t border-border bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  Showing {displayedOptions.length} of {filteredOptions.length} results
                  {search && ` (filtered from ${options.length} total)`}
                </p>
              </div>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}