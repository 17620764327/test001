<template>
  <div class="ai-score-panel">
    <!-- 总分展示 -->
    <div class="score-header">
      <div class="score-circle" :class="'grade-' + score.grade.toLowerCase()">
        <span class="score-num">{{ score.total }}</span>
        <span class="score-grade">{{ score.grade }} 级</span>
      </div>
      <div class="score-info">
        <h3>AI 综合评估</h3>
        <p>{{ gradeComment }}</p>
      </div>
    </div>

    <!-- 置信度标识 -->
    <div v-if="score.confidence !== 'high'" class="confidence-banner" :class="'conf-' + score.confidence">
      <span v-if="score.confidence === 'low'">⚠️ 数据不完整：部分 API 未返回数据，评分仅供参考</span>
      <span v-else>ℹ️ 部分数据缺失，评分可能存在偏差</span>
    </div>

    <!-- 各维度得分 -->
    <div class="dimensions">
      <div v-for="dim in score.dimensions" :key="dim.name" class="dim-item">
        <div class="dim-meta">
          <span class="dim-name">{{ dim.name }}</span>
          <span class="dim-score-val">{{ dim.score }}分</span>
          <span class="dim-weight">权重 {{ Math.round(dim.weight * 100) }}%</span>
        </div>
        <div class="dim-bar-track">
          <div
            class="dim-bar-fill"
            :class="getBarClass(dim.score)"
            :style="{ width: dim.score + '%' }"
          ></div>
        </div>
        <p class="dim-detail">{{ dim.detail }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AIScoreResult } from '../types'

const props = defineProps<{ score: AIScoreResult }>()

const gradeComment = computed(() => {
  const map: Record<string, string> = {
    S: '卓越：这是一个顶级的开源项目，各方面表现优异',
    A: '优秀：项目质量很高，社区活跃且维护良好',
    B: '良好：项目整体健康，有改进空间',
    C: '一般：项目存在一些需要关注的问题',
    D: '较弱：建议关注项目的活跃度和维护状态',
  }
  return map[props.score.grade] || ''
})

function getBarClass(score: number): string {
  if (score >= 80) return 'bar-excellent'
  if (score >= 60) return 'bar-good'
  if (score >= 40) return 'bar-normal'
  return 'bar-weak'
}
</script>

<style scoped>
.ai-score-panel {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  margin: 0 24px 32px;
}

/* 总分区域 */
.score-header {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 28px;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--border-color);
}
.score-circle {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.grade-s { background: linear-gradient(135deg, #ffd700, #ff9500); }
.grade-a { background: linear-gradient(135deg, #4ade80, #22c55e); }
.grade-b { background: linear-gradient(135deg, #60a5fa, #3b82f6); }
.grade-c { background: linear-gradient(135deg, #fb923c, #f97316); }
.grade-d { background: linear-gradient(135deg, #f87171, #ef4444); }

.score-num {
  font-size: 34px;
  font-weight: 800;
  color: #fff;
  line-height: 1;
}
.score-grade {
  font-size: 13px;
  color: rgba(255,255,255,0.9);
  margin-top: 2px;
}
.score-info h3 { margin: 0 0 6px; font-size: 20px; color: var(--text-primary); }
.score-info p { margin: 0; font-size: 14px; color: var(--text-secondary); line-height: 1.5; }

/* 置信度横幅 */
.confidence-banner {
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  margin-bottom: 20px;
}
.conf-low {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.25);
}
.conf-medium {
  background: rgba(59, 130, 246, 0.08);
  color: #2563eb;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

/* 维度列表 */
.dimensions {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.dim-item {}
.dim-meta {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 6px;
}
.dim-name { font-weight: 600; font-size: 14px; color: var(--text-primary); min-width: 120px; }
.dim-score-val { font-size: 13px; font-weight: 700; color: var(--accent); }
.dim-weight { font-size: 11px; color: var(--text-muted); }
.dim-bar-track { height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden; }
.dim-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}
.bar-excellent { background: linear-gradient(90deg, #4ade80, #22c55e); }
.bar-good { background: linear-gradient(90deg, #60a5fa, #3b82f6); }
.bar-normal { background: linear-gradient(90deg, #fb923c, #f97316); }
.bar-weak { background: linear-gradient(90deg, #f87171, #ef4444); }

.dim-detail { margin: 4px 0 0; font-size: 12px; color: var(--text-muted); }
</style>
