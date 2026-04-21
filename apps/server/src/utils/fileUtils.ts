import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 目录路径
export const PATHS = {
  scripts: path.join(__dirname, '../../../../scripts'),
  reports: path.join(__dirname, '../../../../reports'),
  data: path.join(__dirname, '../../../../data'),
  temp: path.join(__dirname, '../../../../temp')
};

// 确保必要目录存在
export function ensureDirectories(): void {
  Object.values(PATHS).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// 生成唯一ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// 安全文件名
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9\u4e00-\u9fa5-_]/gi, '_').toLowerCase();
}
