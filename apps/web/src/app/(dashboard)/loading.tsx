export default function DashboardLoading() {
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-col gap-4 border-b border-border/50 px-4 py-8 sm:px-10">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-accent/40" />
        <div className="h-4 w-72 animate-pulse rounded-lg bg-accent/20" />
      </div>
      <div className="flex-1 space-y-4 p-4 sm:p-10">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-accent/20" />
        ))}
      </div>
    </div>
  )
}
