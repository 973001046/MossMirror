# 快速开始指南

## 环境准备

### 1. 安装 Node.js
确保 Node.js 版本 >= 18

```bash
node -v
```

### 2. 安装 pnpm
```bash
npm install -g pnpm
```

### 3. 配置 AI 模型
Midscene.js 需要配置 AI 模型才能正常工作。复制环境变量示例文件并配置：

```bash
cp apps/server/.env.example apps/server/.env
```

编辑 `.env` 文件，填入你的 API Key：

```env
# OpenAI 配置示例
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_BASE_URL=https://api.openai.com/v1
MIDSCENE_MODEL_PROVIDER=openai
MIDSCENE_MODEL_NAME=gpt-4o
```

**支持的模型**：
- OpenAI: GPT-4o, GPT-4o-mini
- Qwen: Qwen-VL-Max, Qwen2.5-VL
- Anthropic: Claude-3-opus, Claude-3-sonnet
- 其他兼容 OpenAI API 的模型

## 安装依赖

在项目根目录执行：

```bash
pnpm install
```

## 启动服务

### 方式一：分别启动（开发推荐）

**终端 1 - 启动后端服务：**
```bash
pnpm dev:server
```

**终端 2 - 启动前端服务：**
```bash
pnpm dev:web
```

访问 http://localhost:3000

### 方式二：使用 PM2 启动（生产环境）

```bash
# 全局安装 PM2
npm install -g pm2

# 启动服务
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs
```

## 使用指南

### 1. 创建第一个脚本

1. 点击左侧菜单「脚本管理」
2. 点击「新建脚本」按钮
3. 填写脚本信息：
   - 名称：我的第一个测试
   - 描述：测试搜索功能
4. 在编辑器中输入 YAML：

```yaml
web:
  url: https://www.bing.com
  viewportWidth: 1280
  viewportHeight: 720

tasks:
  - name: 搜索测试
    flow:
      - aiInput:
          prompt: 搜索框
          content: "Midscene.js"
      - aiTap: 搜索按钮
      - sleep: 3000
      - aiAssert: 页面显示搜索结果
```

5. 点击「保存」

### 2. 在 Playground 中测试

1. 点击左侧菜单「Playground」
2. 选择模板「网页搜索测试」
3. 修改 URL 为你想测试的网站
4. 点击「执行」按钮
5. 查看右侧执行日志

### 3. 批量执行脚本

1. 点击左侧菜单「批量执行」
2. 在左侧列表中选择多个脚本
3. 在右侧配置执行参数：
   - 执行模式：并行/串行
   - 最大并发数
   - 出错时是否停止
4. 点击「开始批量执行」
5. 等待执行完成，查看报告

### 4. 查看测试报告

1. 点击左侧菜单「测试报告」
2. 查看所有历史报告
3. 点击「查看」按钮查看详情
4. 可以导出 HTML 报告分享给团队

## 常见问题

### 1. AI 模型返回错误

检查：
- API Key 是否正确
- API Base URL 是否配置正确
- 模型名称是否正确
- 账户余额是否充足

### 2. 脚本执行超时

在 `.env` 中增加超时配置：
```env
MIDSCENE_EXECUTION_TIMEOUT=120000
```

### 3. 无法启动服务

检查：
- Node.js 版本 >= 18
- 端口 3000 和 3001 是否被占用
- 依赖是否安装完整

### 4. YAML 格式错误

- 使用 Playground 的预览功能验证 YAML
- 注意缩进使用空格，不要用 Tab
- 特殊字符需要转义

## 下一步

- 阅读 [API 文档](./API.md) 了解详细接口
- 查看 [YAML 语法指南](https://midscenejs.com/zh/automate-with-scripts-in-yaml)
- 探索更多模板和示例脚本
- 查看 [架构设计](./ARCHITECTURE.md) 了解如何扩展功能

## 获取帮助

- 官方文档：https://midscenejs.com/zh
- GitHub Issues: https://github.com/
- 社区讨论：
