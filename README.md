# GitHub 仓库体检工具

> 输入任意公开 GitHub 仓库 URL，一键获取多维度健康报告与 AI 综合评分。

## 功能特性

- **6 项核心指标展示**：Stars、Forks、Watchers、Open Issues、开源协议、仓库大小
- **语言分布饼图**：基于 ECharts 的交互式可视化
- **提交活跃度柱状图**：近一年按周统计的提交趋势
- **Top10 贡献者列表**：头像、用户名、提交数，可跳转 GitHub 主页
- **AI 多维评分系统**（加分项）：
  - 热度与影响力 (25%)
  - 社区活跃度 (20%)
  - 协作健康度 (15%)
  - 代码维护性 (15%)
  - 项目成熟度 (15%) — 含僵尸项目检测
  - 开放度与规范 (10%)
  - 输出 S/A/B/C/D 五级评定 + 数据置信度标注
- **归档项目识别**：已归档仓库自动标记并大幅降分
- **暗色模式自适应**：跟随系统主题自动切换
- **移动端响应式布局**
- **API 容错机制**：单接口失败不影响整体，支持部分数据渲染
- **GitHub Token 支持**（可选）：提升 API 限额至 5000 次/小时
- **请求缓存**：5 分钟内重复查询不消耗配额

## 技术栈

| 技术 | 用途 |
|------|------|
| Vue 3 + TypeScript | 前端框架 |
| Vite 5 | 构建工具 |
| ECharts 5 (按需引入) | 数据可视化 |
| GitHub REST API | 数据源 |

## 快速开始

### 方式一：开发模式运行

```bash
# 1. 克隆或下载本项目
cd github-health-check

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 浏览器打开 http://localhost:5173
```

### 方式二：打包后直接打开

```bash
# 1. 安装依赖
npm install

# 2. 构建（生成 dist/ 目录）
npm run build

# 3. 直接在浏览器中打开 dist/index.html
#    或使用任意静态文件服务器托管 dist/ 目录
```

### 可选：配置 GitHub Token（提升请求限额）

默认情况下，未认证请求限制为 **60 次/小时**。如需更高限额：

1. 访问 [GitHub Settings > Personal Access Tokens](https://github.com/settings/tokens?type=beta) 创建 Token（勾选 `public_repo` 权限即可）
2. 在页面中点击"设置 GitHub Token"输入框粘贴 Token
3. 或通过 URL 参数传入：`http://localhost:5173/?token=ghp_xxxx`
4. 配置后限额提升至 **5000 次/小时**

## 使用方式

1. 在输入框粘贴 GitHub 仓库 URL，例如：
   - `https://github.com/vuejs/core`
   - `https://github.com/facebook/react`
   - `https://github.com/codecrafters-io/build-your-own-x`
2. 点击「开始体检」按钮
3. 等待数据加载（渐进式渲染，头部 → 卡片 → 图表 → 贡献者 → AI 评分）
4. 查看完整报告，可点击「重新分析」刷新或「分享链接」分享给他人

## 项目结构

```
github-health-check/
├── src/
│   ├── types/
│   │   └── index.ts              # TypeScript 类型定义
│   ├── utils/
│   │   └── index.ts              # 工具函数（格式化等）
│   ├── services/
│   │   ├── github.ts             # GitHub API 服务层（缓存/容错/Token）
│   │   └── scoring.ts            # AI 多维评分算法 v3
│   ├── components/
│   │   ├── RepoInput.vue         # 输入框 + Token 设置
│   │   ├── MetricCards.vue       # 6 项指标卡片
│   │   ├── ChartsSection.vue     # ECharts 图表（语言+提交）
│   │   ├── ContributorsList.vue  # Top10 贡献者
│   │   └── AIScorePanel.vue      # AI 评分面板 + 置信度
│   ├── App.vue                   # 主页面（渐进式加载）
│   └── style.css                 # 全局样式（暗色模式变量）
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 评分算法说明

AI 评分采用 **6 维度加权模型**，各维度独立计算后加权求和：

| 维度 | 权重 | 核心指标 | 评分逻辑 |
|------|------|---------|---------|
| 热度与影响力 | 25% | Star + Fork | 分段对数映射，中小项目也有区分度 |
| 社区活跃度 | 20% | 周均提交 + 推送新鲜度 + Issue 数 | 钟形曲线，适量 Issue 代表活跃 |
| 协作健康度 | 15% | 贡献者数量 + Fork | 贡献者阶梯评分为主 |
| 代码维护性 | 15% | License + Topics + 描述 + 语言 | 元信息完整度 |
| 项目成熟度 | 15% | 仓库年龄 + 规模 | 钟形曲线(1-3年最佳)+僵尸检测 |
| 开放度与规范 | 10% | 标签 + 描述 + 协议 + 官网 | 开放元信息丰富度 |

特殊处理：
- **归档仓库**：直接返回 D 级（20 分），不参与正常评分
- **置信度标注**：当部分 API 返回空数据时，显示 medium/low 置信度警告
- **僵尸检测**：超过 1 年但周均 <1 次提交的项目扣减成熟度分数

## 浏览器兼容性

- Chrome / Edge 90+
- Firefox 88+
- Safari 14+

## License

MIT
