/** Keep authored emphasis, while treating all roadmap content as plain text first. */
export function formatRoadmapText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

export function splitRoadmapItem(text: string): { title: string; description: string } {
  const match = text.match(/^\*\*(.+?)\*\*\s*[—–-]\s*(.*)$/s)
  return match ? { title: match[1]!, description: match[2]! } : { title: text.replace(/\*\*/g, ''), description: '' }
}
