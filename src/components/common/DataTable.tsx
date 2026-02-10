import { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'لا توجد بيانات',
}: DataTableProps<T>) {
  return (
    <div className="table-container">
      <div className="overflow-x-auto -mx-4 md:mx-0">
        <table className="w-full min-w-[600px] md:min-w-0">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-3 md:px-6 py-3 md:py-4 text-right text-xs md:text-sm font-semibold text-foreground whitespace-nowrap ${
                    column.className || ''
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 md:px-6 py-8 md:py-12 text-center text-muted-foreground text-sm"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  onClick={() => onRowClick?.(item)}
                  className={`border-b border-border last:border-0 transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''
                  }`}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm ${column.className || ''}`}
                    >
                      {column.render
                        ? column.render(item)
                        : (item as any)[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 md:px-6 py-3 md:py-4 border-t border-border gap-3">
          <p className="text-xs md:text-sm text-muted-foreground order-2 sm:order-1">
            عرض 1-{Math.min(10, data.length)} من {data.length}
          </p>
          <div className="flex items-center gap-1 md:gap-2 order-1 sm:order-2">
            <button className="p-1.5 md:p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50">
              <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
            </button>
            <button className="px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-primary text-primary-foreground text-xs md:text-sm font-medium">
              1
            </button>
            <button className="px-2 md:px-3 py-1 md:py-1.5 rounded-lg hover:bg-muted text-xs md:text-sm transition-colors">
              2
            </button>
            <button className="px-2 md:px-3 py-1 md:py-1.5 rounded-lg hover:bg-muted text-xs md:text-sm transition-colors">
              3
            </button>
            <button className="p-1.5 md:p-2 rounded-lg hover:bg-muted transition-colors">
              <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
