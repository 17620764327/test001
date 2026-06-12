<template>
  <div class="charts-section">
    <!-- 语言占比饼图 -->
    <div class="chart-card">
      <h3>语言分布</h3>
      <div ref="langChartRef" class="chart-container"></div>
    </div>
    <!-- 提交活跃度柱状图 -->
    <div class="chart-card">
      <h3>近一年提交活跃度（按周）</h3>
      <div ref="commitChartRef" class="chart-container"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts/core'
import { PieChart } from 'echarts/charts'
import { BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

// 按需注册组件
echarts.use([
  PieChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  CanvasRenderer,
])

import type { CommitActivity, LanguageStats } from '../types'

const props = defineProps<{
  languages: LanguageStats
  commitActivity: CommitActivity[]
}>()

const langChartRef = ref<HTMLDivElement>()
const commitChartRef = ref<HTMLDivElement>()

let langChart: echarts.ECharts | null = null
let commitChart: echarts.ECharts | null = null

// 根据系统主题判断暗色模式
function isDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

// 通用主题色配置
const themeColors = {
  text: isDark() ? '#e6edf3' : '#333',
  subText: isDark() ? '#8b949e' : '#888',
  lineColor: isDark() ? '#30363d' : '#eee',
  bg: isDark() ? '#161b22' : '#fff',
}

function renderLangChart() {
  if (!langChartRef.value) return
  if (!langChart) langChart = echarts.init(langChartRef.value)

  const entries = Object.entries(props.languages)
  const total = entries.reduce((sum, [, val]) => sum + val, 0)
  const data = entries.map(([name, value]) => ({
    name,
    value: Math.round(value / total * 1000) / 10,
  })).sort((a, b) => b.value - a.value)

  langChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}%',
      textStyle: { color: themeColors.text },
      backgroundColor: themeColors.bg,
      borderColor: themeColors.lineColor,
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle',
      textStyle: { color: themeColors.subText, fontSize: 12 },
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['60%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 8, borderColor: themeColors.bg, borderWidth: 2 },
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 16, fontWeight: 'bold', color: themeColors.text }
      },
      data,
      color: ['#4361ee', '#3a0ca3', '#7209b7', '#f72585', '#4cc9f0', '#06d6a0', '#ffd166'],
    }],
  })
}

function renderCommitChart() {
  if (!commitChartRef.value) return
  if (!commitChart) commitChart = echarts.init(commitChartRef.value)

  const activity = props.commitActivity.slice(-26)
  const weeks = activity.map(d => {
    const date = new Date(d.week * 1000)
    return `${date.getMonth() + 1}/${date.getDate()}`
  })
  const totals = activity.map(d => d.total)

  commitChart.setOption({
    tooltip: {
      trigger: 'axis',
      textStyle: { color: themeColors.text },
      backgroundColor: themeColors.bg,
      borderColor: themeColors.lineColor,
    },
    grid: { left: 50, right: 20, bottom: 30, top: 20 },
    xAxis: {
      type: 'category',
      data: weeks,
      axisLabel: { fontSize: 11, rotate: 45, color: themeColors.subText },
      axisLine: { lineStyle: { color: themeColors.lineColor } },
    },
    yAxis: {
      type: 'value',
      name: '提交数',
      minInterval: 1,
      axisLabel: { color: themeColors.subText },
      splitLine: { lineStyle: { color: themeColors.lineColor } },
      nameTextStyle: { color: themeColors.subText },
    },
    series: [{
      type: 'bar',
      data: totals,
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#4361ee' },
          { offset: 1, color: '#7209b7' },
        ]),
      },
    }],
  })
}

onMounted(() => {
  renderLangChart()
  renderCommitChart()
})

watch(() => [props.languages, props.commitActivity], () => {
  renderLangChart()
  renderCommitChart()
}, { deep: true })

const resizeObserver = new ResizeObserver(() => {
  langChart?.resize()
  commitChart?.resize()
})

onMounted(() => {
  if (langChartRef.value) resizeObserver.observe(langChartRef.value)
  if (commitChartRef.value) resizeObserver.observe(commitChartRef.value)
})

onBeforeUnmount(() => {
  langChart?.dispose()
  commitChart?.dispose()
  resizeObserver.disconnect()
})
</script>

<style scoped>
.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  padding: 0 24px;
  margin-bottom: 32px;
}
.chart-card {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.chart-card h3 { margin: 0 0 16px; font-size: 16px; color: var(--text-primary); }
.chart-container {
  width: 100%;
  height: 320px;
}

@media (max-width: 640px) {
  .charts-section {
    grid-template-columns: 1fr !important;
    padding: 0 12px !important;
  }
  .chart-container {
    height: 260px;
  }
}
</style>
