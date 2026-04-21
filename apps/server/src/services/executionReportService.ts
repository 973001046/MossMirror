import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// AI 执行报告目录
const AI_REPORT_DIR = path.join(__dirname, '../../midscene_run/report');
const OUTPUT_DIR = path.join(__dirname, '../../midscene_run/output');

// 执行方式类型
export type ExecutionMode = 'ai-instant' | 'playground';

// AI 执行报告接口
export interface AIExecutionReport {
  id: string;
  filename: string;
  reportPath: string;
  executionTime: string;
  timestamp: number;
  status: 'success' | 'failed' | 'unknown';
  prompt: string;
  duration?: number;
  url?: string;
  executionMode: ExecutionMode;
  output?: string;
}

// 查询过滤参数
export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  status?: string;
  executionMode?: ExecutionMode | 'all';
}

// 解析文件名提取信息
// 格式: ai-instant-{timestamp}-{random}.html 或 playground-{timestamp}-{random}.html
function parseFilename(filename: string): { timestamp: number; id: string; executionMode: ExecutionMode } | null {
  // 匹配 ai-instant 格式
  const aiInstantMatch = filename.match(/ai-instant-(\d+)-([a-z0-9]+)\.html$/);
  if (aiInstantMatch) {
    const timestamp = parseInt(aiInstantMatch[1], 10);
    const id = aiInstantMatch[2];
    return { timestamp, id, executionMode: 'ai-instant' };
  }

  // 匹配 playground 格式
  const playgroundMatch = filename.match(/playground-(\d+)-([a-z0-9]+)\.html$/);
  if (playgroundMatch) {
    const timestamp = parseInt(playgroundMatch[1], 10);
    const id = playgroundMatch[2];
    return { timestamp, id, executionMode: 'playground' };
  }

  return null;
}

// 从 output 目录查找对应的 summary 文件获取更多信息
async function findSummaryInfo(timestamp: number, executionMode: ExecutionMode): Promise<{
  status: 'success' | 'failed' | 'unknown';
  prompt: string;
  duration?: number;
  url?: string;
  output?: string;
}> {
  try {
    // 查找对应的 summary 文件
    const files = await fs.readdir(OUTPUT_DIR);
    const summaryFiles = files.filter(f => f.startsWith('summary-') && f.endsWith('.json'));

    const prefix = executionMode === 'ai-instant' ? `ai-instant-${timestamp}` : `playground-${timestamp}`;

    for (const summaryFile of summaryFiles) {
      const summaryPath = path.join(OUTPUT_DIR, summaryFile);
      try {
        const summary = await fs.readJson(summaryPath);

        // 检查 results 中是否有匹配的报告
        if (summary.results && Array.isArray(summary.results)) {
          for (const result of summary.results) {
            if (result.report && result.report.includes(prefix)) {
              // 尝试从对应的 YAML 文件读取 prompt
              const yamlPath = result.script;
              let prompt = executionMode === 'ai-instant' ? 'AI 即时操作' : 'YAML 脚本执行';

              if (yamlPath && await fs.pathExists(yamlPath)) {
                try {
                  const yamlContent = await fs.readFile(yamlPath, 'utf-8');
                  // 从 YAML 中提取第一个 AI 操作的提示词
                  const aiMatch = yamlContent.match(/ai:\s*(.+)/);
                  const aiTapMatch = yamlContent.match(/aiTap:\s*(.+)/);
                  const aiInputMatch = yamlContent.match(/aiInput:[\s\S]*?prompt:\s*(.+)/);

                  if (aiMatch) prompt = aiMatch[1].trim();
                  else if (aiTapMatch) prompt = aiTapMatch[1].trim();
                  else if (aiInputMatch) prompt = aiInputMatch[1].trim();

                  // 截取前 50 个字符
                  if (prompt.length > 50) {
                    prompt = prompt.substring(0, 50) + '...';
                  }
                } catch (e) {
                  // 忽略 YAML 读取错误
                }
              }

              // 读取 output 文件内容
              let outputContent: string | undefined;
              if (result.output) {
                try {
                  const outputPath = path.join(OUTPUT_DIR, result.output);
                  if (await fs.pathExists(outputPath)) {
                    const outputData = await fs.readJson(outputPath);
                    // 提取 output 数据，通常是对象格式，取第一个值的内容
                    if (typeof outputData === 'object' && outputData !== null) {
                      const values = Object.values(outputData);
                      if (values.length > 0) {
                        const firstValue = values[0] as any;
                        if (typeof firstValue === 'object') {
                          // 尝试提取 thought 或 pass 字段
                          if (firstValue.thought) {
                            outputContent = firstValue.thought;
                          } else if (firstValue.pass !== undefined) {
                            outputContent = firstValue.pass ? '通过' : '未通过';
                          }
                        } else {
                          outputContent = String(firstValue);
                        }
                      }
                    } else {
                      outputContent = String(outputData);
                    }
                    // 限制长度
                    if (outputContent && outputContent.length > 100) {
                      outputContent = outputContent.substring(0, 100) + '...';
                    }
                  }
                } catch (e) {
                  // 忽略 output 读取错误
                }
              }

              return {
                status: result.success ? 'success' : 'failed',
                prompt,
                duration: result.duration,
                url: undefined,
                output: outputContent
              };
            }
          }
        }
      } catch (e) {
        // 忽略读取错误
      }
    }
  } catch (e) {
    // 目录不存在或其他错误
  }

  return {
    status: 'unknown',
    prompt: executionMode === 'ai-instant' ? 'AI 即时操作' : 'YAML 脚本执行'
  };
}

// 获取所有 AI 执行报告（支持过滤）
export async function getAllAIExecutionReports(filter?: ReportFilter): Promise<AIExecutionReport[]> {
  try {
    if (!await fs.pathExists(AI_REPORT_DIR)) {
      return [];
    }

    const files = await fs.readdir(AI_REPORT_DIR);
    // 支持 ai-instant-*.html 和 playground-*.html 两种格式
    const htmlFiles = files.filter(f =>
      (f.startsWith('ai-instant-') || f.startsWith('playground-')) && f.endsWith('.html')
    );

    const reports: AIExecutionReport[] = [];

    // 解析过滤参数
    const startTimestamp = filter?.startDate ? new Date(filter.startDate).getTime() : undefined;
    const endTimestamp = filter?.endDate ? new Date(filter.endDate).getTime() + 24 * 60 * 60 * 1000 - 1 : undefined; // 包含结束日期整天
    const statusFilter = filter?.status;
    const executionModeFilter = filter?.executionMode;

    for (const filename of htmlFiles) {
      const parsed = parseFilename(filename);
      if (!parsed) continue;

      const { timestamp, id, executionMode } = parsed;

      // 执行方式过滤
      if (executionModeFilter && executionModeFilter !== 'all' && executionMode !== executionModeFilter) continue;

      // 时间过滤
      if (startTimestamp && timestamp < startTimestamp) continue;
      if (endTimestamp && timestamp > endTimestamp) continue;

      const reportPath = path.join(AI_REPORT_DIR, filename);

      // 获取额外的 summary 信息
      const summaryInfo = await findSummaryInfo(timestamp, executionMode);

      // 状态过滤
      if (statusFilter && summaryInfo.status !== statusFilter) continue;

      reports.push({
        id: `${timestamp}-${id}`,
        filename,
        reportPath,
        executionTime: new Date(timestamp).toISOString(),
        timestamp,
        status: summaryInfo.status,
        prompt: summaryInfo.prompt,
        duration: summaryInfo.duration,
        executionMode,
        output: summaryInfo.output
      });
    }

    // 按时间戳倒序排列（最新的在前）
    return reports.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error reading AI reports:', error);
    return [];
  }
}

// 获取单个 AI 执行报告
export async function getAIExecutionReport(id: string): Promise<AIExecutionReport | null> {
  const reports = await getAllAIExecutionReports();
  return reports.find(r => r.id === id) || null;
}

// 获取报告 HTML 内容
export async function getAIReportHtml(id: string): Promise<string | null> {
  const report = await getAIExecutionReport(id);
  if (!report || !report.reportPath) return null;

  if (await fs.pathExists(report.reportPath)) {
    return fs.readFile(report.reportPath, 'utf-8');
  }

  return null;
}

// 删除 AI 执行报告
export async function deleteAIExecutionReport(id: string): Promise<boolean> {
  const report = await getAIExecutionReport(id);
  if (!report) return false;

  // 删除 HTML 文件
  if (report.reportPath && await fs.pathExists(report.reportPath)) {
    await fs.remove(report.reportPath);
  }

  return true;
}

// 获取统计信息
export async function getAIExecutionStatistics(): Promise<{
  total: number;
  success: number;
  failed: number;
  recentActivity: Array<{ date: string; count: number }>;
}> {
  const reports = await getAllAIExecutionReports();

  const success = reports.filter(r => r.status === 'success').length;
  const failed = reports.filter(r => r.status === 'failed').length;

  // 统计最近7天的活动
  const now = new Date();
  const recentActivity = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const count = reports.filter(r => r.executionTime.startsWith(dateStr)).length;
    recentActivity.push({ date: dateStr, count });
  }

  return {
    total: reports.length,
    success,
    failed,
    recentActivity
  };
}
