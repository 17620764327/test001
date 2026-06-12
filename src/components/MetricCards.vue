<template>
  <div class="metric-cards">
    <div class="card" v-for="item in metrics" :key="item.label">
      <span class="card-icon">{{ item.icon }}</span>
      <span class="card-value">{{ item.value }}</span>
      <span class="card-label">{{ item.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RepoInfo } from '../types'
import { formatNum, formatSize } from '../utils'

const props = defineProps<{ repo: RepoInfo }>()

const metrics = computed(() => [
  { icon: '⭐', value: formatNum(props.repo.stargazers_count), label: 'Stars' },
  { icon: '🍴', value: formatNum(props.repo.forks_count), label: 'Forks' },
  { icon: '👀', value: formatNum(props.repo.watchers_count), label: 'Watchers' },
  { icon: '🐛', value: String(props.repo.open_issues_count), label: 'Open Issues' },
  { icon: '📄', value: props.repo.license?.spdx_id || '-', label: '协议' },
  { icon: '💻', value: formatSize(props.repo.size), label: '大小' },
])
</script>

<style scoped>
.metric-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  padding: 0 24px;
  margin-bottom: 32px;
}
.card {
  background: var(--bg-card);
  border-radius: 14px;
  padding: 20px 16px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  transition: transform 0.2s, box-shadow 0.2s;
}
.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.1);
}
.card-icon { font-size: 26px; display: block; margin-bottom: 8px; }
.card-value {
  display: block; font-size: 22px; font-weight: 700;
  color: var(--text-primary); margin-bottom: 4px;
}
.card-label { font-size: 13px; color: var(--text-muted); }

@media (max-width: 640px) {
  .metric-cards {
    grid-template-columns: repeat(2, 1fr) !important;
    padding: 0 12px !important;
  }
}
</style>
