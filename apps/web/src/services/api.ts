import axios from 'axios';

/// <reference types="vite/client" />
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 脚本 API
export const scriptApi = {
  // 获取所有脚本
  getAll: () => api.get('/scripts'),

  // 获取单个脚本
  getById: (id: string) => api.get(`/scripts/${id}`),

  // 创建脚本
  create: (data: {
    name: string;
    content: any;
    description?: string;
    tags?: string[];
  }) => api.post('/scripts', data),

  // 更新脚本
  update: (
    id: string,
    data: {
      name?: string;
      content?: any;
      description?: string;
      tags?: string[];
    }
  ) => api.put(`/scripts/${id}`, data),

  // 删除脚本
  delete: (id: string) => api.delete(`/scripts/${id}`),

  // 导入 YAML
  import: (file: File, name?: string, description?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);
    if (description) formData.append('description', description);

    return axios.post(`${API_BASE_URL}/scripts/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // 导出 YAML
  export: (id: string) =>
    window.open(`${API_BASE_URL}/scripts/${id}/export`, '_blank')
};

// 报告 API
export const reportApi = {
  // 获取所有报告
  getAll: () => api.get('/reports'),

  // 获取单个报告
  getById: (id: string) => api.get(`/reports/${id}`),

  // 获取报告 HTML
  getHtml: (id: string) => api.get(`/reports/${id}/html`),

  // 获取某脚本的报告
  getByScript: (scriptId: string) => api.get(`/reports/script/${scriptId}`),

  // 删除报告
  delete: (id: string) => api.delete(`/reports/${id}`),

  // 获取统计信息
  getStats: () => api.get('/reports/stats/overview')
};

// AI 执行报告 API
export const executionReportApi = {
  // 获取所有 AI 执行报告（支持过滤）
  getAll: (params?: { startDate?: string; endDate?: string; status?: string; executionMode?: string }) =>
    api.get('/execution-reports', { params }),

  // 获取单个报告
  getById: (id: string) => api.get(`/execution-reports/${id}`),

  // 获取报告 HTML
  getHtml: (id: string) => api.get(`/execution-reports/${id}/html`),

  // 删除报告
  delete: (id: string) => api.delete(`/execution-reports/${id}`),

  // 获取统计信息
  getStats: () => api.get('/execution-reports/stats/overview')
};

// 执行 API
export const executeApi = {
  // 执行单个脚本
  execute: (scriptId: string, onProgress?: (data: any) => void) => {
    if (onProgress) {
      // 使用 SSE 获取实时进度
      const eventSource = new EventSource(
        `${API_BASE_URL}/execute/${scriptId}`,
        { withCredentials: false }
      );

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'done') {
          eventSource.close();
        }
        onProgress(data);
      };

      eventSource.onerror = () => {
        eventSource.close();
      };

      return () => eventSource.close();
    }

    return api.post(`/execute/${scriptId}`);
  },

  // 批量执行
  batchExecute: (
    data: {
      scriptIds: string[];
      parallel?: boolean;
      maxConcurrency?: number;
      stopOnError?: boolean;
      name?: string;
    },
    onProgress?: (data: any) => void
  ) => {
    if (onProgress) {
      const eventSource = new EventSource(
        `${API_BASE_URL}/execute/batch/run`,
        { withCredentials: false }
      );

      // 由于 SSE 不能直接 POST，我们需要先建立连接，再发送数据
      // 实际实现中可能需要 WebSocket 或轮询
      api.post('/execute/batch/run', data);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'report') {
          eventSource.close();
        }
        onProgress(data);
      };

      return () => eventSource.close();
    }

    return api.post('/execute/batch/run', data);
  }
};

// Playground API
export const playgroundApi = {
  // 预览 YAML
  preview: (content: string) =>
    api.post('/playground/preview', { content }),

  // 快速运行
  run: (content: string) =>
    api.post('/playground/run', { content }),

  // 获取模板
  getTemplates: () => api.get('/playground/templates'),

  // AI 即时操作 (Chrome 插件风格)
  aiInstantAction: (data: {
    url: string;
    type: string;
    prompt: string;
    content?: string;
    deepThink?: boolean;
    viewport?: { width: number; height: number };
  }) => api.post('/playground/ai-instant', data)
};

export default api;
