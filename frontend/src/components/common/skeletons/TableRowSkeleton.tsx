interface TableRowSkeletonProps {
  columns?: number;
  rows?: number;
}

export default function TableRowSkeleton({ columns = 5, rows = 6 }: TableRowSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} className="animate-pulse border-b border-gray-100">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <td key={colIdx} className="px-4 py-3">
              <div
                className="h-4 rounded bg-gray-200"
                style={{ width: colIdx === 0 ? '2rem' : colIdx === 1 ? '10rem' : '4rem' }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
