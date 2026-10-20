/** Previous / next controls for a zero-based paged list. Renders nothing when everything fits on one page. */
export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  if (totalPages <= 1) return null
  const button = 'h-[30px] w-[90px] rounded-[8px] border border-[#E6E8EC] bg-white text-[13px] text-[#344054] disabled:opacity-40'
  return (
    <nav aria-label="Pagination" className="mt-3 flex items-center justify-end gap-3 text-[13px] text-[#667085]">
      <button type="button" className={button} disabled={page <= 0} onClick={() => onPage(page - 1)}>
        ‹ Previous
      </button>
      <span>
        Page {page + 1} of {totalPages}
      </span>
      <button type="button" className={button} disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)}>
        Next ›
      </button>
    </nav>
  )
}
