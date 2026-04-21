import express from 'express';
import * as reportService from '../services/reportService.js';
import * as scriptService from '../services/scriptService.js';

const router = express.Router();

// 获取所有报告
router.get('/', async (req, res) => {
  try {
    const reports = await reportService.getAllReports();
    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 获取单个报告
router.get('/:id', async (req, res) => {
  try {
    const report = await reportService.getReport(req.params.id);

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

// 获取报告 HTML
router.get('/:id/html', async (req, res) => {
  try {
    const html = await reportService.getReportHtml(req.params.id);

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

// 获取某脚本的报告历史
router.get('/script/:scriptId', async (req, res) => {
  try {
    const reports = await reportService.getScriptReports(req.params.scriptId);
    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 删除报告
router.delete('/:id', async (req, res) => {
  try {
    const success = await reportService.deleteReport(req.params.id);

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
    const scripts = await scriptService.getAllScripts();
    const stats = await reportService.getStatistics();

    stats.totalScripts = scripts.length;

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as ReportRoutes };
