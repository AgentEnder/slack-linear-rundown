import { useRef, useEffect } from 'react';
import styles from '../Users.module.css';

interface UserFiltersProps {
  domainFilter: string[];
  mappingFilter: string;
  activeFilter: string;
  reportsFilter: string;
  uniqueDomains: string[];
  isDomainDropdownOpen: boolean;
  onDomainFilterChange: (domains: string[]) => void;
  onMappingFilterChange: (value: string) => void;
  onActiveFilterChange: (value: string) => void;
  onReportsFilterChange: (value: string) => void;
  onDomainDropdownToggle: () => void;
  onDomainDropdownClose: () => void;
}

export function UserFilters({
  domainFilter,
  mappingFilter,
  activeFilter,
  reportsFilter,
  uniqueDomains,
  isDomainDropdownOpen,
  onDomainFilterChange,
  onMappingFilterChange,
  onActiveFilterChange,
  onReportsFilterChange,
  onDomainDropdownToggle,
  onDomainDropdownClose,
}: UserFiltersProps) {
  const domainDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        domainDropdownRef.current &&
        !domainDropdownRef.current.contains(event.target as Node)
      ) {
        onDomainDropdownClose();
      }
    };

    if (isDomainDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDomainDropdownOpen, onDomainDropdownClose]);

  const handleDomainToggle = (domain: string) => {
    onDomainFilterChange(
      domainFilter.includes(domain)
        ? domainFilter.filter((d) => d !== domain)
        : [...domainFilter, domain]
    );
  };

  return (
    <div className={styles.filters}>
      <div className={styles.filterGroup}>
        <label htmlFor="domain-filter">Email Domains:</label>
        <div className={styles.combobox} ref={domainDropdownRef}>
          <button
            id="domain-filter"
            className={styles.comboboxButton}
            onClick={onDomainDropdownToggle}
            type="button"
          >
            <span className={styles.comboboxValue}>
              {domainFilter.length === 0
                ? 'All domains'
                : domainFilter.length === 1
                ? domainFilter[0]
                : `${domainFilter.length} domains selected`}
            </span>
            <span className={styles.comboboxArrow}>▼</span>
          </button>
          {isDomainDropdownOpen && (
            <div className={styles.comboboxDropdown}>
              {uniqueDomains.length === 0 ? (
                <div className={styles.comboboxEmpty}>
                  No domains available
                </div>
              ) : (
                <>
                  <label className={styles.comboboxOption}>
                    <input
                      type="checkbox"
                      checked={domainFilter.length === 0}
                      onChange={() => onDomainFilterChange([])}
                    />
                    <span>All domains</span>
                  </label>
                  {uniqueDomains.map((domain) => (
                    <label key={domain} className={styles.comboboxOption}>
                      <input
                        type="checkbox"
                        checked={domainFilter.includes(domain)}
                        onChange={() => handleDomainToggle(domain)}
                      />
                      <span>{domain}</span>
                    </label>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="mapping-filter">Mapping:</label>
        <select
          id="mapping-filter"
          value={mappingFilter}
          onChange={(e) => onMappingFilterChange(e.target.value)}
        >
          <option value="all">All</option>
          <option value="fully-mapped">Fully Mapped</option>
          <option value="slack-only">Slack Only</option>
          <option value="linear-only">Linear Only</option>
          <option value="unmapped">Unmapped</option>
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="active-filter">Status:</label>
        <select
          id="active-filter"
          value={activeFilter}
          onChange={(e) => onActiveFilterChange(e.target.value)}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="reports-filter">Reports:</label>
        <select
          id="reports-filter"
          value={reportsFilter}
          onChange={(e) => onReportsFilterChange(e.target.value)}
        >
          <option value="all">All</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>
    </div>
  );
}
