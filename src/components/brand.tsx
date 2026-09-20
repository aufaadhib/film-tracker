import Image from "next/image";
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="inline-flex min-w-max items-center gap-2.5 font-display [&_strong]:text-[1.06rem] [&_strong]:font-[750] [&_strong]:tracking-[-.045em]" href="/" aria-label="Reelmark — Beranda">
      <Image className="block size-8.5 shrink-0" src="/reelmark-mark.svg" width={34} height={34} alt="" aria-hidden="true" />
      {!compact && <strong>reelmark</strong>}
    </Link>
  );
}
