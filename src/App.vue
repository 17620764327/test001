<template>
  <RepoInput ref="inputRef" @analyze="handleAnalyze" />

  <!-- 加载状态 - 渐进式 -->
  <template v-if="loading || report">
    <!-- 仓库信息头部（最先出现） -->
    <div v-if="report?.repo" class="repo-header">
      <h2>{{ report.repo.full_name }}
        <span v-if="report.repo.archived" class="archived-badge">已归档</span>
      </h2>
      <a :href="report.repo.html_url" target="_blank" class="repo-url">{{ report.repo.html_url }}</a>
      <a v-if="report.repo.homepage" :href="report.repo.homepage" target="_blank" class="homepage-link">{{ report.repo.homepage }}</a>
      <p v-if="report.repo.description" class="repo-desc">{{ report.repo.description }}</p>
      <!-- 操作栏：重新分析 + 分享 -->
      <div v-if="!loading" class="action-bar">
        <button class="action-btn" @click="reAnalyze">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 4v6h-6M1 20v-6h6"/></svg>
          重新分析
        </button>
        <button class="action-btn" @click="copyShareLink">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          {{ copied ? '已复制' : '分享链接' }}
        </button>
      </div>
    </div>

    <!-- 加载骨架屏 / 指标卡片 -->
    <div v-if="report?.repo" class="content-area">
      <MetricCards :repo="report.repo" />
    </div>
    <div v-else-if="loading" class="skeleton-cards">
      <div v-for="i in 6" :key="i" class="skeleton-card"></div>
    </div>

    <!-- 图表区域 -->
    <div v-if="hasChartData" class="content-area">
      <ChartsSection
        :languages="report!.languages"
        :commit-activity="report!.commitActivity"
      />
    </div>
    <div v-else-if="loading && report?.repo" class="skeleton-chart">
      <div class="skeleton-card chart-skel"></div>
    </div>

    <!-- 贡献者列表 -->
    <div v-if="report?.contributors && report.contributors.length > 0" class="content-area">
      <ContributorsList :contributors="report.contributors" />
    </div>

    <!-- AI 评分（最后渲染） -->
    <div v-if="report?.aiScore" class="content-area">
      <AIScorePanel :score="report.aiScore" />
    </div>
    <div v-else-if="loading && report?.repo" class="skeleton-score">
      <div class="skeleton-card score-skel"></div>
    </div>
  </template>

  <!-- 纯加载中（还没任何数据） -->
  <div v-if="loading && !report" class="loading-wrap">
    <div class="spinner"></div>
    <p>正在从 GitHub 获取仓库数据...</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import RepoInput from './components/RepoInput.vue'
import MetricCards from './components/MetricCards.vue'
import ChartsSection from './components/ChartsSection.vue'
import ContributorsList from './components/ContributorsList.vue'
import AIScorePanel from './components/AIScorePanel.vue'
import {
  parseRepoUrl,
  fetchRepoInfo,
  fetchContributors,
  fetchCommitActivity,
  fetchLanguages,
} from './services/github'
import { calculateAIScore } from './services/scoring'
import type { HealthReport, RepoInfo, Contributor, CommitActivity, LanguageStats } from '../types'

const inputRef = ref<InstanceType<typeof RepoInput> | null>(null)
const loading = ref(false)
const copied = ref(false)

// 当前分析的 URL（用于重新分析）
let currentUrl = ''

// 渐进式数据存储
const partialData = ref<{
  repo: RepoInfo | null
  contributors: Contributor[]
  commitActivity: CommitActivity[]
  languages: LanguageStats
}>({
  repo: null,
  contributors: [],
  commitActivity: [],
  languages: {},
})

// 最终完整报告
const report = ref<HealthReport | null>(null)

// 是否已有图表数据
const hasChartData = computed(() => {
  const d = partialData.value
  return (d.commitActivity.length > 0 || Object.keys(d.languages).length > 0)
})

async function handleAnalyze(url: string) {
  await runAnalysis(url)
}

async function reAnalyze() {
  if (currentUrl) {
    // 清除缓存强制刷新
    try {
      const parsed = parseRepoUrl(currentUrl)
      if (parsed) {
        sessionStorage.removeItem(`ghc_repo_${parsed.owner}_${parsed.repo}`)
        sessionStorage.removeItem(`ghc_contributors_${parsed.owner}_${parsed.repo}`)
        sessionStorage.removeItem(`ghc_activity_${parsed.owner}_${parsed.repo}`)
        sessionStorage.removeItem(`ghc_lang_${parsed.owner}_${parsed.repo}`)
      }
    } catch { /* ignore */ }
    await runAnalysis(currentUrl)
  }
}

async function copyShareLink() {
  if (!currentUrl) return
  const shareUrl = `${window.location.origin}${window.location.pathname}?repo=${encodeURIComponent(currentUrl)}`
  try {
    await navigator.clipboard.writeText(shareUrl)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // fallback
    const ta = document.createElement('textarea')
    ta.value = shareUrl
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}

async function runAnalysis(url: string) {
  const parsed = parseRepoUrl(url)
  if (!parsed) {
    inputRef.value?.setError('无法解析 GitHub 地址，请检查格式')
    return
  }

  currentUrl = url

  // 重置状态
  loading.value = true
  copied.value = false
  inputRef.value?.setLoading(true)
  inputRef.value?.setError('')
  inputRef.value?.setPartialWarning('')
  report.value = null
  partialData.value = { repo: null, contributors: [], commitActivity: [], languages: {} }

  try {
    // 并行请求所有接口（单接口失败不会阻断其他）
    const [repoResult, contribResult, activityResult, langResult] = await Promise.all([
      fetchRepoInfo(parsed.owner, parsed.repo),
      fetchContributors(parsed.owner, parsed.repo),
      fetchCommitActivity(parsed.owner, parsed.repo),
      fetchLanguages(parsed.owner, parsed.repo),
    ])

    // 收集错误信息 + 数据完整性标记
    const errors: string[] = []
    if (repoResult.error) errors.push(repoResult.error)
    if (contribResult.error) errors.push(`贡献者: ${contribResult.error}`)
    if (activityResult.error) errors.push(`提交统计: ${activityResult.error}`)
    if (langResult.error) errors.push(`语言统计: ${langResult.error}`)

    // 核心接口（repo）失败则报错退出
    if (!repoResult.data) {
      throw new Error(errors[0] || '获取仓库信息失败')
    }

    // 渐进填充数据
    partialData.value.repo = repoResult.data
    partialData.value.contributors = contribResult.data ?? []
    partialData.value.commitActivity = activityResult.data ?? []
    partialData.value.languages = langResult.data ?? {}

    // 构建数据完整性对象
    const completeness = {
      hasCommitActivity: (activityResult.data ?? []).length > 0,
      hasContributors: (contribResult.data ?? []).length > 0,
      hasLanguages: Object.keys(langResult.data ?? {}).length > 0,
    }

    // 部分数据不可用的警告
    if (errors.length > 0) {
      inputRef.value?.setPartialWarning('部分数据获取失败，已用可用数据生成报告：' + errors.join('；'))
    }

    // 计算周均提交数
    const recentWeeks = partialData.value.commitActivity.slice(-13)
    const weeklyCommits = recentWeeks.length > 0
      ? Math.round(recentWeeks.reduce((sum, w) => sum + w.total, 0) / recentWeeks.length)
      : 0

    // AI 评分（传入数据完整性）
    const aiScore = calculateAIScore(
      partialData.value.repo,
      partialData.value.contributors.length,
      weeklyCommits,
      completeness
    )

    report.value = {
      repo: partialData.value.repo,
      contributors: partialData.value.contributors,
      commitActivity: partialData.value.commitActivity,
      languages: partialData.value.languages,
      aiScore,
      dataCompleteness: {
        ...completeness,
        missingItems: errors.map(e => e.split(':')[0]),
      },
    }
  } catch (e: any) {
    inputRef.value?.setError(e.message || '分析失败，请检查网络或重试')
  } finally {
    loading.value = false
    inputRef.value?.setLoading(false)
  }
}
</script>

<style scoped>
.content-area {
  animation: fadeIn 0.35s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 归档标签 */
.archived-badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 12px;
  background: #f59e0b22;
  color: #d97706;
  vertical-align: middle;
  margin-left: 8px;
}

/* 官网链接 */
.homepage-link {
  display: block;
  font-size: 13px;
  color: var(--accent);
  text-decoration: none;
  margin-top: 4px;
}
.homepage-link:hover { text-decoration: underline; }

/* 操作栏 */
.action-bar {
  display: flex;
  gap: 10px;
  margin-top: 14px;
  flex-wrap: wrap;
}
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.action-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-bg);
}

/* 骨架屏 */
.skeleton-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  padding: 0 24px;
  margin-bottom: 32px;
}
.skeleton-card {
  background: linear-gradient(90deg, var(--skeleton-from) 25%, var(--skeleton-to) 50%, var(--skeleton-from) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 14px;
  height: 110px;
}
.chart-skel { height: 370px; grid-column: 1 / -1; }
.score-skel { height: 280px; grid-column: 1 / -1; }
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.skeleton-chart, .skeleton-score {
  padding: 0 24px;
  margin-bottom: 24px;
}

.loading-wrap {
  text-align: center;
  padding: 60px 24px;
}
.spinner {
  width: 44px;
  height: 44px;
  border: 4px solid var(--border-color);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
