import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { PATHS, generateId } from '../utils/fileUtils.js';
import {
  ScriptMeta,
  YamlScript,
  ExecuteResult,
  StepResult,
  TestReport,
  BatchConfig,
  WebSocketMessage
} from '../models/types.js';
import { updateScriptStatus } from './scriptService.js';
import { saveReport } from './reportService.js';

// 执行状态回调
export type ProgressCallback = (message: WebSocketMessage) => void;

// 执行上下文
interface ExecuteContext {
  scriptId: string;
  scriptName: string;
  startTime: number;
  results: StepResult[];
  callback?: ProgressCallback;
}

// 执行单个脚本
export async function executeScript(
  meta: ScriptMeta,
  content: YamlScript,
  callback?: ProgressCallback,
  isBatch = false
): Promise<ExecuteResult> {
  const context: ExecuteContext = {
    scriptId: meta.id,
    scriptName: meta.name,
    startTime: Date.now(),
    results: [],
    callback
  };

  if (!isBatch) {
    await updateScriptStatus(meta.id, 'running');
  }

  try {
    notify(callback, {
      type: 'execute:start',
      data: { scriptId: meta.id, scriptName: meta.name }
    });

    // 创建临时 YAML 文件
    const tempFile = path.join(PATHS.temp, `exec-${generateId()}.yaml`);
    const yaml = await import('js-yaml');
    await fs.writeFile(tempFile, yaml.dump(content), 'utf-8');

    // 执行 Midscene CLI
    const result = await runMidsceneCli(tempFile, content, context);

    // 清理临时文件
    await fs.remove(tempFile);

    if (!isBatch) {
      await updateScriptStatus(meta.id, result.success ? 'success' : 'failed', true);
    }

    notify(callback, {
      type: 'execute:end',
      data: result
    });

    return result;
  } catch (error) {
    const failedResult: ExecuteResult = {
      success: false,
      duration: Date.now() - context.startTime,
      steps: context.results,
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    if (!isBatch) {
      await updateScriptStatus(meta.id, 'failed', true);
    }

    notify(callback, { type: 'error', data: { message: failedResult.error! } });

    return failedResult;
  }
}

// 运行 Midscene CLI
async function runMidsceneCli(
  yamlFile: string,
  content: YamlScript,
  context: ExecuteContext
): Promise<ExecuteResult> {
  return new Promise((resolve, reject) => {
    const midsceneCmd = process.platform === 'win32' ? 'midscene.cmd' : 'midscene';

    // 准备环境变量
    const env = {
      ...process.env,
      MIDSCENE_DEBUG_AI_PROFILE: '1'
    };

    // 构建命令参数
    const args = [yamlFile, '--verbose'];

    const child = spawn(midsceneCmd, args, {
      env,
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      parseProgress(chunk, context);
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      const duration = Date.now() - context.startTime;

      // 检查是否有报告文件生成
      const reportFiles = findReportFiles();

      // 分析错误信息，区分致命错误和警告
      let errorMessage: string | undefined;
      if (code !== 0) {
        errorMessage = extractErrorMessage(stderr, stdout);
      }

      resolve({
        success: code === 0,
        duration,
        steps: context.results,
        error: errorMessage,
        reportPath: reportFiles[0]
      });
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// 解析进度输出
function parseProgress(output: string, context: ExecuteContext): void {
  // 解析任务开始
  const taskMatch = output.match(/Task:\s*(.+)/i);
  if (taskMatch) {
    const taskName = taskMatch[1].trim();
    notify(context.callback, {
      type: 'task:start',
      data: { taskIndex: context.results.length, taskName }
    });
  }

  // 解析步骤信息
  const stepMatch = output.match(/Step\s*(\d+):\s*(.+)/i);
  if (stepMatch) {
    const stepNum = parseInt(stepMatch[1]);
    const stepType = stepMatch[2].trim();

    const stepResult: StepResult = {
      step: stepNum,
      type: stepType,
      description: `${stepType} 操作`,
      status: 'running',
      duration: 0
    };

    context.results.push(stepResult);

    notify(context.callback, {
      type: 'step:start',
      data: stepResult
    });
  }

  // 解析成功/失败
  if (output.includes('✓') || output.includes('success') || output.includes('Success')) {
    const lastStep = context.results[context.results.length - 1];
    if (lastStep) {
      lastStep.status = 'success';
      lastStep.duration = Date.now() - context.startTime;

      notify(context.callback, {
        type: 'step:end',
        data: lastStep
      });
    }
  }

  if (output.includes('✗') || output.includes('failed') || output.includes('Error')) {
    const lastStep = context.results[context.results.length - 1];
    if (lastStep) {
      lastStep.status = 'failed';
      lastStep.error = output;

      notify(context.callback, {
        type: 'step:end',
        data: lastStep
      });
    }
  }
}

// 提取错误信息，过滤警告
function extractErrorMessage(stderr: string, stdout: string): string {
  const output = stderr || stdout;

  // 定义常见的警告模式（这些不是致命错误）
  const warningPatterns = [
    /failed to wait for network idle after \d+ms/i,
    /waiting for.*timeout \d+ms/i,
    /Navigation failed because browser has disconnected/i,
    /net::ERR_/i
  ];

  const lines = output.split('\n').filter(line => line.trim());

  // 查找真正的错误行
  for (const line of lines) {
    // 跳过警告
    if (warningPatterns.some(pattern => pattern.test(line))) {
      continue;
    }

    // 识别错误关键词
    if (/error|failed|exception/i.test(line) && !line.includes('but the script will continue')) {
      return line.trim();
    }
  }

  // 如果只包含警告，返回简化信息
  if (output.includes('but the script will continue')) {
    return '测试执行完成（包含警告）';
  }

  return output.substring(0, 500); // 限制长度
}

// 查找生成的报告文件
function findReportFiles(): string[] {
  try {
    const files = fs.readdirSync(PATHS.reports);
    return files
      .filter(f => f.endsWith('.html') || f.endsWith('.json'))
      .map(f => path.join(PATHS.reports, f))
      .sort((a, b) => fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime());
  } catch {
    return [];
  }
}

// 发送通知
function notify(callback: ProgressCallback | undefined, message: WebSocketMessage): void {
  if (callback) {
    callback(message);
  }
}

// 批量执行
export async function executeBatch(
  config: BatchConfig,
  scripts: Array<{ meta: ScriptMeta; content: YamlScript }>,
  callback?: ProgressCallback
): Promise<TestReport> {
  const batchId = generateId();
  const startTime = Date.now();

  const results: ExecuteResult[] = [];

  if (config.parallel) {
    // 并行执行
    const maxConcurrency = config.maxConcurrency || 4;
    const chunks: Array<typeof scripts> = [];

    for (let i = 0; i < scripts.length; i += maxConcurrency) {
      chunks.push(scripts.slice(i, i + maxConcurrency));
    }

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(({ meta, content }) => executeScript(meta, content, callback, true))
      );
      results.push(...chunkResults);

      // 如果出错且设置了 stopOnError，则停止
      if (config.stopOnError && chunkResults.some(r => !r.success)) {
        break;
      }
    }
  } else {
    // 串行执行
    for (const { meta, content } of scripts) {
      const result = await executeScript(meta, content, callback, true);
      results.push(result);

      if (config.stopOnError && !result.success) {
        break;
      }
    }
  }

  // 生成报告
  const report = await generateBatchReport(batchId, config.name, results, startTime);
  await saveReport(report);

  return report;
}

// 生成批量执行报告
async function generateBatchReport(
  id: string,
  name: string,
  results: ExecuteResult[],
  startTime: number
): Promise<TestReport> {
  const endTime = Date.now();
  const duration = endTime - startTime;

  const passed = results.filter(r => r.success).length;
  const failed = results.length - passed;

  const totalSteps = results.reduce((sum, r) => sum + r.steps.length, 0);
  const passedSteps = results.reduce(
    (sum, r) => sum + r.steps.filter(s => s.status === 'success').length,
    0
  );

  const report: TestReport = {
    id,
    name,
    scriptId: '',
    scriptName: '批量执行',
    status: failed === 0 ? 'success' : passed === 0 ? 'failed' : 'partial',
    startTime: new Date(startTime).toISOString(),
    endTime: new Date(endTime).toISOString(),
    duration,
    results,
    summary: {
      total: results.length,
      passed,
      failed,
      steps: {
        total: totalSteps,
        passed: passedSteps,
        failed: totalSteps - passedSteps
      }
    },
    reportPath: path.join(PATHS.reports, `batch-${id}.html`)
  };

  // 生成 HTML 报告文件
  await generateHtmlReport(report);

  return report;
}

// 生成 HTML 报告
async function generateHtmlReport(report: TestReport): Promise<void> {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>测试报告 - ${report.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f7fa;
      color: #333;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .header .meta { opacity: 0.9; font-size: 14px; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .card h3 { font-size: 14px; color: #666; margin-bottom: 8px; }
    .card .value { font-size: 32px; font-weight: bold; }
    .success { color: #52c41a; }
    .failed { color: #ff4d4f; }
    .partial { color: #faad14; }
    .details { background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .details h2 { padding: 20px; border-bottom: 1px solid #e8e8e8; }
    .result-item {
      padding: 16px 20px;
      border-bottom: 1px solid #e8e8e8;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .result-item:last-child { border-bottom: none; }
    .status-badge {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    .status-success { background: #f6ffed; color: #52c41a; }
    .status-failed { background: #fff2f0; color: #ff4d4f; }
    .duration { color: #999; font-size: 14px; }
    .error-msg {
      margin-top: 8px;
      padding: 12px;
      background: #fff2f0;
      border-left: 4px solid #ff4d4f;
      color: #666;
      font-size: 13px;
    }
    .step-list {
      margin-top: 12px;
      padding-left: 20px;
    }
    .step-list li {
      margin: 4px 0;
      font-size: 13px;
      color: #666;
    }
    .step-success::before { content: "✓ "; color: #52c41a; }
    .step-failed::before { content: "✗ "; color: #ff4d4f; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${report.name}</h1>
      <div class="meta">
        执行时间: ${new Date(report.startTime).toLocaleString()} |
        总耗时: ${(report.duration / 1000).toFixed(2)}s
      </div>
    </div>

    <div class="summary">
      <div class="card">
        <h3>总脚本数</h3>
        <div class="value">${report.summary.total}</div>
      </div>
      <div class="card">
        <h3>通过</h3>
        <div class="value success">${report.summary.passed}</div>
      </div>
      <div class="card">
        <h3>失败</h3>
        <div class="value failed">${report.summary.failed}</div>
      </div>
      <div class="card">
        <h3>总步骤</h3>
        <div class="value">${report.summary.steps.total}</div>
      </div>
    </div>

    <div class="details">
      <h2>执行详情</h2>
      ${report.results.map((r, i) => `
        <div class="result-item">
          <div>
            <strong>测试 #${i + 1}</strong>
            <span class="duration">耗时: ${(r.duration / 1000).toFixed(2)}s</span>
            ${r.error ? `<div class="error-msg">${r.error}</div>` : ''}
            ${r.steps.length > 0 ? `
              <ul class="step-list">
                ${r.steps.map(s => `
                  <li class="step-${s.status}">${s.type}: ${s.description}</li>
                `).join('')}
              </ul>
            ` : ''}
          </div>
          <span class="status-badge status-${r.success ? 'success' : 'failed'}">
            ${r.success ? '通过' : '失败'}
          </span>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>
  `;

  await fs.writeFile(report.reportPath, html, 'utf-8');
}
