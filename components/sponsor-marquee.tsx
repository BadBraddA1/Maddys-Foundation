import type { PublicSponsor } from "@/lib/sponsors"

type Props = { sponsors: PublicSponsor[] }

function SponsorMark({ sponsor }: { sponsor: PublicSponsor }) {
  const inner = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sponsor.logo_url}
        alt=""
        className="h-10 w-auto max-w-[9rem] object-contain opacity-90 sm:h-12 sm:max-w-[11rem]"
      />
      <span className="sr-only">{sponsor.name}</span>
    </>
  )

  if (sponsor.website_url) {
    return (
      <a
        href={sponsor.website_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center justify-center px-6 opacity-90 transition hover:opacity-100"
        title={sponsor.name}
      >
        {inner}
      </a>
    )
  }

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center px-6"
      title={sponsor.name}
    >
      {inner}
    </span>
  )
}

/** Infinite horizontal sponsor strip for the footer. */
export function SponsorMarquee({ sponsors }: Props) {
  if (sponsors.length === 0) return null

  const loop = [...sponsors, ...sponsors]

  return (
    <div className="border-b border-on-deep-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 pt-5 sm:px-6 md:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-on-deep-faint">
          Sponsors
        </p>
      </div>
      <div className="sponsor-marquee relative mt-3 overflow-hidden pb-5">
        <div className="sponsor-marquee-track flex w-max items-center">
          {loop.map((sponsor, i) => (
            <SponsorMark
              key={`${sponsor.id}-${i}`}
              sponsor={sponsor}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
