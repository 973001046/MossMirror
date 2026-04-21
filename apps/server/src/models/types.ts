// YAML Flow 步骤类型
export type FlowStep =
  | { ai: string; deepThink?: boolean }
  | { aiTap: string; deepThink?: boolean; locate?: any }
  | { aiInput: { prompt: string; content: string }; deepThink?: boolean }
  | { aiHover: string; deepThink?: boolean }
  | { aiScroll: { direction: 'up' | 'down' | 'left' | 'right'; distance?: number }; deepThink?: boolean }
  | { aiDoubleClick: string; deepThink?: boolean }
  | { aiRightClick: string; deepThink?: boolean }
  | { aiQuery: { name: string; prompt: string }; deepThink?: boolean }
  | { aiAssert: string; deepThink?: boolean }
  | { aiWaitFor: string; timeout?: number; deepThink?: boolean }
  | { sleep: number }
  | { runAdbShell: string }
  | { runWdaRequest: any };

// YAML 任务定义
export interface Task {
  name: string;
  flow: FlowStep[];
}

// YAML Web 配置
export interface WebConfig {
  url: string;
  userAgent?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  bridgeMode?: boolean;
  cookie?: string;
}

// YAML Agent 配置
export interface AgentConfig {
  testId?: string;
  generateReport?: boolean;
  aiActContext?: string;
  cache?: boolean;
  [key: string]: any;
}

// 完整 YAML 脚本结构
export interface YamlScript {
  web?: WebConfig;
  android?: any;
  ios?: any;
  computer?: any;
  agent?: AgentConfig;
  tasks: Task[];
}

// 脚本元数据
export interface ScriptMeta {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  runCount: number;
  status: 'idle' | 'running' | 'success' | 'failed';
  filePath: string;
}

// 执行结果
export interface ExecuteResult {
  success: boolean;
  duration: number;
  steps: StepResult[];
  error?: string;
  screenshot?: string;
  reportPath?: string;
}

// 步骤执行结果
export interface StepResult {
  step: number;
  type: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  duration: number;
  error?: string;
  screenshot?: string;
  data?: any;
}

// 测试报告
export interface TestReport {
  id: string;
  name: string;
  scriptId: string;
  scriptName: string;
  status: 'success' | 'failed' | 'partial';
  startTime: string;
  endTime: string;
  duration: number;
  results: ExecuteResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    steps: {
      total: number;
      passed: number;
      failed: number;
    };
  };
  reportPath: string;
}

// 批量执行配置
export interface BatchConfig {
  id: string;
  name: string;
  description?: string;
  scriptIds: string[];
  parallel: boolean;
  maxConcurrency?: number;
  stopOnError: boolean;
  createdAt: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
}

// WebSocket 消息类型
export type WebSocketMessage =
  | { type: 'step:start'; data: StepResult }
  | { type: 'step:end'; data: StepResult }
  | { type: 'task:start'; data: { taskIndex: number; taskName: string } }
  | { type: 'task:end'; data: { taskIndex: number; taskName: string; success: boolean } }
  | { type: 'execute:start'; data: { scriptId: string; scriptName: string } }
  | { type: 'execute:end'; data: ExecuteResult }
  | { type: 'error'; data: { message: string } }
  | { type: 'screenshot'; data: { path: string; timestamp: number } };
