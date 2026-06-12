import type { RepoInfo, Contributor, CommitActivity, LanguageStats } from '../types'

const BASE = 'https://api.github.com'

// ---- 缓存配置 ----
const CACHE_TTL = 5 * 60 * 1000 // 5 分钟

interface CacheEntry<T> {
  data: T
  timestamp: number
}

function getCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(`ghc_${key}`)
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      sessionStorage.removeItem(`ghc_${key}`)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

function setCache<T>(key: string, data: T): void {
  try {
    sessionStorage.setItem(`ghc_${key}`, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {
    // sessionStorage 可能满了，忽略
  }
}

// ---- Token 管理（可选）----
let cachedToken: string | undefined = undefined

function getToken(): string | undefined {
  if (cachedToken !== undefined) return cachedToken || undefined
  // 优先从 URL 参数取 token（方便分享带 token 的链接）
  const params = new URLSearchParams(window.location.search)
  const urlToken = params.get('token')
  if (urlToken) {
    cachedToken = urlToken
    // 安全：读取后立即从 URL 清除，防止泄露到浏览器历史
    const url = new URL(window.location.href)
    url.searchParams.delete('token')
    history.replaceState({}, '', url.toString())
    return urlToken
  }
  // 其次从 localStorage 取
  const stored = localStorage.getItem('ghc_token')
  cachedToken = (stored || undefined) || undefined
  return cachedToken
}

/** 构建请求头 */
function headers(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/vnd.github.v3+json' }
  const token = getToken()
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

/** 检测是否触发了限流 */
async function checkRateLimit(response: Response): Promise<void> {
  const remaining = response.headers.get('x-ratelimit-remaining')
  if (remaining && parseInt(remaining) < 5) {
    const reset = parseInt(response.headers.get('x-ratelimit-reset') || '0')
    const waitMin = Math.ceil((reset * 1000 - Date.now()) / 60000)
    if (waitMin > 0) {
      console.warn(`[GitHub API] 剩余请求次数不足，约 ${waitMin} 分钟后重置`)
    }
  }
}

// ---- 安全的 fetch 封装（单接口失败不影响整体）----
interface SafeResult<T> {
  data: T | null
  error: string | null
}

async function safeFetch<T>(
  cacheKey: string,
  url: string,
  fallback: T | null = null
): Promise<SafeResult<T>> {
  // 1. 先查缓存
  const cached = getCache<T>(cacheKey)
  if (cached) return { data: cached, error: null }

  try {
    const res = await fetch(url, { headers: headers() })
    await checkRateLimit(res)

    if (res.status === 202) {
      // GitHub 统计接口可能返回 202（计算中），返回 fallback
      return { data: fallback, error: null }
    }
    if (res.status === 404) {
      return { data: fallback, error: '资源不存在 (404)' }
    }
    if (res.status === 403) {
      const remaining = res.headers.get('x-ratelimit-remaining')
      if (remaining === '0') {
        return { data: fallback, error: 'API 请求已达上限，请稍后重试或输入 Token 继续' }
      }
      return { data: fallback, error: '访问受限 (403)，可能需要认证' }
    }

    if (!res.ok) {
      return { data: fallback, error: `请求失败 (${res.status})` }
    }

    const data: T = await res.json()
    setCache(cacheKey, data)
    return { data, error: null }
  } catch (e: any) {
    return { data: fallback, error: e.message || '网络异常' }
  }
}

// ---- 公开方法 ----

/** 从 GitHub URL 解析 owner/repo */
export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/\s?#]+)/)
  if (!match) return null
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') }
}

/** 设置访问 Token */
export function setAccessToken(token: string): void {
  localStorage.setItem('ghc_token', token.trim())
  cachedToken = token.trim()
}

/** 清除 Token */
export function clearAccessToken(): void {
  localStorage.removeItem('ghc_token')
  cachedToken = undefined
}

/** 获取当前 Token 状态 */
export function hasToken(): boolean {
  return !!getToken()
}

/** 获取仓库基础信息 */
export async function fetchRepoInfo(owner: string, repo: string): SafeResult<RepoInfo> {
  return safeFetch<RepoInfo>(`repo_${owner}_${repo}`, `${BASE}/repos/${owner}/${repo}`)
}

/** 获取贡献者列表 */
export async function fetchContributors(owner: string, repo: string): SafeResult<Contributor[]> {
  return safeFetch<Contributor[]>(`contributors_${owner}_${repo}`, `${BASE}/repos/${owner}/${repo}/contributors?per_page=10`, [])
}

/** 获取提交活跃度（近一年） */
export async function fetchCommitActivity(owner: string, repo: string): SafeResult<CommitActivity[]> {
  return safeFetch<CommitActivity[]>(`activity_${owner}_${repo}`, `${BASE}/repos/${owner}/${repo}/stats/commit_activity`, [])
}

/** 获取语言占比 */
export async function fetchLanguages(owner: string, repo: string): SafeResult<LanguageStats> {
  return safeFetch<LanguageStats>(`lang_${owner}_${repo}`, `${BASE}/repos/${owner}/${repo}/languages`, {})
}
