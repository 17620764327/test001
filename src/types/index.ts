/** 仓库基础信息（来自 GitHub API /repos/{owner}/{repo}） */
export interface RepoInfo {
  name: string
  full_name: string
  description: string | null
  html_url: string
  homepage: string | null        // 官网地址
  stargazers_count: number
  forks_count: number
  open_issues_count: number      // 包含 Issue + PR
  watchers_count: number
  language: string | null
  license: { spdx_id: string; name: string } | null
  topics: string[]
  created_at: string
  updated_at: string
  pushed_at: string
  size: number                   // KB
  default_branch: string
  archived: boolean              // 是否已归档
}

/** 贡献者信息 */
export interface Contributor {
  login: string
  id: number
  contributions: number
  avatar_url: string
  html_url: string
}

/** 最近提交信息 */
export interface CommitActivity {
  week: number       // Unix 时间戳
  days: number[]     // 每天的提交数 [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  total: number      // 当周总提交数
}

/** 语言使用占比 */
export interface LanguageStats {
  [lang: string]: number // 字节数
}

/** PR 简要信息 */
export interface PullRequest {
  number: number
  title: string
  state: string
  created_at: string
  user: { login: string; avatar_url: string }
}

/** 汇总体检数据 */
export interface HealthReport {
  repo: RepoInfo
  contributors: Contributor[]
  commitActivity: CommitActivity[]
  languages: LanguageStats
  aiScore: AIScoreResult
  dataCompleteness: DataCompleteness   // 数据完整性标记
}

/** 数据完整性状态（用于评分置信度标注） */
export interface DataCompleteness {
  hasCommitActivity: boolean          // 是否获取到提交活跃度数据
  hasContributors: boolean            // 是否获取到贡献者数据
  hasLanguages: boolean               // 是否获取到语言数据
  missingItems: string[]              // 缺失的数据项名称列表
}

/** AI 多维评分结果 */
export interface AIScoreResult {
  total: number          // 总分 0-100
  grade: string          // 等级 S/A/B/C/D
  confidence: 'high' | 'medium' | 'low'  // 置信度
  dimensions: ScoreDimension[]
}

/** 单维度评分 */
export interface ScoreDimension {
  name: string           // 维度名称
  score: number          // 该维度得分 0-100
  weight: number         // 权重
  detail: string         // 评价说明
}
