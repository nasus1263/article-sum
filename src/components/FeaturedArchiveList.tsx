import type { ContentRecord } from '../types/global'
import { cachedImageSrc } from '../utils/imageCache'

function FavoriteStar({ record, onToggleFavorite }: { record: ContentRecord; onToggleFavorite: (record: ContentRecord) => void }) {
  const favorited = !!record.favoritedAt
  return (
    <button
      className={`favorite-star ${favorited ? 'active' : ''}`}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={favorited}
      onClick={(e) => { e.stopPropagation(); onToggleFavorite(record) }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3 2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 17.03l-5.5 2.89 1.05-6.12L3.1 9.47l6.15-.9z" />
      </svg>
    </button>
  )
}

// Shared layout: 1 featured item on top, then up to 2 items per row below.
// Used by the Archive tab and the Favorites tab (favoritesOnly=true) — see Archive.tsx.
export default function FeaturedArchiveList({
  records,
  onOpenArticle,
  onToggleFavorite,
  emptyMessage = 'No articles yet.',
}: {
  records: ContentRecord[]
  onOpenArticle: (record: ContentRecord) => void
  onToggleFavorite: (record: ContentRecord) => void
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
        <FavoriteStar record={featured} onToggleFavorite={onToggleFavorite} />
      </article>
      <div className="favorite-grid">
        {rest.slice(0, 2).map((record) => (
          <article key={record.id} onClick={() => onOpenArticle(record)}>
            {record.data.images?.[0] ? <img className="favorite-thumb" src={cachedImageSrc(record.data.images[0])} alt="" /> : <div className="favorite-thumb" />}
            <span>RECENTLY SAVED</span>
            <h3>{record.data.title ?? 'Saved article'}</h3>
            <p>{summaryFor(record) ?? record.url}</p>
            <FavoriteStar record={record} onToggleFavorite={onToggleFavorite} />
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
