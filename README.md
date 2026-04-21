# Midscene 可视化自动化测试平台

基于 [Midscene.js](https://midscenejs.com/zh) 的可视化自动化测试平台，支持 YAML 脚本编写、批量执行和测试报告生成。

[![Midscene.js](https://img.shields.io/badge/Powered%20by-Midscene.js-667eea)](https://midscenejs.com/zh)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933)](https://nodejs.org)

![Demo](./docs/demo.png)

## ✨ 核心功能

### 🎮 可视化 Playground
- 实时编辑和调试 YAML 脚本
- 内置 Monaco Editor 编辑器
- 即时语法验证
- 丰富的脚本模板库

### 📝 脚本管理
- 预设、导入、导出 YAML 格式测试脚本
- 标签分类管理
- 版本历史记录
- 一键复制脚本

### 🚀 批量执行
- 支持并发执行多个脚本
- 灵活的并发数配置
- 出错时自动停止选项
- 实时执行进度展示

### 📊 测试报告
- 详细的测试报告，记录失败原因和截图
- HTML 格式报告导出
- 执行趋势统计
- 通过率分析

### 🏠 仪表盘
- 整体数据概览
- 执行趋势图表
- 最近活动展示
- 快速操作入口

## 🛠️ 技术栈

- **前端**: React 18 + TypeScript + Ant Design + Monaco Editor
- **后端**: Node.js + Express + TypeScript
- **测试引擎**: Midscene.js (@midscene/cli)
- **存储**: 本地 JSON 文件（可扩展为数据库）

## 📁 项目结构

```
.
├── apps/
│   ├── web/                    # React 前端应用
│   │   ├── src/
│   │   │   ├── components/     # 公共组件
│   │   │   ├── pages/          # 页面
│   │   │   │   ├── Dashboard/  # 仪表盘
│   │   │   │   ├── Playground/ # 可视化编辑器
│   │   │   │   ├── Scripts/    # 脚本管理
│   │   │   │   ├── Reports/    # 报告中心
│   │   │   │   └── BatchRun/   # 批量执行
│   │   │   ├── services/       # API 服务
│   │   │   └── utils/          # 工具函数
│   │   └── package.json
│   └── server/                 # Node.js 后端服务
│       ├── src/
│       │   ├── controllers/    # 控制器
│       │   ├── services/       # 业务逻辑
│       │   ├── models/         # 数据模型
│       │   ├── routes/         # 路由
│       │   └── utils/          # 工具函数
│       └── package.json
├── scripts/                    # 示例脚本
├── docs/                       # 文档
└── reports/                    # 测试报告输出
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- pnpm (推荐) 或 npm
- AI 模型 API Key (OpenAI / Qwen / Claude 等)

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd MidsceneTestPlatform

# 安装依赖
pnpm install

# 配置环境变量
cp apps/server/.env.example apps/server/.env
# 编辑 .env 文件，填入你的 AI API Key
```

### 启动服务

```bash
# 启动后端服务
pnpm dev:server

# 新终端 - 启动前端服务
pnpm dev:web
```

访问 http://localhost:3000

详细文档请查看 [快速开始指南](./docs/QUICKSTART.md)

## 📝 YAML 脚本格式

```yaml
# 环境配置
web:
  url: https://www.example.com
  viewportWidth: 1280
  viewportHeight: 720

# AI 代理配置（可选）
agent:
  testId: "my-test"
  generateReport: true

# 任务列表
tasks:
  - name: 登录测试
    flow:
      - aiInput:
          prompt: 用户名输入框
          content: testuser
      - aiInput:
          prompt: 密码输入框
          content: password123
      - aiTap: 登录按钮
      - aiAssert: 页面显示登录成功
```

更多示例请查看 [scripts](./scripts) 目录

## 🔌 API 接口

### 脚本管理
- `GET    /api/scripts` - 获取所有脚本
- `POST   /api/scripts` - 创建脚本
- `GET    /api/scripts/:id` - 获取脚本详情
- `PUT    /api/scripts/:id` - 更新脚本
- `DELETE /api/scripts/:id` - 删除脚本
- `POST   /api/scripts/import` - 导入 YAML
- `GET    /api/scripts/:id/export` - 导出 YAML

### 执行控制
- `POST /api/execute/:scriptId` - 执行单个脚本
- `POST /api/execute/batch/run` - 批量执行脚本

### 报告管理
- `GET    /api/reports` - 获取所有报告
- `GET    /api/reports/:id` - 获取报告详情
- `GET    /api/reports/:id/html` - 获取报告 HTML
- `GET    /api/reports/stats/overview` - 获取统计信息
- `DELETE /api/reports/:id` - 删除报告

### Playground
- `POST /api/playground/preview` - 预览 YAML
- `POST /api/playground/run` - 快速执行
- `GET  /api/playground/templates` - 获取模板

## 🏗️ 架构设计

查看 [架构设计文档](./docs/ARCHITECTURE.md) 了解：
- 整体架构设计
- 核心模块说明
- 扩展设计预留
- 性能优化方案

## 🔮 未来规划

- [ ] 数据库存储支持 (MongoDB/Mysql)
- [ ] 用户管理和权限控制
- [ ] WebSocket 实时通信
- [ ] 定时任务调度
- [ ] CI/CD 集成
- [ ] 团队协作功能
- [ ] 插件系统
- [ ] 移动端适配

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- [Midscene.js](https://midscenejs.com/zh) - 强大的 AI 驱动自动化测试框架
- [Ant Design](https://ant.design) - UI 组件库
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - 代码编辑器

---

<p align="center">
  用 ❤️ 和 🤖 构建
</p>
