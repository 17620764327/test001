<template>
  <div class="contributors-section">
    <h3>核心贡献者 Top {{ contributors.length }}</h3>
    <div class="contrib-list">
      <a
        v-for="c in contributors"
        :key="c.id"
        :href="c.html_url"
        target="_blank"
        class="contrib-item"
      >
        <img :src="c.avatar_url" :alt="c.login" class="avatar" />
        <span class="login">{{ c.login }}</span>
        <span class="count">{{ c.contributions }} commits</span>
      </a>
    </div>
    <p v-if="contributors.length === 0" class="empty">暂无贡献者数据</p>
  </div>
</template>

<script setup lang="ts">
import type { Contributor } from '../types'

defineProps<{ contributors: Contributor[] }>()
</script>

<style scoped>
.contributors-section {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  margin: 0 24px 24px;
}
.contributors-section h3 { margin: 0 0 18px; font-size: 16px; color: var(--text-primary); }
.contrib-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.contrib-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px; border-radius: 12px;
  background: var(--bg-primary); text-decoration: none;
  transition: transform 0.15s, box-shadow 0.15s;
}
.contrib-item:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
.login { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.count { font-size: 12px; color: var(--text-muted); white-space: nowrap; }
.empty { color: var(--text-muted); font-size: 14px; text-align: center; padding: 16px; }
</style>
