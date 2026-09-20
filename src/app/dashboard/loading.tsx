
export default function DashboardLoading() {
  return (
    <div className="grid animate-pulse gap-3.5 motion-reduce:animate-none [&>span]:block [&>span]:h-4.5 [&>span]:w-[min(180px,45%)] [&>span]:rounded-md [&>span]:bg-surface-soft [&>span:nth-child(2)]:h-13.5 [&>span:nth-child(2)]:w-[min(520px,80%)] [&>div]:grid [&>div]:grid-cols-2 [&>div]:gap-2.5 min-[640px]:[&>div]:grid-cols-4 [&>div_i]:block [&>div_i]:min-h-27.5 [&>div_i]:rounded-[15px] [&>div_i]:border [&>div_i]:border-line [&>div_i]:bg-surface [&>section]:grid [&>section]:gap-2.5 [&>section_i]:block [&>section_i]:min-h-18 [&>section_i]:rounded-[15px] [&>section_i]:border [&>section_i]:border-line [&>section_i]:bg-surface" aria-label="Memuat dashboard" aria-busy="true">
      <span />
      <span />
      <div><i /><i /><i /><i /></div>
      <section><i /><i /><i /></section>
    </div>
  );
}
