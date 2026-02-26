import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check,
  Minus,
  Inbox,
  Loader2,
  Filter,
  X,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Skeleton row                                                       */
/* ------------------------------------------------------------------ */
function SkeletonRow({ columns }) {
  return (
    <tr className="animate-pulse">
      {columns.map((col, i) => (
        <td
          key={i}
          className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/60"
        >
          <div
            className="h-4 rounded bg-slate-200 dark:bg-slate-700"
            style={{ width: `${50 + Math.random() * 40}%` }}
          />
        </td>
      ))}
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */
function EmptyRow({ colSpan, message, icon: EmptyIcon }) {
  const Icon = EmptyIcon || Inbox;
  return (
    <tr>
      <td colSpan={colSpan} className="py-16 text-center">
        <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500">
          <Icon className="w-12 h-12 opacity-40" />
          <p className="text-sm font-medium">{message || 'No data found'}</p>
        </div>
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/*  Sort icon                                                          */
/* ------------------------------------------------------------------ */
function SortIndicator({ direction }) {
  if (!direction) return <ChevronsUpDown className="w-3.5 h-3.5 opacity-30" />;
  return direction === 'asc' ? (
    <ChevronUp className="w-3.5 h-3.5 text-indigo-500" />
  ) : (
    <ChevronDown className="w-3.5 h-3.5 text-indigo-500" />
  );
}

/* ------------------------------------------------------------------ */
/*  Checkbox                                                           */
/* ------------------------------------------------------------------ */
function Checkbox({ checked, indeterminate, onChange, ariaLabel }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className={[
        'w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-400/40',
        checked || indeterminate
          ? 'bg-indigo-600 border-indigo-600 text-white'
          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700',
      ].join(' ')}
    >
      {indeterminate && <Minus className="w-3 h-3" />}
      {checked && !indeterminate && <Check className="w-3 h-3" />}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Pagination                                                         */
/* ------------------------------------------------------------------ */
function Pagination({ page, pageSize, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const pageNumbers = useMemo(() => {
    const pages = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [page, totalPages]);

  const btn =
    'px-2 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed';

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 border-t border-slate-100 dark:border-slate-700/60">
      <span className="text-xs text-slate-500 dark:text-slate-400">
        Showing {Math.min((page - 1) * pageSize + 1, total)}-
        {Math.min(page * pageSize, total)} of {total}
      </span>

      <div className="flex items-center gap-1">
        <button
          className={`${btn} text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700`}
          disabled={!canPrev}
          onClick={() => onPageChange(1)}
          aria-label="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          className={`${btn} text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700`}
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pageNumbers.map((p) => (
          <button
            key={p}
            className={[
              btn,
              p === page
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700',
            ].join(' ')}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}

        <button
          className={`${btn} text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700`}
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          className={`${btn} text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700`}
          disabled={!canNext}
          onClick={() => onPageChange(totalPages)}
          aria-label="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  DataTable                                                          */
/* ================================================================== */
export function DataTable({
  columns = [],
  data = [],
  loading = false,
  onSort,
  onFilter,
  pagination,
  onPageChange,
  selectable = false,
  onSelect,
  emptyMessage = 'No records found',
  emptyIcon,
  onRowClick,
  stickyHeader = true,
  striped = true,
  compact = false,
  className = '',
  rowKey = 'id',
}) {
  /* ---- local state ---- */
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState(null); // 'asc' | 'desc'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState(new Set());

  /* ---- derived data ---- */
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const q = searchTerm.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        return val !== undefined && val !== null && String(val).toLowerCase().includes(q);
      }),
    );
  }, [data, searchTerm, columns]);

  const sortedData = useMemo(() => {
    if (!sortCol || !sortDir) return filteredData;
    return [...filteredData].sort((a, b) => {
      const av = a[sortCol] ?? '';
      const bv = b[sortCol] ?? '';
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [filteredData, sortCol, sortDir]);

  /* ---- handlers ---- */
  const handleSort = useCallback(
    (key) => {
      let newDir = 'asc';
      if (sortCol === key) {
        newDir = sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? null : 'asc';
      }
      setSortCol(newDir ? key : null);
      setSortDir(newDir);
      onSort?.({ key, direction: newDir });
    },
    [sortCol, sortDir, onSort],
  );

  const toggleSelectAll = useCallback(() => {
    if (selected.size === sortedData.length) {
      setSelected(new Set());
      onSelect?.([]);
    } else {
      const allKeys = new Set(sortedData.map((r) => r[rowKey]));
      setSelected(allKeys);
      onSelect?.(Array.from(allKeys));
    }
  }, [selected, sortedData, rowKey, onSelect]);

  const toggleSelect = useCallback(
    (key) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        onSelect?.(Array.from(next));
        return next;
      });
    },
    [onSelect],
  );

  /* reset selection when data changes */
  useEffect(() => {
    setSelected(new Set());
  }, [data]);

  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3';

  /* ---------------------------------------------------------------- */
  return (
    <div
      className={[
        'bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* ---- Search / filter bar ---- */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-700/60">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              onFilter?.(e.target.value);
            }}
            placeholder="Search…"
            className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 transition"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                onFilter?.('');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {selectable && selected.size > 0 && (
          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            {selected.size} selected
          </span>
        )}
      </div>

      {/* ---- Table ---- */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          {/* -- Head -- */}
          <thead
            className={[
              'bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide',
              stickyHeader && 'sticky top-0 z-10',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <tr>
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <Checkbox
                    checked={
                      sortedData.length > 0 && selected.size === sortedData.length
                    }
                    indeterminate={
                      selected.size > 0 && selected.size < sortedData.length
                    }
                    onChange={toggleSelectAll}
                    ariaLabel="Select all rows"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={[
                    cellPadding,
                    col.sortable !== false && 'cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.label}</span>
                    {col.sortable !== false && (
                      <SortIndicator
                        direction={sortCol === col.key ? sortDir : null}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* -- Body -- */}
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow
                  key={i}
                  columns={[...(selectable ? [{ key: '_sel' }] : []), ...columns]}
                />
              ))
            ) : sortedData.length === 0 ? (
              <EmptyRow
                colSpan={columns.length + (selectable ? 1 : 0)}
                message={emptyMessage}
                icon={emptyIcon}
              />
            ) : (
              sortedData.map((row, idx) => {
                const key = row[rowKey] ?? idx;
                const isSelected = selected.has(key);
                return (
                  <tr
                    key={key}
                    onClick={(e) => {
                      if (e.target.closest('[role="checkbox"]')) return;
                      onRowClick?.(row, idx);
                    }}
                    className={[
                      'transition-colors duration-100 group',
                      onRowClick && 'cursor-pointer',
                      striped && idx % 2 === 1 && 'bg-slate-50/50 dark:bg-slate-700/20',
                      isSelected && 'bg-indigo-50 dark:bg-indigo-500/10',
                      'hover:bg-slate-100/60 dark:hover:bg-slate-700/40',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {selectable && (
                      <td className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/60">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleSelect(key)}
                          ariaLabel={`Select row ${key}`}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`${cellPadding} border-b border-slate-100 dark:border-slate-700/60 text-slate-700 dark:text-slate-300`}
                      >
                        {col.render
                          ? col.render(row[col.key], row, idx)
                          : row[col.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ---- Pagination ---- */}
      {pagination && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total ?? filteredData.length}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

/* ================================================================== */
/*  Column filter dropdown (companion component)                       */
/* ================================================================== */
export function ColumnFilterDropdown({
  column,
  options = [],
  value,
  onChange,
  className = '',
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className={[
          'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
          value
            ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent',
        ].join(' ')}
      >
        <Filter className="w-3 h-3" />
        {column}
        {value && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="ml-0.5 hover:text-indigo-800 dark:hover:text-indigo-200"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 min-w-[160px] py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl">
          <button
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="w-full text-left px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Clear filter
          </button>
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={[
                'w-full text-left px-3 py-1.5 text-xs transition-colors',
                opt === value
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700',
              ].join(' ')}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Page-size selector                                                 */
/* ================================================================== */
export function PageSizeSelector({
  value = 10,
  options = [10, 25, 50, 100],
  onChange,
  className = '',
}) {
  return (
    <div className={`flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 ${className}`}>
      <span>Rows per page</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ================================================================== */
/*  Table status bar                                                   */
/* ================================================================== */
export function TableStatusBar({
  total = 0,
  filtered = 0,
  selected = 0,
  className = '',
}) {
  return (
    <div
      className={`flex items-center gap-4 px-4 py-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700/60 ${className}`}
    >
      <span>
        {filtered < total ? `${filtered} of ${total} rows (filtered)` : `${total} rows`}
      </span>
      {selected > 0 && (
        <span className="text-indigo-600 dark:text-indigo-400 font-medium">
          {selected} selected
        </span>
      )}
    </div>
  );
}

export default DataTable;
