export function cachedImageSrc(url: string | null | undefined): string | undefined {
  return url ? `appimg://cache/?u=${encodeURIComponent(url)}` : undefined
}
