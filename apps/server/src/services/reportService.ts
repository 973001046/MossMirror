import fs from 'fs-extra';
import path from 'path';
import { PATHS } from '../utils/fileUtils.js';
import { TestReport } from '../models/types.js';

const REPORTS_META_FILE = path.join(PATHS.data, 'reports-meta.json');

// 获取所有报告元数据
export async function getAllReports(): Promise<TestReport[]> {
  if (!fs.existsSync(REPORTS_META_FILE)) {
    return [];
  }
  const data = await fs.readJson(REPORTS_META_FILE);
  return data.reports || [];
}

// 保存报告元数据
async function saveReportsMeta(reports: TestReport[]): Promise<void> {
  await fs.ensureDir(PATHS.data);
  await fs.writeJson(REPORTS_META_FILE, { reports }, { spaces: 2 });
}

// 保存报告
export async function saveReport(report: TestReport): Promise<void> {
  const reports = await getAllReports();

  // 查找是否已存在
  const index = reports.findIndex(r => r.id === report.id);
  if (index >= 0) {
    reports[index] = report;
  } else {
    reports.unshift(report); // 新报告放前面
  }

  // 限制保存的报告数量（保留最近100个）
  const trimmedReports = reports.slice(0, 100);

  await saveReportsMeta(trimmedReports);
}

// 获取单个报告
export async function getReport(id: string): Promise<TestReport | null> {
  const reports = await getAllReports();
  return reports.find(r => r.id === id) || null;
}

// 删除报告
export async function deleteReport(id: string): Promise<boolean> {
  const reports = await getAllReports();
  const index = reports.findIndex(r => r.id === id);
  if (index === -1) return false;

  const report = reports[index];

  // 删除报告文件
  if (report.reportPath && fs.existsSync(report.reportPath)) {
    await fs.remove(report.reportPath);
  }

  // 删除元数据
  reports.splice(index, 1);
  await saveReportsMeta(reports);

  return true;
}

// 获取报告HTML内容
export async function getReportHtml(id: string): Promise<string | null> {
  const report = await getReport(id);
  if (!report || !report.reportPath) return null;

  if (fs.existsSync(report.reportPath)) {
    return fs.readFile(report.reportPath, 'utf-8');
  }

  return null;
}

// 获取某脚本的执行历史
export async function getScriptReports(scriptId: string): Promise<TestReport[]> {
  const reports = await getAllReports();
  return reports.filter(r => r.scriptId === scriptId);
}

// 获取统计信息
export async function getStatistics(): Promise<{
  totalScripts: number;
  totalReports: number;
  totalExecutions: number;
  passRate: number;
  recentActivity: Array<{ date: string; count: number }>;
}> {
  const reports = await getAllReports();

  const totalExecutions = reports.length;
  const passedExecutions = reports.filter(r => r.status === 'success').length;
  const passRate = totalExecutions > 0 ? (passedExecutions / totalExecutions) * 100 : 0;

  // 统计最近7天的活动
  const now = new Date();
  const recentActivity = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const count = reports.filter(r => r.startTime.startsWith(dateStr)).length;
    recentActivity.push({ date: dateStr, count });
  }

  return {
    totalScripts: 0, // 由调用方填充
    totalReports: reports.length,
    totalExecutions,
    passRate: Math.round(passRate * 100) / 100,
    recentActivity
  };
}
