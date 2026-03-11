interface ChartSkeletonProps {
  height?: string;
}

export default function ChartSkeleton({ height = 'h-64' }: ChartSkeletonProps) {
  return (
    <div className={`flex items-center justify-center rounded-xl border border-gray-200 bg-white ${height}`}>
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary" />
        <p className="text-sm text-gray-400">Loading chart...</p>
      </div>
    </div>
  );
}
