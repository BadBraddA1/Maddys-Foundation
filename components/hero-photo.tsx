/**
 * LCP hero photo — sized WebP sources so phones don't download the full portrait.
 * Uses native <picture> so delivery works even when the image optimizer isn't available.
 */
export function HeroPhoto() {
  return (
    <picture>
      <source
        media="(max-width: 640px)"
        srcSet="/brand/maddy-640.webp"
        type="image/webp"
      />
      <source
        media="(max-width: 1024px)"
        srcSet="/brand/maddy-960.webp"
        type="image/webp"
      />
      <source srcSet="/brand/maddy.webp" type="image/webp" />
      {/* eslint-disable-next-line @next/next/no-img-element -- intentional LCP picture */}
      <img
        src="/brand/maddy.jpg"
        alt="Madalyn Robinson"
        width={1600}
        height={2134}
        fetchPriority="high"
        decoding="async"
        className="animate-hero-drift absolute inset-0 h-full w-full object-cover object-[center_top]"
      />
    </picture>
  )
}
