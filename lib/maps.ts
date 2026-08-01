/** Deep links for a place / address string. */
export function mapsLinks(location: string): {
  google: string
  apple: string
} | null {
  const q = location.trim()
  if (!q) return null
  const encoded = encodeURIComponent(q)
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    apple: `https://maps.apple.com/?q=${encoded}`,
  }
}
