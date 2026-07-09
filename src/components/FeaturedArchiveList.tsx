import type { ContentRecord } from '../types/global'
import { cachedImageSrc } from '../utils/imageCache'

// Shared layout: 1 featured item on top, then up to 2 items per row below.
// Used by the Archive and Storage tabs. The Favorites tab will reuse this
// once the favorites feature is implemented (see App.tsx).
export default function FeaturedArchiveList({
  records,
  onOpenArticle,
  emptyMessage = 'No articles yet.',
}: {
  records: ContentRecord[]
  onOpenArticle: (record: ContentRecord) => void
  emptyMessage?: string
}) {
  const [featured, ...rest] = records
  const summaryFor = (record: ContentRecord) =>
    record.data.summaries ? Object.values(record.data.summaries)[0] : undefined

  if (!featured) return <p className="text-slate-500 text-sm">{emptyMessage}</p>

  return (
    <div className="favorites-showcase">
      <article className="favorite-feature" onClick={() => onOpenArticle(featured)}>
        {featured.data.images?.[0] ? <img src={cachedImageSrc(featured.data.images[0])} alt="" /> : <div className="favorite-art" />}
        <div className="favorite-copy">
          <span>{featured.data.category ?? 'FEATURED'}</span>
          <h3>{featured.data.title ?? 'Saved article'}</h3>
          <p>{summaryFor(featured) ?? featured.url}</p>
        </div>
      </article>
      <div className="favorite-grid">
        {rest.slice(0, 2).map((record) => (
          <article key={record.id} onClick={() => onOpenArticle(record)}>
            {record.data.images?.[0] ? <img className="favorite-thumb" src={cachedImageSrc(record.data.images[0])} alt="" /> : <div className="favorite-thumb" />}
            <span>RECENTLY SAVED</span>
            <h3>{record.data.title ?? 'Saved article'}</h3>
            <p>{summaryFor(record) ?? record.url}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

export function FeaturedArchiveListPreview() {
  return (
    <div className="favorites-showcase favorites-preview">
      <article className="favorite-feature">
        <div className="favorite-art" />
        <div className="favorite-copy"><span>FEATURED</span><h3>Your favorite articles</h3><p>Saved stories will appear here with their key summaries.</p></div>
      </article>
      <div className="favorite-grid">
        <article><div className="favorite-thumb" /><span>RECENTLY SAVED</span><h3>Article title</h3><p>A short summary of the saved article appears here.</p></article>
        <article><div className="favorite-thumb" /><span>RECENTLY SAVED</span><h3>Article title</h3><p>A short summary of the saved article appears here.</p></article>
      </div>
    </div>
  )
}
