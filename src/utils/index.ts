/** 格式化数字：10000 → 10.0w, 1500 → 1.5k */
export function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

/** 计算距离今天多少天 */
export function getDaysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

/** 格式化文件大小 (KB → MB) */
export function formatSize(kb: number): string {
  const mb = kb / 1024
  return mb < 1 ? `${kb.toFixed(0)} KB` : `${mb.toFixed(1)} MB`
}
