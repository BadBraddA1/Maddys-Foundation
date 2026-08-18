export type LogoFile = {
  label: string
  href: string
  filename: string
}

export type LogoVariant = {
  id: "ink" | "white"
  title: string
  blurb: string
  preview: string
  plate: "cream" | "deep"
  files: LogoFile[]
}

export const logoVariants: LogoVariant[] = [
  {
    id: "ink",
    title: "Ink on light",
    blurb: "Print, letterhead, and pale paper. PNG keeps a white field; transparent PNG knocks the paper out.",
    preview: "/brand/logo.png",
    plate: "cream",
    files: [
      {
        label: "PNG",
        href: "/brand/logo.png",
        filename: "maddys-foundation-logo.png",
      },
      {
        label: "Transparent PNG",
        href: "/brand/logo-transparent.png",
        filename: "maddys-foundation-logo-transparent.png",
      },
      {
        label: "JPG",
        href: "/brand/logo.jpg",
        filename: "maddys-foundation-logo.jpg",
      },
    ],
  },
  {
    id: "white",
    title: "White on dark",
    blurb: "Fairway green, photographs, and video. Transparent PNG only.",
    preview: "/brand/logo-white.png",
    plate: "deep",
    files: [
      {
        label: "White PNG",
        href: "/brand/logo-white.png",
        filename: "maddys-foundation-logo-white.png",
      },
    ],
  },
]
