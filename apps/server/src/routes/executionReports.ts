import express from 'express';
import * as executionReportService from '../services/executionReportService.js';

const router = express.Router();

// 获取所有 AI 执行报告（支持过滤）
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, status, executionMode } = req.query;
    const reports = await executionReportService.getAllAIExecutionReports({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      status: status as string | undefined,
      executionMode: executionMode as executionReportService.ExecutionMode | 'all' | undefined
    });
    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 获取单个 AI 执行报告
router.get('/:id', async (req, res) => {
  try {
    const report = await executionReportService.getAIExecutionReport(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 获取报告 HTML 内容
router.get('/:id/html', async (req, res) => {
  try {
    const html = await executionReportService.getAIReportHtml(req.params.id);

    if (!html) {
      return res.status(404).json({ success: false, error: 'Report HTML not found' });
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 删除 AI 执行报告
router.delete('/:id', async (req, res) => {
  try {
    const success = await executionReportService.deleteAIExecutionReport(req.params.id);

    if (!success) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 获取统计信息
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await executionReportService.getAIExecutionStatistics();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as AIExecutionReportRoutes };
