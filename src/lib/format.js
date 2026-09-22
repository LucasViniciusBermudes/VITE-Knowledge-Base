const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

// Monta a data a partir das partes em vez de usar replace() no resultado:
// o pt-BR devolve "03 de set. de 2026", e um replace(' de ','') só troca a
// primeira ocorrência, resultando em "03set de 2026".
export function formatDate(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const parts = DATE_FORMATTER.formatToParts(date)
  const get = (type) => parts.find((p) => p.type === type)?.value || ''
  const month = get('month').replace('.', '')
  return `${get('day')} ${month} ${get('year')}`
}

export function formatSize(bytes) {
  if (typeof bytes !== 'number') return bytes || ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
}

export function mapRow(r) {
  let attachments = Array.isArray(r.attachments) ? r.attachments : []
  if (!attachments.length && r.attachment) attachments = [r.attachment]
  return {
    id: r.id,
    title: r.title,
    question: r.question,
    cat: r.cat,
    body: r.body || '',
    tags: r.tags || [],
    author: r.author || '—',
    author_id: r.author_id || null,
    created: formatDate(r.created_at),
    updated: formatDate(r.updated_at),
    views: r.views || 0,
    starred: !!r.starred,
    pinned: !!r.pinned,
    attachments,
  }
}
