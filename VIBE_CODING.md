# Vibe Coding 过程记录

> 本文档记录了使用 AI 编程助手完成 "GitHub 仓库体检工具" 的完整过程，
> 包含关键提示词、技术决策和迭代优化思路。

---

## 一、需求分析阶段

### Prompt 1: 初始需求
```
现在我有一个需求如截图所示，你帮我实现并迭代一下，你从专业角度帮我分析一下该采用什么技术选型
```

**AI 决策：**
- 前端：Vue 3 + TypeScript + Vite（轻量、开发体验好）
- 可视化：ECharts 5（饼图+柱状图，社区活跃）
- 数据源：GitHub REST API（无需后端，纯前端调用）
- 状态管理：Vue Composition API（无需 Vuex/Pinia）
- 样式方案：CSS Variables 实现暗色模式

---

## 二、核心功能开发阶段

### Prompt 2: 项目初始化
```
继续执行任务
```

**AI 执行：**
- 使用 `npm create vite@latest` 初始化 Vue 3 + TS 项目
- 安装依赖：vue, echarts, typescript
- 创建基础文件结构

### Prompt 3: 组件化拆分
```
继续
```

**AI 设计的组件架构：**
```
App.vue (主页面)
├── RepoInput.vue      — URL 输入框
├── MetricCards.vue    — 指标卡片 (Stars/Forks/...)
├── ChartsSection.vue  — ECharts 图表
├── ContributorsList.vue — 贡献者列表
└── AIScorePanel.vue   — AI 评分面板
```

### Prompt 4: AI 评分算法设计
```
你帮我设计一个AI评分系统，对仓库进行多维度评估
```

**AI 输出：6 维度加权模型**

| 维度 | 权重 | 说明 |
|------|------|------|
| 热度与影响力 | 25% | Star + Fork |
| 社区活跃度 | 20% | 提交频率 + Issue + 推送时间 |
| 协作健康度 | 15% | 贡献者数量 + Fork |
| 代码维护性 | 15% | License / Topics / 描述 |
| 项目成熟度 | 15% | 存在时间 + 仓库规模 |
| 开放度与规范 | 10% | 标签丰富度 |

---

## 三、问题修复阶段

### 问题 1: Node.js 版本不兼容
**错误信息：** `Vite requires Node.js version 20.19+ or 22.12+`
**解决方案：** 降级 Vite 到 5.1.6 及相关依赖

### 问题 2: Rolldown 绑定缺失
**错误信息：** `Cannot find module '@rolldown/binding-win32-x64-msvc'`
**解决方案：** 清除 node_modules 和 package-lock.json 后重新安装

### 问题 3: TypeScript 配置错误
**错误信息：** `Failed to resolve "extends":"@vue/tsconfig/tsconfig.dom.json"`
**解决方案：** 移除 extends 子句，直接写 compilerOptions

### 问题 4: 变量名冲突
**错误信息：** `This assignment will throw because 'score' is a constant`
**解决方案：** `score = 82` → `ageScore = 82`

### 问题 5: GitHub API 限流
**错误信息：** `API rate limit exceeded (403)`
**解决方案：** 新增 Token 支持 + sessionStorage 缓存

---

## 四、迭代优化阶段

### Prompt 5: 全面优化分析
```
你从专业角度帮我分析一下，当前还有什么可以优化的空间
```

**AI 输出的优化矩阵（共 20+ 项）：**

| 类别 | 关键问题 | 优先级 |
|------|---------|--------|
| **安全** | URL 参数中 Token 泄露到浏览器历史 | 最高 |
| **性能** | ECharts 全量引入 (~1MB) | 高 |
| **功能** | 缺少"重新分析"按钮 | 高 |
| **评分** | 无数据置信度标注 | 高 |
| **代码** | 工具函数重复定义 | 中 |
| **UX** | 暗色模式下图表不可见 | 高 |

### Prompt 6: 执行全部优化
```
你帮我分析一下还可以怎么迭代优化，并制定一下详细的优化计划并执行
```

**AI 执行的 8 项优化：**

#### 安全修复
- ✅ SEC2: URL Token 读取后 `history.replaceState()` 清除
- ✅ SEC3: 输入框添加 maxlength 限制

#### 功能新增
- ✅ F1: 协议名称展示（MIT/Apache-2.0 等）
- ✅ F4: "重新分析"按钮（清除缓存重拉）
- ✅ UX3: 分享链接（复制含 repo 参数的 URL）
- ✅ 归档标签显示
- ✅ 官网链接展示

#### 评分算法 v3 升级
- ✅ S5: 数据置信度标注 (high/medium/low)
- ✅ 归档项目惩罚（直接 D 级 20 分）
- ✅ 权重配置化为常量
- ✅ 老项目基础分微调

#### 性能优化
- ✅ P1: ECharts 按需引入（~200KB vs ~1MB）
- ✅ Q1: Token 缓存到模块变量

#### UI 完善
- ✅ UX2: ECharts 全局暗色模式适配
- ✅ Q3/Q4: 所有硬编码颜色改用 CSS 变量
- ✅ 移动端图表高度自适应

---

## 五、关键设计决策记录

### 决策 1: 为什么选 Vue 而不是 React？
> Vue 3 的 Composition API 对这种单页工具型项目更轻量，
> template 语法在快速迭代时更直观。

### 决策 2: 为什么不用后端？
> GitHub REST API 支持 CORS，前端可以直接调用。
> 避免了部署服务器的复杂度，符合"48 小时交付"的时间约束。

### 决策 3: 评分算法为什么用分段而非线性？
> Star 数从 0 到 500000+ 跨度极大，线性映射会导致：
> - 99% 的项目得分集中在 0-10 分区间
> - 无法区分小型项目的质量差异
>
> 采用分段对数映射让每个量级都有合理区分度。

### 决策 4: 为什么做渐进式加载？
> GitHub API 有 4 个接口需要并行请求，总耗时 1-3 秒。
> 渐进式渲染（头部→卡片→图表→评分）让用户感知等待时间更短。

---

## 六、最终产物清单

| 文件/目录 | 大小 | 说明 |
|----------|------|------|
| `src/` | ~15KB | 完整源代码（11 个文件） |
| `dist/` | ~590KB | 打包产物（可直接部署） |
| `README.md` | 4KB | 运行说明文档 |
| 本文档 | - | Vibe Coding 过程记录 |

### 运行方式
```bash
npm install
npm run dev        # 开发模式 → http://localhost:5173
npm run build      # 生产构建 → dist/
```

---

## 七、截图建议（供提交作业）

建议截取以下场景：

1. **输入页面** — 展示干净的 UI 和 Token 设置入口
2. **分析结果页（亮色）** — 展示完整报告：卡片 + 图表 + 贡献者 + AI 评分
3. **暗色模式** — 切换系统主题后截图，展示暗色适配效果
4. **归档仓库测试** — 展示归档标签和 D 级评分
5. **分享链接** — 展示分享功能和复制的 URL

---

*本文档由 AI 编程助手辅助生成，记录了完整的 Vibe Coding 过程。*
