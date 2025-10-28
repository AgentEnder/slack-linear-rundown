/**
 * SortSelect Component
 * Dropdown for sorting issues
 */

import './SortSelect.css';

export type SortOption = 'updated-desc' | 'updated-asc' | 'priority-desc' | 'priority-asc' | 'title-asc' | 'title-desc';

interface SortSelectProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'updated-desc', label: 'Recently Updated' },
  { value: 'updated-asc', label: 'Least Recently Updated' },
  { value: 'priority-desc', label: 'Highest Priority' },
  { value: 'priority-asc', label: 'Lowest Priority' },
  { value: 'title-asc', label: 'Title (A-Z)' },
  { value: 'title-desc', label: 'Title (Z-A)' },
];

export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <div className="sort-select">
      <label className="sort-label">Sort by:</label>
      <select
        className="sort-dropdown"
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
