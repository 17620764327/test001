import type { RepoInfo, AIScoreResult, ScoreDimension } from '../types'
import { formatNum, getDaysAgo } from '../utils'

/**
 * AI 多维评分算法 v3
 * 6 维度加权评估，新增：
 * - 数据完整性置信度标注（部分 API 失败时降低可信度）
 * - 归档项目大幅降分
 * - 统一使用 utils 工具函数，消除代码重复
 */

// 维度权重配置（集中管理，方便调参）
const WEIGHTS = {
  popularity: 0.25,
  activity: 0.20,
  collaboration: 0.15,
  maintainability: 0.15,
  maturity: 0.15,
  openness: 0.10,
} as const

export function calculateAIScore(
  repo: RepoInfo,
  contributorCount: number,
  weeklyCommits: number,
  completeness?: { hasCommitActivity: boolean; hasContributors: boolean; hasLanguages: boolean }
): AIScoreResult {
  // 归档项目直接低分
  if (repo.archived) {
    return {
      total: 20,
      grade: 'D',
      confidence: 'high',
      dimensions: [
        { name: '热度与影响力', score: Math.min(100, (repo.stargazers_count / 500) * 30), weight: WEIGHTS.popularity, detail: `已归档，Star ${formatNum(repo.stargazers_count)}` },
        { name: '社区活跃度', score: 5, weight: WEIGHTS.activity, detail: '仓库已归档，停止维护' },
        { name: '协作健康度', score: 20, weight: WEIGHTS.collaboration, detail: `${contributorCount} 位贡献者` },
        { name: '代码维护性', score: repo.license ? 60 : 40, weight: WEIGHTS.maintainability, detail: repo.archived ? '已归档' : '' },
        { name: '项目成熟度', score: 25, weight: WEIGHTS.maturity, detail: `已归档，不再更新` },
        { name: '开放度与规范', score: repo.topics.length > 0 ? 50 : 35, weight: WEIGHTS.openness, detail: '已归档' },
      ],
    }
  }

  const dims: ScoreDimension[] = []

  dims.push(scorePopularity(repo))
  dims.push(scoreActivity(repo, weeklyCommits))
  dims.push(scoreCollaboration(contributorCount, repo.forks_count))
  dims.push(scoreMaintainability(repo))
  dims.push(scoreMaturity(repo, weeklyCommits))
  dims.push(scoreOpenness(repo))

  let total = 0
  for (const d of dims) total += d.score * d.weight
  total = Math.round(total)

  let grade = 'D'
  if (total >= 90) grade = 'S'
  else if (total >= 75) grade = 'A'
  else if (total >= 60) grade = 'B'
  else if (total >= 40) grade = 'C'

  // 计算数据完整性置信度
  const confidence = calcConfidence(completeness)

  return { total, grade, confidence, dimensions: dims }
}

/** 根据数据缺失情况计算置信度 */
function calcConfidence(
  c?: { hasCommitActivity: boolean; hasContributors: boolean; hasLanguages: boolean }
): 'high' | 'medium' | 'low' {
  if (!c) return 'high' // 未传入则默认高置信度
  const missingCount = [!c.hasCommitActivity, !c.hasContributors, !c.hasLanguages].filter(Boolean).length
  if (missingCount === 0) return 'high'
  if (missingCount <= 1) return 'medium'
  return 'low'
}

// ============================================================
//  维度 1：热度与影响力 (权重 25%)
//  只用 Star + Fork（Watchers 与 Star 高度冗余，不重复计算）
// ============================================================
function scorePopularity(repo: RepoInfo): ScoreDimension {
  const stars = repo.stargazers_count
  const forks = repo.forks_count

  // Star 分段对数评分
  let starScore: number
  if (stars < 100) starScore = (stars / 100) * 35
  else if (stars < 1000) starScore = 35 + ((stars - 100) / 900) * 25
  else if (stars < 10000) starScore = 60 + ((stars - 1000) / 9000) * 20
  else starScore = 80 + Math.min(15, Math.log10(stars / 10000) * 12)

  // Fork 对数压缩
  let forkScore = forks > 0 ? Math.min(100, Math.log2(forks + 1) / Math.log2(2001) * 100) : 5

  const score = Math.round(starScore * 0.7 + forkScore * 0.3)

  let detail = `Star ${formatNum(stars)}、Fork ${formatNum(forks)}`
  if (stars >= 50000) detail += '，世界级顶级项目'
  else if (stars >= 10000) detail += '，极具影响力的热门项目'
  else if (stars >= 1000) detail += '，社区广泛认可的优秀项目'
  else if (stars >= 100) detail += '，稳步成长中的项目'
  else detail += '，新兴项目，潜力待观察'

  return { name: '热度与影响力', score: Math.round(score), weight: WEIGHTS.popularity, detail }
}

// ============================================================
//  维度 2：社区活跃度 (权重 20%)
// ============================================================
function scoreActivity(repo: RepoInfo, weeklyCommits: number): ScoreDimension {
  const issues = repo.open_issues_count
  const daysSincePush = getDaysAgo(repo.pushed_at)

  const commitScore = Math.min(100, (weeklyCommits / 25) * 100)
  const freshnessScore = Math.max(0, daysSincePush <= 7 ? 100 : daysSincePush <= 30 ? 85 : daysSincePush <= 90 ? 60 : daysSincePush <= 365 ? 35 : 15)

  let issueScore: number
  if (issues === 0) issueScore = 50
  else if (issues <= 20) issueScore = 50 + (issues / 20) * 40
  else if (issues <= 100) issueScore = 90 + ((issues - 20) / 80) * 8
  else if (issues <= 500) issueScore = 98 - ((issues - 100) / 400) * 18
  else issueScore = Math.max(30, 80 - (Math.log10(issues) - 2.7) * 35)

  const score = Math.round(commitScore * 0.4 + freshnessScore * 0.3 + issueScore * 0.3)
  const detail = `周均提交 ~${weeklyCommits} 次，${daysSincePush} 天前有推送，${issues} 个开放 Issue`

  return { name: '社区活跃度', score, weight: WEIGHTS.activity, detail }
}

// ============================================================
//  维度 3：协作健康度 (权重 15%)
// ============================================================
function scoreCollaboration(contributorCount: number, forkCount: number): ScoreDimension {
  let contribScore: number
  if (contributorCount >= 10) contribScore = 95 + Math.min(5, (contributorCount - 10) / 10 * 5)
  else if (contributorCount >= 5) contribScore = 75 + ((contributorCount - 5) / 5) * 20
  else if (contributorCount >= 2) contribScore = 50 + ((contributorCount - 2) / 3) * 25
  else if (contributorCount === 1) contribScore = 30
  else contribScore = 10

  const forkScore = forkCount > 0 ? Math.min(100, Math.log2(forkCount + 1) / Math.log2(3001) * 100) : 5

  const score = Math.round(contribScore * 0.65 + forkScore * 0.35)
  const detail = `${contributorCount} 位核心贡献者，${forkCount} 次 Fork`

  return { name: '协作健康度', score, weight: WEIGHTS.collaboration, detail }
}

// ============================================================
//  维度 4：代码维护性 (权重 15%) — 展示具体协议名称
// ============================================================
function scoreMaintainability(repo: RepoInfo): ScoreDimension {
  const hasLicense = !!repo.license
  const licenseName = repo.license?.spdx_id || ''
  const hasTopics = repo.topics.length > 0
  const hasDescription = !!repo.description && repo.description.length > 10
  const hasLanguage = !!repo.language

  let score = 40
  if (hasLicense) score += 22
  if (hasTopics) score += 18
  if (hasDescription) score += 12
  if (hasLanguage) score += 8

  const tags: string[] = []
  if (hasLicense && licenseName) tags.push(`协议: ${licenseName}`)
  else if (hasLicense) tags.push('开源协议')
  if (hasTopics) tags.push('主题标签')
  if (hasDescription) tags.push('项目描述')
  if (hasLanguage) tags.push(`主语言: ${repo.language}`)

  const detail = tags.length > 0 ? tags.join('、') : '缺少基本元信息，建议补充'

  return { name: '代码维护性', score: Math.min(100, score), weight: WEIGHTS.maintainability, detail }
}

// ============================================================
//  维度 5：项目成熟度 (权重 15%)
// ============================================================
function scoreMaturity(repo: RepoInfo, weeklyCommits: number): ScoreDimension {
  const created = new Date(repo.created_at).getTime()
  const now = Date.now()
  const ageDays = (now - created) / (1000 * 60 * 60 * 24)
  const ageYears = ageDays / 365

  let ageScore: number
  if (ageDays < 30) ageScore = 25
  else if (ageDays < 180) ageScore = 45
  else if (ageDays < 365) ageScore = 65
  else if (ageDays < 1095) ageScore = 88
  else if (ageDays < 1825) ageScore = 82
  else ageScore = 78  // 超大型老项目基础分微调至 78

  // 僵尸惩罚
  if (ageYears > 1 && weeklyCommits < 1) {
    ageScore = Math.max(ageScore - 30, 20)
  } else if (ageYears > 1 && weeklyCommits < 3) {
    ageScore = Math.max(ageScore - 15, 30)
  }

  // 规模评分
  const sizeMB = repo.size / 1024
  let sizeScore: number
  if (sizeMB < 0.1) sizeScore = 30
  else if (sizeMB < 1) sizeScore = 55
  else if (sizeMB < 50) sizeScore = 80
  else if (sizeMB < 500) sizeScore = 92
  else sizeScore = 95

  const score = Math.round(ageScore * 0.6 + sizeScore * 0.4)
  const detail = `已存在 ${ageYears.toFixed(1)} 年，仓库大小 ${(sizeMB).toFixed(1)} MB${weeklyCommits < 1 && ageYears > 1 ? '，近期无提交需关注' : ''}`

  return { name: '项目成熟度', score, weight: WEIGHTS.maturity, detail }
}

// ============================================================
//  维度 6：开放度与规范 (权重 10%)
// ============================================================
function scoreOpenness(repo: RepoInfo): ScoreDimension {
  let score = 55
  const features: string[] = []

  if (repo.topics.length >= 3) { score += 16; features.push('标签丰富') }
  else if (repo.topics.length >= 1) { score += 8; features.push('有主题标签') }

  if (repo.description && repo.description.length > 30) { score += 14; features.push('描述详细') }
  else if (repo.description && repo.description.length > 5) { score += 7; features.push('有简短描述') }

  if (repo.license) { score += 15; features.push('协议清晰') }

  // 官网加分
  if (repo.homepage) { score += 6; features.push('有官网') }

  score = Math.min(100, score)
  const detail = features.length > 0 ? features.join('、') : '开放度一般，建议完善元信息'

  return { name: '开放度与规范', score, weight: WEIGHTS.openness, detail }
}
