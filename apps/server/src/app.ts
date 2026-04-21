import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { ScriptRoutes } from './routes/scripts.js';
import { ReportRoutes } from './routes/reports.js';
import { ExecuteRoutes } from './routes/execute.js';
import { PlaygroundRoutes } from './routes/playground.js';
import { AIExecutionReportRoutes } from './routes/executionReports.js';
import { ensureDirectories } from './utils/fileUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 确保必要的目录存在
ensureDirectories();

// 静态文件服务
app.use('/reports', express.static(path.join(__dirname, '../../reports')));
app.use('/ai-reports', express.static(path.join(__dirname, '../midscene_run/report')));

// 路由
app.use('/api/scripts', ScriptRoutes);
app.use('/api/reports', ReportRoutes);
app.use('/api/execution-reports', AIExecutionReportRoutes);
app.use('/api/execute', ExecuteRoutes);
app.use('/api/playground', PlaygroundRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Midscene Test Platform Server running on port ${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api`);
});
