import express from 'express';
import * as scriptService from '../services/scriptService.js';
import * as executeService from '../services/executeService.js';
import * as reportService from '../services/reportService.js';
import { BatchConfig } from '../models/types.js';

const router = express.Router();

// 执行脚本的核心逻辑
async function executeScriptCore(scriptId: string, res: express.Response, useSSE: boolean) {
  const result = await scriptService.getScriptContent(scriptId);

  if (!result) {
    if (useSSE) {
      res.write(`data: ${JSON.stringify({ type: 'execute:end', data: { success: false, error: 'Script not found' } })}\n\n`);
      res.end();
      return;
    }
    return res.status(404).json({ success: false, error: 'Script not found' });
  }

  if (useSSE) {
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
}

// GET 路由 - 支持 SSE (EventSource 只能发起 GET 请求)
router.get('/:scriptId', async (req, res) => {
  try {
    await executeScriptCore(req.params.scriptId, res, true);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST 路由 - 支持普通 HTTP 请求和 SSE
router.post('/:scriptId', async (req, res) => {
  try {
    const acceptHeader = req.headers.accept || '';
    const useSSE = acceptHeader.includes('text/event-stream');
    await executeScriptCore(req.params.scriptId, res, useSSE);
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
