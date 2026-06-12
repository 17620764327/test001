<template>
  <div class="repo-input">
    <h1 class="title">GitHub 仓库体检工具</h1>
    <p class="subtitle">输入公开仓库 URL，获取多维度健康报告与 AI 评分</p>

    <form class="input-row" @submit.prevent="handleSubmit">
      <input
        ref="inputEl"
        v-model="url"
        type="text"
        placeholder="https://github.com/vuejs/core"
        :disabled="loading"
        maxlength="200"
        class="url-input"
      />
      <button type="submit" :disabled="loading || !url.trim()" class="btn-primary">
        {{ loading ? '分析中...' : '开始体检' }}
      </button>
    </form>

    <!-- Token 设置（可折叠） -->
    <div class="token-bar">
      <span v-if="!showTokenInput" class="token-hint" @click="showTokenInput = true">
        {{ tokenStatus }}
      </span>
      <template v-else>
        <input
          v-model="tokenInput"
          type="password"
          placeholder="ghp_xxxx（可选，提升请求限额至 5000次/小时）"
          maxlength="80"
          class="token-input"
          :disabled="loading"
          @keyup.enter="applyToken"
        />
        <button class="btn-token btn-apply" @click="applyToken" :disabled="!tokenInput.trim()">应用</button>
        <button class="btn-token btn-clear" @click="clearToken">清除</button>
      </template>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>

    <!-- 部分数据警告 -->
    <div v-if="partialWarning" class="warn-box">
      <span class="warn-icon">!</span>
      {{ partialWarning }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { setAccessToken as saveToken, clearAccessToken as removeToken, hasToken } from '../services/github'

const emit = defineEmits<{ (e: 'analyze', url: string): void }>()

const inputEl = ref<HTMLInputElement>()
const url = ref('')
const loading = ref(false)
const error = ref('')
const partialWarning = ref('')

// Token 相关
const showTokenInput = ref(false)
const tokenInput = ref('')

const tokenStatus = computed(() => {
  if (hasToken()) return '已配置 Token（点击修改）'
  return '可选：设置 GitHub Token 提升限额 →'
})

onMounted(() => {
  // 支持通过 URL 参数 ?repo=xxx 自动填充并分析
  const params = new URLSearchParams(window.location.search)
  const repoParam = params.get('repo')
  if (repoParam) {
    url.value = decodeURIComponent(repoParam)
    // 清除 URL 参数（避免刷新重复提交）
    const urlObj = new URL(window.location.href)
    urlObj.searchParams.delete('repo')
    history.replaceState({}, '', urlObj.toString())
    // 自动触发分析
    setTimeout(() => handleSubmit(), 300)
  }
})

function handleSubmit() {
  const trimmed = url.value.trim()
  if (!trimmed) return
  error.value = ''
  partialWarning.value = ''
  if (!trimmed.includes('github.com')) {
    error.value = '请输入有效的 GitHub 仓库地址'
    return
  }
  emit('analyze', trimmed)
}

function applyToken() {
  const t = tokenInput.value.trim()
  if (!t) return
  saveToken(t)
  tokenInput.value = ''
  showTokenInput.value = false
}

function clearToken() {
  removeToken()
  tokenInput.value = ''
  showTokenInput.value = false
}

function setLoading(val: boolean) { loading.value = val }
function setError(msg: string) { error.value = msg }
function setPartialWarning(msg: string) { partialWarning.value = msg }

defineExpose({ setLoading, setError, setPartialWarning })
</script>

<style scoped>
.repo-input {
  text-align: center;
  padding: 48px 24px 32px;
}
.title { font-size: 28px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
.subtitle { color: var(--text-secondary); margin-bottom: 28px; font-size: 15px; }
.input-row {
  display: flex;
  gap: 12px;
  max-width: 560px;
  margin: 0 auto;
}
.url-input {
  flex: 1; padding: 12px 18px; border: 2px solid var(--input-border);
  border-radius: 10px; font-size: 15px; outline: none; transition: border-color 0.25s;
}
.url-input:focus { border-color: var(--accent); }
.url-input:disabled { background: var(--input-disabled); }
.btn-primary {
  padding: 12px 28px;
  background: linear-gradient(135deg, #4361ee, #3a0ca3);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.2s, transform 0.15s;
}
.btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

/* Token 栏 */
.token-bar {
  margin-top: 14px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.token-hint { font-size: 12px; color: var(--text-muted); cursor: pointer; text-decoration: underline; text-decoration-style: dashed; }
.token-hint:hover { color: var(--accent); }
.token-input { padding: 8px 14px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px; width: 320px; outline: none; }
.token-input:focus { border-color: var(--accent); }
.btn-token {
  padding: 7px 16px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}
.btn-apply { background: #4361ee; color: #fff; }
.btn-apply:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-clear { background: var(--border-color); color: var(--text-secondary); }

.error-msg { color: #e63946; margin-top: 12px; font-size: 14px; }

/* 警告框 - 使用 CSS 变量适配暗色模式 */
.warn-box {
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  background: rgba(245, 158, 11, 0.08);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.2);
}
.warn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #f59e0b22;
  color: #d97706;
  font-weight: 700;
  font-size: 11px;
  flex-shrink: 0;
}
</style>
