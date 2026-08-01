/**
 * LCP hero photo — sized WebP sources so phones don't download the full portrait.
 * Preloads match the picture sources so the logo doesn’t win the browser’s image preload slot.
 * Uses native <picture> so delivery works even when the image optimizer isn’t available.
 */
export function HeroPhoto() {
  return (
    <>
      <link
        rel="preload"
        as="image"
        href="/brand/maddy-640.webp"
        type="image/webp"
        media="(max-width: 640px)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href="/brand/maddy-960.webp"
        type="image/webp"
        media="(min-width: 641px) and (max-width: 1024px)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href="/brand/maddy.webp"
        type="image/webp"
        media="(min-width: 1025px)"
        fetchPriority="high"
      />
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
    </>
  )
}
