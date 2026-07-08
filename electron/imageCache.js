const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { app, net } = require('electron')

function cacheDir() {
  const dir = path.join(app.getPath('userData'), 'image-cache')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function cacheKey(url) {
  return crypto.createHash('sha256').update(url).digest('hex')
}

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
}

async function fetchImage(request) {
  const originalUrl = new URL(request.url).searchParams.get('u')
  if (!originalUrl) return new Response(null, { status: 400 })
  const dir = cacheDir()
  const dataFile = path.join(dir, cacheKey(originalUrl))
  const metaFile = `${dataFile}.json`

  if (fs.existsSync(dataFile) && fs.existsSync(metaFile)) {
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'))
    if (meta.contentType.startsWith('image/')) {
      return new Response(fs.readFileSync(dataFile), { headers: { 'Content-Type': meta.contentType } })
    }
  }

  try {
    const headers = { ...FETCH_HEADERS }
    try {
      headers.Referer = new URL(originalUrl).origin
    } catch {}
    const res = await net.fetch(originalUrl, { headers })
    const contentType = res.headers.get('content-type') ?? ''
    // 일부 사이트는 핫링크 차단 시 200 + HTML/placeholder 를 돌려주므로
    // content-type 이 실제 이미지인지 확인 후에만 캐시/서빙한다.
    if (!res.ok || !contentType.startsWith('image/')) {
      return new Response(null, { status: res.ok ? 502 : res.status })
    }
    const buffer = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(dataFile, buffer)
    fs.writeFileSync(metaFile, JSON.stringify({ contentType }))
    return new Response(buffer, { headers: { 'Content-Type': contentType } })
  } catch (e) {
    console.error('[imageCache] fetch failed:', e)
    return new Response(null, { status: 502 })
  }
}

module.exports = { fetchImage }
