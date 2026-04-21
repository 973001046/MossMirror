import express from 'express';
import * as scriptService from '../services/scriptService.js';
import * as executeService from '../services/executeService.js';
import * as reportService from '../services/reportService.js';
import { BatchConfig } from '../models/types.js';

const router = express.Router();

// 执行单个脚本
router.post('/:scriptId', async (req, res) => {
  try {
    const result = await scriptService.getScriptContent(req.params.scriptId);

    if (!result) {
      return res.status(404).json({ success: false, error: 'Script not found' });
    }

    // 使用 Server-Sent Events 返回实时进度
    const acceptHeader = req.headers.accept || '';
    if (acceptHeader.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const executeResult = await executeService.executeScript(
        result.meta,
        result.content,
        (message) => {
          res.write(`data: ${JSON.stringify(message)}\n\n`);
        }
      );

      res.write(`data: ${JSON.stringify({ type: 'done', data: executeResult })}\n\n`);
      res.end();
    } else {
      // 普通 HTTP 请求，直接返回结果
      const executeResult = await executeService.executeScript(result.meta, result.content);

      // 生成报告
      const report = await reportService.getAllReports().then(reports => {
        return reports.find(r => r.scriptId === result.meta.id);
      });

      res.json({
        success: true,
        data: {
          result: executeResult,
          reportId: report?.id
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 批量执行
router.post('/batch/run', async (req, res) => {
  try {
    const { scriptIds, parallel, maxConcurrency, stopOnError, name } = req.body;

    if (!scriptIds || !Array.isArray(scriptIds) || scriptIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'scriptIds array is required'
      });
    }

    // 获取所有脚本内容
    const scripts = [];
    for (const id of scriptIds) {
      const result = await scriptService.getScriptContent(id);
      if (result) {
        scripts.push(result);
      }
    }

    if (scripts.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No valid scripts found'
      });
    }

    const config: BatchConfig = {
      id: `${Date.now()}`,
      name: name || `批量执行-${new Date().toLocaleString()}`,
      scriptIds,
      parallel: parallel !== false,
      maxConcurrency: maxConcurrency || 4,
      stopOnError: stopOnError === true,
      createdAt: new Date().toISOString(),
      status: 'running'
    };

    // 使用 SSE 返回实时进度
    const acceptHeader = req.headers.accept || '';
    if (acceptHeader.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const report = await executeService.executeBatch(
        config,
        scripts,
        (message) => {
          res.write(`data: ${JSON.stringify(message)}\n\n`);
        }
      );

      res.write(`data: ${JSON.stringify({ type: 'report', data: report })}\n\n`);
      res.end();
    } else {
      // 普通 HTTP 请求
      const report = await executeService.executeBatch(config, scripts);

      res.json({
        success: true,
        data: report
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as ExecuteRoutes };
