# 项目总结文档

## 📋 项目概述

**项目名称**: Midscene 可视化自动化测试平台  
**项目代号**: MossMirror  
**版本**: v1.0.0  
**创建日期**: 2026-04-15  
**技术栈**: React + TypeScript + Node.js + Midscene.js

---

## 🎯 项目背景与目标

### 背景
随着 Web 应用日益复杂，传统自动化测试需要编写大量选择器和维护成本高昂。Midscene.js 作为字节跳动开源的 AI 驱动自动化测试框架，通过自然语言指令即可完成 UI 操作，极大降低了测试门槛。

### 目标
基于 Midscene.js 搭建一个**可视化的自动化测试平台**，解决以下痛点：
1. **降低使用门槛** - 提供可视化界面，无需命令行操作
2. **提升调试效率** - Playground 实时编辑和执行
3. **支持批量测试** - 并发执行多个脚本
4. **完善报告体系** - 详细的测试报告和失败分析
5. **便于功能扩展** - 模块化架构设计

---

## ✅ 功能清单

### 已实现功能

#### 1. 仪表盘 (Dashboard)
- [x] 统计数据展示（脚本数、执行次数、通过率）
- [x] 执行趋势图表（近7天折线图）
- [x] 执行结果分布（饼图）
- [x] 最近更新的脚本列表
- [x] 最近生成的报告列表

#### 2. 脚本管理 (Scripts)
- [x] 脚本列表展示（表格形式）
- [x] 新建/编辑脚本
- [x] Monaco Editor YAML 编辑器
- [x] YAML 语法验证
- [x] 脚本导入（YAML 文件上传）
- [x] 脚本导出（下载 YAML 文件）
- [x] 脚本复制
- [x] 搜索和筛选
- [x] 标签管理

#### 3. Playground (可视化编辑器)
- [x] Monaco Editor 代码编辑器
- [x] 实时 YAML 格式验证
- [x] 预设模板选择（4个常用模板）
- [x] 快速执行测试
- [x] 执行日志实时展示
- [x] 帮助文档
- [x] 一键保存为脚本

#### 4. 批量执行 (Batch Run)
- [x] 多选脚本批量执行
- [x] 并行执行模式
- [x] 串行执行模式
- [x] 最大并发数配置
- [x] 出错时停止选项
- [x] 实时进度展示
- [x] 执行结果汇总

#### 5. 测试报告 (Reports)
- [x] 报告列表展示
- [x] 状态筛选（通过/失败/部分通过）
- [x] 日期范围筛选
- [x] 报告详情查看
- [x] 执行步骤明细
- [x] 失败原因记录
- [x] HTML 报告导出
- [x] 统计概览

#### 6. 后端 API
- [x] RESTful API 设计
- [x] 脚本 CRUD 接口
- [x] 执行控制接口
- [x] 报告管理接口
- [x] Playground 接口
- [x] 文件上传下载
- [x] 静态文件服务

---

## 🏗️ 技术架构

### 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端层                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
  │  Dashboard  │ │  Playground │ │   Scripts   │ │  Reports  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
│  ┌─────────────┐ ┌─────────────┐                               │
│  │  Batch Run  │ │  API Layer  │                               │
│  └─────────────┘ └─────────────┘                               │
├─────────────────────────────────────────────────────────────────┤
│                         后端层                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │ScriptRoutes │ │ExecuteRoutes│ │ReportRoutes │ │Playground │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                       服务层                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ ScriptService   │  │ ExecuteService  │  │  ReportService  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                       执行引擎                                  │
│                 @midscene/cli (Midscene.js)                    │
└─────────────────────────────────────────────────────────────────┘
```

### 核心依赖

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 前端 | React | 18.2.0 | UI 框架 |
| 前端 | Ant Design | 5.14.0 | UI 组件库 |
| 前端 | Monaco Editor | 4.6.0 | 代码编辑器 |
| 前端 | ECharts | 5.5.0 | 数据可视化 |
| 后端 | Express | 4.19.0 | Web 框架 |
| 后端 | TypeScript | 5.4.0 | 类型系统 |
| 测试 | Midscene.js | latest | AI 测试引擎 |
| 工具 | js-yaml | 4.1.0 | YAML 解析 |

---

## 📊 代码统计

### 文件统计

| 类别 | 文件数 | 代码行数 | 说明 |
|------|--------|----------|------|
| 前端页面 | 7 | ~1800 行 | React 组件 |
| 前端服务 | 1 | ~200 行 | API 封装 |
| 后端路由 | 4 | ~400 行 | Express 路由 |
| 后端服务 | 3 | ~800 行 | 业务逻辑 |
| 配置文件 | 8 | ~300 行 | 项目配置 |
| 文档 | 4 | ~600 行 | 项目文档 |
| 示例脚本 | 2 | ~60 行 | 测试示例 |
| **总计** | **~25** | **~4160 行** | - |

### 目录结构

```
MossMirror/
├── README.md                        # 项目说明
├── package.json                     # 根配置
├── .gitignore                       # Git 忽略配置
│
├── docs/                            # 文档目录
│   ├── PROJECT_SUMMARY.md           # 项目总结 (本文档)
│   ├── ARCHITECTURE.md              # 架构设计
│   ├── QUICKSTART.md                # 快速开始
│   └── API.md                       # API 文档
│
├── scripts/                         # 示例脚本
│   ├── example-search.yaml          # 搜索测试示例
│   └── example-login.yaml           # 登录测试示例
│
├── apps/
│   ├── server/                      # 后端服务
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── .env.example             # 环境变量示例
│   │   └── src/
│   │       ├── app.ts               # 入口文件
│   │       ├── models/
│   │       │   └── types.ts         # 类型定义
│   │       ├── routes/
│   │       │   ├── scripts.ts       # 脚本路由
│   │       │   ├── reports.ts       # 报告路由
│   │       │   ├── execute.ts       # 执行路由
│   │       │   └── playground.ts    # Playground 路由
│   │       ├── services/
│   │       │   ├── scriptService.ts # 脚本服务
│   │       │   ├── executeService.ts# 执行服务
│   │       │   └── reportService.ts # 报告服务
│   │       └── utils/
│   │           └── fileUtils.ts     # 文件工具
│   │
│   └── web/                         # 前端应用
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.node.json
│       ├── vite.config.ts           # Vite 配置
│       ├── index.html
│       └── src/
│           ├── main.tsx             # 入口
│           ├── App.tsx              # 根组件
│           ├── index.css            # 全局样式
│           ├── components/          # 公共组件
│           │   ├── AppHeader.tsx    # 顶部导航
│           │   └── Sidebar.tsx      # 侧边栏
│           ├── pages/               # 页面
│           │   ├── Dashboard.tsx    # 仪表盘
│           │   ├── Playground.tsx   # 编辑器
│           │   ├── Scripts/         # 脚本管理
│           │   │   ├── ScriptList.tsx
│           │   │   └── ScriptEditor.tsx
│           │   ├── Reports/         # 报告中心
│           │   │   ├── ReportList.tsx
│           │   │   └── ReportDetail.tsx
│           │   └── BatchRun.tsx     # 批量执行
│           └── services/
│               └── api.ts           # API 封装
│
└── data/                            # 数据目录 (运行时创建)
    ├── scripts-meta.json            # 脚本元数据
    └── reports-meta.json            # 报告元数据
```

---

## 🔌 API 接口汇总

### 脚本管理 API

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/scripts | 获取所有脚本 |
| POST | /api/scripts | 创建脚本 |
| GET | /api/scripts/:id | 获取脚本详情 |
| PUT | /api/scripts/:id | 更新脚本 |
| DELETE | /api/scripts/:id | 删除脚本 |
| POST | /api/scripts/import | 导入 YAML |
| GET | /api/scripts/:id/export | 导出 YAML |

### 执行控制 API

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/execute/:scriptId | 执行单个脚本 |
| POST | /api/execute/batch/run | 批量执行脚本 |

### 报告管理 API

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/reports | 获取所有报告 |
| GET | /api/reports/:id | 获取报告详情 |
| GET | /api/reports/:id/html | 获取报告 HTML |
| GET | /api/reports/script/:scriptId | 获取脚本报告 |
| GET | /api/reports/stats/overview | 获取统计信息 |
| DELETE | /api/reports/:id | 删除报告 |

### Playground API

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/playground/preview | 预览 YAML |
| POST | /api/playground/run | 快速执行 |
| GET | /api/playground/templates | 获取模板 |

### 系统 API

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/health | 健康检查 |

---

## 📦 数据结构

### YAML 脚本格式

```yaml
# 环境配置
web:
  url: https://www.example.com          # 必填：目标 URL
  viewportWidth: 1280                    # 可选：视口宽度
  viewportHeight: 720                    # 可选：视口高度
  userAgent: "..."                       # 可选：自定义 UA
  bridgeMode: false                      # 可选：桥接模式

# AI 代理配置
agent:
  testId: "my-test"                      # 可选：测试 ID
  generateReport: true                   # 可选：生成报告
  aiActContext: "..."                    # 可选：AI 上下文

# 任务列表
tasks:
  - name: 任务名称                       # 必填：任务名称
    flow:                                # 必填：步骤列表
      - ai: 自然语言指令                # 自动规划执行
      - aiTap: 点击元素                 # 点击操作
      - aiInput:                        # 输入操作
          prompt: 输入框描述
          content: 输入内容
      - aiScroll:                       # 滚动操作
          direction: down
          distance: 500
      - aiAssert: 断言条件              # 断言验证
      - aiQuery:                        # 数据提取
          name: 数据名称
          prompt: 提取指令
      - aiWaitFor: 等待条件             # 等待条件
      - sleep: 3000                     # 固定等待（毫秒）
```

### 核心类型定义

```typescript
// 脚本元数据
interface ScriptMeta {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  runCount: number;
  status: 'idle' | 'running' | 'success' | 'failed';
}

// 执行结果
interface ExecuteResult {
  success: boolean;
  duration: number;
  steps: StepResult[];
  error?: string;
  reportPath?: string;
}

// 测试报告
interface TestReport {
  id: string;
  name: string;
  scriptId: string;
  scriptName: string;
  status: 'success' | 'failed' | 'partial';
  startTime: string;
  endTime: string;
  duration: number;
  results: ExecuteResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    steps: { total: number; passed: number; failed: number };
  };
}
```

---

## 🚀 部署与启动

### 开发环境

```bash
# 1. 进入项目目录
cd /Users/howbuy/code/MossMirror

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp apps/server/.env.example apps/server/.env
# 编辑 .env 文件，填入 AI API Key

# 4. 启动后端服务（终端 1）
pnpm dev:server

# 5. 启动前端服务（终端 2）
pnpm dev:web

# 6. 访问 http://localhost:3000
```

### 环境变量配置

```env
# AI 模型配置（必填）
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_BASE_URL=https://api.openai.com/v1
MIDSCENE_MODEL_PROVIDER=openai
MIDSCENE_MODEL_NAME=gpt-4o

# 服务器配置（可选）
PORT=3001

# 调试模式（可选）
MIDSCENE_DEBUG_AI_PROFILE=1
```

### 支持的 AI 模型

- **OpenAI**: GPT-4o, GPT-4o-mini, GPT-4
- **Qwen**: Qwen-VL-Max, Qwen2.5-VL
- **Anthropic**: Claude-3-opus, Claude-3-sonnet
- **其他**: 兼容 OpenAI API 的模型

---

## 🔮 扩展规划

### 已预留扩展点

1. **插件系统**
   - 自定义钩子（beforeExecute/afterExecute/onReport）
   - 第三方扩展支持

2. **多模型支持**
   - 灵活的模型配置
   - 模型切换功能

3. **WebSocket 实时通信**
   - 实时协作编辑
   - 消息推送

4. **数据库存储**
   - MongoDB 支持
   - PostgreSQL 支持

### 未来功能

- [ ] 用户管理和权限控制
- [ ] 定时任务调度
- [ ] CI/CD 集成（GitHub Actions / GitLab CI）
- [ ] 团队协作功能
- [ ] 移动端适配
- [ ] Docker 部署支持
- [ ] 测试数据管理
- [ ] 智能重试机制
- [ ] 性能监控
- [ ] 测试覆盖率分析

---

## 📝 使用示例

### 创建搜索测试脚本

```yaml
web:
  url: https://www.bing.com
  viewportWidth: 1280
  viewportHeight: 720

tasks:
  - name: 搜索 Midscene.js
    flow:
      - aiInput:
          prompt: 搜索框
          content: "Midscene.js 自动化测试"
      - aiTap: 搜索按钮
      - sleep: 3000
      - aiAssert: 页面显示搜索结果
```

### 创建登录测试脚本

```yaml
web:
  url: https://example.com/login
  viewportWidth: 1280
  viewportHeight: 720

tasks:
  - name: 登录测试
    flow:
      - aiInput:
          prompt: 用户名输入框
          content: "testuser"
      - aiInput:
          prompt: 密码输入框
          content: "password123"
      - aiTap: 登录按钮
      - aiAssert: 页面显示登录成功
```

---

## 🤝 贡献与反馈

### 代码规范

- 使用 TypeScript 严格模式
- ESLint 代码检查
- 组件函数式编程
- 清晰的命名规范

### 文档维护

- README.md - 项目说明
- ARCHITECTURE.md - 架构设计
- QUICKSTART.md - 快速开始
- PROJECT_SUMMARY.md - 项目总结

---

## 📄 许可证

MIT License

---

## 🙏 致谢

- [Midscene.js](https://midscenejs.com/zh) - AI 驱动的自动化测试框架
- [Ant Design](https://ant.design) - UI 组件库
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - 代码编辑器

---

<p align="center">
  用 ❤️ 和 🤖 构建 | Midscene 可视化自动化测试平台 v1.0.0
</p>
