"use client";

import Icon from "@/components/Icon";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  labels?: { previous?: string; next?: string; page?: string; of?: string };
}

/**
 * Editorial pagination control for public-site list pages.
 * Self-hides when totalPages <= 1.
 */
export default function Pagination({ page, totalPages, onPageChange, labels }: PaginationProps) {
  if (totalPages <= 1) return null;

  const prev = labels?.previous ?? "Previous";
  const next = labels?.next ?? "Next";
  const pageLabel = labels?.page ?? "Page";
  const ofLabel = labels?.of ?? "of";

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-6 mt-16 md:mt-20"
    >
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-charcoal pb-1.5 border-b border-charcoal/30 hover:border-champagne hover:text-champagne transition-colors disabled:opacity-30 disabled:pointer-events-none"
      >
        <Icon name="arrow_back" className="text-base" />
        {prev}
      </button>
      <span className="text-[11px] uppercase tracking-[0.28em] text-on-muted font-light">
        {pageLabel} <span className="font-semibold text-charcoal">{page}</span> {ofLabel} {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-charcoal pb-1.5 border-b border-charcoal/30 hover:border-champagne hover:text-champagne transition-colors disabled:opacity-30 disabled:pointer-events-none"
      >
        {next}
        <Icon name="arrow_forward" className="text-base" />
      </button>
    </nav>
  );
}
