import express from 'express';
import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import { PATHS, generateId } from '../utils/fileUtils.js';
import { YamlScript, FlowStep } from '../models/types.js';

const router: express.Router = express.Router();

// 预览 YAML（验证语法）
router.post('/preview', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    // 验证 YAML 语法
    try {
      const parsed = yaml.load(content) as YamlScript;

      // 基本验证
      const validation = validateYamlScript(parsed);

      res.json({
        success: true,
        data: {
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
          parsed
        }
      });
    } catch (yamlError) {
      res.json({
        success: true,
        data: {
          valid: false,
          errors: [(yamlError as Error).message],
          warnings: [],
          parsed: null
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

// 在 Playground 中快速运行
router.post('/run', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    // 解析 YAML
    const parsed = yaml.load(content) as YamlScript;

    // 创建临时文件
    const tempId = generateId();
    const tempFile = path.join(PATHS.temp, `playground-${tempId}.yaml`);
    await fs.writeFile(tempFile, content, 'utf-8');

    // 执行
    const startTime = Date.now();

    try {
      const result = await runPlaygroundScript(tempFile, startTime, parsed);
      res.json(result);
    } catch (error) {
      await fs.remove(tempFile).catch(() => {});
      throw error;
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// AI 即时操作 (Chrome 插件风格) - 标准 HTTP 模式
router.post('/ai-instant', async (req, res) => {
  try {
    const {
      url,
      type = 'action',
      prompt,
      content,
      deepThink = false,
      viewport = { width: 1280, height: 720 }
    } = req.body;

    if (!url || !prompt) {
      return res.status(400).json({
        success: false,
        error: 'URL and prompt are required'
      });
    }

    // 构建 Flow 步骤
    const flowStep = buildFlowStep(type, prompt, content, deepThink);

    // 创建临时 YAML 文件
    const tempId = generateId();
    const tempFile = path.join(PATHS.temp, `ai-instant-${tempId}.yaml`);

    const yamlContent = yaml.dump({
      web: {
        url,
        viewportWidth: viewport.width,
        viewportHeight: viewport.height
      },
      agent: {
        testId: `ai-instant-${tempId}`,
        generateReport: true,
        aiActContext: `即时操作: ${type} - ${prompt}`
      },
      tasks: [
        {
          name: `${type}: ${prompt.substring(0, 50)}`,
          flow: [flowStep]
        }
      ]
    });

    await fs.writeFile(tempFile, yamlContent, 'utf-8');

    // 执行
    const startTime = Date.now();

    const result = await runAIInstantAction(tempFile, startTime, type, prompt);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// AI 即时操作 - SSE 实时流模式（支持预览）
router.get('/ai-instant-stream', async (req, res) => {
  const {
    url,
    type = 'action',
    prompt,
    content,
    deepThink = 'false',
    viewportWidth = '1280',
    viewportHeight = '720'
  } = req.query;

  if (!url || !prompt) {
    return res.status(400).json({
      success: false,
      error: 'URL and prompt are required'
    });
  }

  // 设置 SSE 头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // 构建 Flow 步骤
  const flowStep = buildFlowStep(
    type as string,
    prompt as string,
    content as string | undefined,
    deepThink === 'true'
  );

  // 创建临时 YAML 文件
  const tempId = generateId();
  const tempFile = path.join(PATHS.temp, `ai-instant-${tempId}.yaml`);

  const yamlContent = yaml.dump({
    web: {
      url,
      viewportWidth: parseInt(viewportWidth as string),
      viewportHeight: parseInt(viewportHeight as string)
    },
    agent: {
      testId: `ai-instant-${tempId}`,
      generateReport: true,
      aiActContext: `即时操作: ${type} - ${prompt}`
    },
    tasks: [
      {
        name: `${type}: ${(prompt as string).substring(0, 50)}`,
        flow: [flowStep]
      }
    ]
  });

  await fs.writeFile(tempFile, yamlContent, 'utf-8');

  // 执行并实时推送
  const startTime = Date.now();

  runAIInstantActionStream(
    tempFile,
    startTime,
    type as string,
    prompt as string,
    (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    },
    () => {
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    }
  );
});

// 构建 Flow 步骤
function buildFlowStep(
  type: string,
  prompt: string,
  content?: string,
  deepThink?: boolean
): FlowStep {
  switch (type) {
    case 'action':
      return { ai: prompt, ...(deepThink && { deepThink: true }) };
    case 'tap':
      return { aiTap: prompt, ...(deepThink && { deepThink: true }) };
    case 'input':
      const [inputPrompt, inputContent] = content
        ? [prompt, content]
        : prompt.split(' - ');
      return {
        aiInput: {
          prompt: inputPrompt || prompt,
          content: inputContent || content || ''
        },
        ...(deepThink && { deepThink: true })
      };
    case 'scroll':
      const direction = prompt.includes('上')
        ? 'up'
        : prompt.includes('下')
          ? 'down'
          : prompt.includes('左')
            ? 'left'
            : 'right';
      const distanceMatch = prompt.match(/(\d+)/);
      return {
        aiScroll: {
          direction: direction as any,
          distance: distanceMatch ? parseInt(distanceMatch[1]) : 500
        },
        ...(deepThink && { deepThink: true })
      };
    case 'query':
      return {
        aiQuery: { name: 'query_result', prompt },
        ...(deepThink && { deepThink: true })
      };
    case 'assert':
      return { aiAssert: prompt, ...(deepThink && { deepThink: true }) };
    case 'wait':
      const timeoutMatch = prompt.match(/(\d+)/);
      return {
        aiWaitFor: prompt,
        timeout: timeoutMatch ? parseInt(timeoutMatch[1]) : 30000,
        ...(deepThink && { deepThink: true })
      };
    default:
      return { ai: prompt };
  }
}

// 运行 Playground 脚本
function runPlaygroundScript(
  tempFile: string,
  startTime: number,
  parsed: YamlScript
): Promise<{ success: boolean; data: any }> {
  return new Promise((resolve, reject) => {
    const midsceneCmd = process.platform === 'win32' ? 'midscene.cmd' : 'midscene';

    const child = spawn(midsceneCmd, [tempFile, '--verbose'], {
      env: { ...process.env, MIDSCENE_DEBUG_AI_PROFILE: '1' },
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', async (code) => {
      // 清理临时文件
      await fs.remove(tempFile).catch(() => {});

      const duration = Date.now() - startTime;

      // 提取错误信息，过滤警告
      let errorMessage: string | undefined;
      if (code !== 0 || stderr) {
        errorMessage = extractErrorMessage(stderr, stdout);
      }

      resolve({
        success: true,
        data: {
          success: code === 0 && !errorMessage,
          duration,
          output: stdout,
          error: errorMessage,
          parsed
        }
      });
    });

    child.on('error', async (error) => {
      await fs.remove(tempFile).catch(() => {});
      reject(error);
    });

    // 超时处理（5分钟）
    setTimeout(async () => {
      child.kill();
      await fs.remove(tempFile).catch(() => {});
      resolve({
        success: true,
        data: {
          success: false,
          duration: Date.now() - startTime,
          output: stdout,
          error: '执行超时（5分钟）',
          parsed
        }
      });
    }, 5 * 60 * 1000);
  });
}

// 运行 AI 即时操作
function runAIInstantAction(
  tempFile: string,
  startTime: number,
  type: string,
  prompt: string
): Promise<{ success: boolean; data: any }> {
  return new Promise((resolve, reject) => {
    const midsceneCmd = process.platform === 'win32' ? 'midscene.cmd' : 'midscene';

    // 从临时文件名提取 testId
    const testIdMatch = tempFile.match(/ai-instant-(.+?)\.yaml$/);
    const testId = testIdMatch ? testIdMatch[1] : '';

    const child = spawn(midsceneCmd, [tempFile, '--verbose'], {
      env: { ...process.env, MIDSCENE_DEBUG_AI_PROFILE: '1' },
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', async (code) => {
      // 清理临时文件
      await fs.remove(tempFile).catch(() => {});

      const duration = Date.now() - startTime;

      // 解析执行结果
      const actionResult = parseAIInstantResult(stdout, stderr, type, prompt);

      // 从 HTML 报告中提取截图
      const screenshots = await extractScreenshotsFromReport(testId);
      const latestScreenshot = screenshots.length > 0 ? screenshots[screenshots.length - 1] : undefined;

      resolve({
        success: true,
        data: {
          success: code === 0 && actionResult.success,
          duration,
          type,
          prompt,
          action: actionResult.action,
          result: actionResult.result,
          error: actionResult.error,
          screenshot: latestScreenshot || actionResult.screenshot,
          screenshots,
          stdout: stdout.substring(0, 2000),
          stderr: stderr.substring(0, 1000)
        }
      });
    });

    child.on('error', async (error) => {
      await fs.remove(tempFile).catch(() => {});
      reject(error);
    });

    // 超时处理（2分钟）
    setTimeout(async () => {
      child.kill();
      await fs.remove(tempFile).catch(() => {});

      // 即使超时也尝试提取截图
      const screenshots = await extractScreenshotsFromReport(testId);

      // 构建超时前的错误信息
      let timeoutError = '执行超时（2分钟）';
      if (stderr) {
        const stderrPreview = extractErrorMessage(stderr, stdout);
        if (stderrPreview) {
          timeoutError += `\n\n执行日志:\n${stderrPreview}`;
        }
      }

      resolve({
        success: true,
        data: {
          success: false,
          duration: Date.now() - startTime,
          type,
          prompt,
          action: type,
          error: timeoutError,
          screenshots,
          stdout: stdout.substring(0, 2000),
          stderr: stderr.substring(0, 1000)
        }
      });
    }, 2 * 60 * 1000);
  });
}

// 从 HTML 报告中提取截图
async function extractScreenshotsFromReport(testId: string): Promise<string[]> {
  const screenshots: string[] = [];

  try {
    // 查找最新的报告文件
    const reportDir = path.join(process.cwd(), 'midscene_run', 'report');
    if (!fs.existsSync(reportDir)) {
      return screenshots;
    }

    // 获取所有相关的 HTML 报告文件，按修改时间排序
    const files = fs.readdirSync(reportDir)
      .filter(f => f.includes(testId) && f.endsWith('.html'))
      .map(f => ({
        name: f,
        time: fs.statSync(path.join(reportDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length === 0) {
      return screenshots;
    }

    const reportPath = path.join(reportDir, files[0].name);

    // 读取 HTML 内容
    const htmlContent = fs.readFileSync(reportPath, 'utf-8');

    // 提取 base64 图片数据
    // Midscene 报告中的图片格式: data:image/webp;base64,xxxx 或 data:image/png;base64,xxxx
    // 页面截图通常很大（几十KB到几百KB），而图标/装饰图较小
    const base64Regex = /data:image\/(webp|png|jpeg|jpg);base64,([A-Za-z0-9+/=]+)/gi;
    let match;

    while ((match = base64Regex.exec(htmlContent)) !== null) {
      const base64Data = match[2];
      // 只保留真正的页面截图（长度大于 20KB 才认为是截图，过滤掉图标）
      // 20KB = 约 27307 个 base64 字符
      if (base64Data.length > 27307) {
        const imageData = `data:image/${match[1].toLowerCase()};base64,${base64Data}`;
        // 避免重复添加相同的图片
        if (!screenshots.includes(imageData)) {
          screenshots.push(imageData);
        }
      }
    }

    return screenshots;
  } catch (error) {
    console.error('Failed to extract screenshots from report:', error);
    return screenshots;
  }
}

// 运行 AI 即时操作 - 流式模式（实时推送）
function runAIInstantActionStream(
  tempFile: string,
  startTime: number,
  type: string,
  prompt: string,
  onData: (data: any) => void,
  onComplete: () => void
) {
  const midsceneCmd = process.platform === 'win32' ? 'midscene.cmd' : 'midscene';

  // 从临时文件名提取 testId
  const testIdMatch = tempFile.match(/ai-instant-(.+?)\.yaml$/);
  const testId = testIdMatch ? testIdMatch[1] : '';

  const child = spawn(midsceneCmd, [tempFile, '--verbose'], {
    env: { ...process.env, MIDSCENE_DEBUG_AI_PROFILE: '1' },
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let stdout = '';
  let stderr = '';
  let lastScreenshotTime = 0;
  let hasSentFirstScreenshot = false;
  let lastScreenshotCount = 0;

  // 实时推送启动事件
  onData({
    type: 'start',
    data: { type, prompt, timestamp: Date.now() }
  });

  // 截图检测与推送函数
  const checkAndPushScreenshots = async (force: boolean = false) => {
    const now = Date.now();
    // 强制推送或距离上次检查超过1秒
    if (!force && now - lastScreenshotTime < 1000) {
      return;
    }

    const screenshots = await extractScreenshotsFromReport(testId);
    if (screenshots.length > 0) {
      // 始终推送最新的截图，确保前端显示最新状态
      const latestScreenshot = screenshots[screenshots.length - 1];

      // 只有当有新截图时才推送
      if (!hasSentFirstScreenshot || screenshots.length > lastScreenshotCount) {
        onData({
          type: 'screenshot',
          data: {
            image: latestScreenshot,
            index: screenshots.length,
            total: screenshots.length,
            timestamp: now,
            isNew: screenshots.length > lastScreenshotCount
          }
        });
        hasSentFirstScreenshot = true;
        lastScreenshotCount = screenshots.length;
        lastScreenshotTime = now;
      }
    }
  };

  // 定期检查并发送截图 - 提高检查频率到每800毫秒
  const screenshotInterval = setInterval(() => {
    checkAndPushScreenshots();
  }, 800);

  child.stdout?.on('data', (data) => {
    const chunk = data.toString();
    stdout += chunk;

    // 实时解析输出
    const lines = chunk.split('\n');
    for (const line of lines) {
      // 检测 AI 思考过程
      if (line.includes('planning') || line.includes('understanding')) {
        onData({
          type: 'thinking',
          data: { message: line.trim(), timestamp: Date.now() }
        });
      }

      // 检测步骤执行
      if (line.includes('executing') || line.includes('performing')) {
        onData({
          type: 'step',
          data: { message: line.trim(), timestamp: Date.now() }
        });
      }
    }
  });

  child.stderr?.on('data', (data) => {
    stderr += data.toString();

    // 实时推送错误/警告
    const chunk = data.toString();
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.trim()) {
        // 过滤网络警告
        if (!line.includes('failed to wait for network idle')) {
          onData({
            type: 'stderr',
            data: { message: line.trim(), timestamp: Date.now() }
          });
        }
      }
    }
  });

  child.on('close', async (code) => {
    clearInterval(screenshotInterval);

    // 最后获取一次截图（强制刷新）
    const screenshots = await extractScreenshotsFromReport(testId);

    if (screenshots.length > 0) {
      // 始终显示最新的截图（最后一张），确保用户看到的是操作完成后的最终页面
      const latestScreenshot = screenshots[screenshots.length - 1];

      // 推送最终截图
      onData({
        type: 'screenshot',
        data: {
          image: latestScreenshot,
          index: screenshots.length,
          total: screenshots.length,
          timestamp: Date.now(),
          isFinal: true
        }
      });
    }

    // 清理临时文件
    await fs.remove(tempFile).catch(() => {});

    const duration = Date.now() - startTime;

    // 解析执行结果
    const actionResult = parseAIInstantResult(stdout, stderr, type, prompt);

    // 推送最终结果
    onData({
      type: 'result',
      data: {
        success: code === 0 && actionResult.success,
        duration,
        type,
        prompt,
        action: actionResult.action,
        result: actionResult.result,
        error: actionResult.error,
        screenshots,
        stdout: stdout.substring(0, 2000),
        stderr: stderr.substring(0, 1000)
      }
    });

    onComplete();
  });

  child.on('error', async (error) => {
    clearInterval(screenshotInterval);
    await fs.remove(tempFile).catch(() => {});

    onData({
      type: 'error',
      data: {
        message: error.message,
        timestamp: Date.now()
      }
    });

    onComplete();
  });

  // 超时处理（2分钟）
  setTimeout(async () => {
    clearInterval(screenshotInterval);
    child.kill();
    await fs.remove(tempFile).catch(() => {});

    // 超时前获取最新截图
    const screenshots = await extractScreenshotsFromReport(testId);

    if (screenshots.length > 0) {
      const latestScreenshot = screenshots[screenshots.length - 1];
      onData({
        type: 'screenshot',
        data: {
          image: latestScreenshot,
          index: screenshots.length,
          total: screenshots.length,
          timestamp: Date.now(),
          isFinal: true
        }
      });
    }

    const duration = Date.now() - startTime;

    onData({
      type: 'result',
      data: {
        success: false,
        duration,
        type,
        prompt,
        action: type,
        error: '执行超时（2分钟）',
        screenshots
      }
    });

    onComplete();
  }, 2 * 60 * 1000);
}

// 解析 AI 即时操作结果
function parseAIInstantResult(
  stdout: string,
  stderr: string,
  type: string,
  prompt: string
) {
  const output = stdout + stderr;

  const result: {
    success: boolean;
    action: string;
    result?: any;
    error?: string;
    screenshot?: string;
  } = {
    success: true,
    action: type
  };

  // 提取查询结果
  if (type === 'query') {
    const resultMatch =
      output.match(/Query Result[:\s]+(.+?)(?=\n|$)/i) ||
      output.match(/Result[:\s]+({.+?})/i) ||
      output.match(/Data[:\s]+(.+?)(?=\n|$)/i);

    if (resultMatch) {
      try {
        result.result = JSON.parse(resultMatch[1].trim());
      } catch {
        result.result = resultMatch[1].trim();
      }
    }
  }

  // 提取断言结果
  if (type === 'assert') {
    if (output.includes('Assertion passed') || output.includes('✓')) {
      result.result = { passed: true, message: prompt };
    } else if (output.includes('Assertion failed') || output.includes('✗')) {
      result.success = false;
      result.error = '断言验证失败';
      result.result = { passed: false, message: prompt };
    }
  }

  // 检查是否有错误（排除警告）
  const errorPatterns = [
    /Error:\s*(.+)/i,
    /Failed:\s*(.+)/i,
    /Exception:\s*(.+)/i
  ];

  for (const pattern of errorPatterns) {
    const match = output.match(pattern);
    if (match && !output.includes('but the script will continue')) {
      result.error = match[1].trim();
      result.success = false;
      break;
    }
  }

  // 网络警告不是致命错误
  if (output.includes('failed to wait for network idle')) {
    result.success = true;
    if (!result.error) {
      result.error = undefined;
    }
  }

  // 提取截图路径（如果生成）
  const screenshotMatch = output.match(/Screenshot[:\s]+(.+?)(?=\n|$)/i) ||
                          output.match(/screenshot saved[:\s]+(.+?)(?=\n|$)/i);
  if (screenshotMatch) {
    result.screenshot = screenshotMatch[1].trim();
  }

  return result;
}

// 提取错误信息，过滤警告
function extractErrorMessage(stderr: string, stdout: string): string | undefined {
  const output = stderr || stdout;
  if (!output) return undefined;

  // 定义常见的警告模式（这些不是致命错误）
  const warningPatterns = [
    /failed to wait for network idle after \d+ms/i,
    /waiting for.*timeout \d+ms/i,
    /Navigation failed because browser has disconnected/i,
    /net::ERR_/i
  ];

  const lines = output.split('\n').filter((line) => line.trim());

  // 查找真正的错误行
  for (const line of lines) {
    // 跳过警告
    if (warningPatterns.some((pattern) => pattern.test(line))) {
      continue;
    }

    // 识别错误关键词
    if (
      /error|failed|exception/i.test(line) &&
      !line.includes('but the script will continue')
    ) {
      return line.trim();
    }
  }

  // 如果只包含警告，不返回错误
  if (
    output.includes('but the script will continue') ||
    output.includes('network idle')
  ) {
    return undefined;
  }

  // 限制长度
  const trimmed = output.substring(0, 500);
  return trimmed.length < output.length ? trimmed + '...' : trimmed;
}

// 验证 YAML 脚本
function validateYamlScript(script: YamlScript): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 检查环境配置
  const hasEnv = script.web || script.android || script.ios || script.computer;
  if (!hasEnv) {
    errors.push('缺少环境配置 (web/android/ios/computer)');
  }

  if (script.web) {
    if (!script.web.url) {
      errors.push('web.url 是必填项');
    }
  }

  // 检查任务
  if (!script.tasks || !Array.isArray(script.tasks) || script.tasks.length === 0) {
    errors.push('tasks 数组不能为空');
  } else {
    script.tasks.forEach((task, index) => {
      if (!task.name) {
        errors.push(`Task #${index + 1} 缺少 name`);
      }
      if (!task.flow || !Array.isArray(task.flow) || task.flow.length === 0) {
        errors.push(`Task "${task.name || `#${index + 1}`}" 缺少 flow`);
      }
    });
  }

  // 警告
  if (script.agent?.generateReport === false) {
    warnings.push('generateReport 设置为 false，将不会生成详细报告');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// 获取 Playground 模板
router.get('/templates', async (req, res) => {
  try {
    const templates = [
      {
        id: 'web-search',
        name: '网页搜索测试',
        description: '基础的网页搜索测试模板',
        content: `web:
  url: https://www.bing.com
  viewportWidth: 1280
  viewportHeight: 720

tasks:
  - name: 搜索好买基金
    flow:
      - ai: 搜索 "好买基金"
      - sleep: 3000

  - name: 检查结果
    flow:
      - aiAssert: 结果是否包含 "好买基金"  
`
      }
    ];

    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as PlaygroundRoutes };
