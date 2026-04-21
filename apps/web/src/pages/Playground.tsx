import React, { useEffect, useState, useRef } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  message,
  Select,
  Tabs,
  List,
  Tag,
  Typography,
  Badge,
  Input,
  Timeline,
  Avatar,
  Divider,
  Tooltip,
  Empty,
  Radio,
  Collapse
} from 'antd';
import {
  PlayCircleOutlined,
  SaveOutlined,
  CopyOutlined,
  ClearOutlined,
  CodeOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  RobotOutlined,
  SendOutlined,
  DeleteOutlined,
  EyeOutlined,
  GlobalOutlined,
  FormOutlined,
  SearchOutlined,
  CheckSquareOutlined,
  DownOutlined,
  HistoryOutlined,
  AimOutlined
} from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import yaml from 'js-yaml';
import { playgroundApi, scriptApi } from '../services/api';

const { Text } = Typography;
const { Group: RadioGroup } = Radio;

// 操作类型定义
interface AIAction {
  id: string;
  type: 'action' | 'tap' | 'input' | 'scroll' | 'query' | 'assert' | 'wait';
  prompt: string;
  content?: string;
  result?: any;
  status: 'pending' | 'running' | 'success' | 'failed';
  duration?: number;
  error?: string;
  screenshot?: string;
  timestamp: number;
  stdout?: string;
  stderr?: string;
  realtimePreview?: boolean;
}

interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
}

interface StepResult {
  step: number;
  type: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  duration: number;
  error?: string;
}

// Midscene Chrome Extension Playground 风格界面
const Playground: React.FC = () => {
  // === YAML 脚本编辑模式状态 ===
  const [content, setContent] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [executing, setExecuting] = useState(false);
  const [validation, setValidation] = useState<any>(null);
  const [executionLog, setExecutionLog] = useState<StepResult[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<string | null>(null);

  // === AI 即时交互模式状态 (Chrome 插件风格) ===
  const [activeTab, setActiveTab] = useState('ai');
  const [targetUrl, setTargetUrl] = useState('https://www.bing.com');
  const [actions, setActions] = useState<AIAction[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentActionType, setCurrentActionType] = useState<AIAction['type']>('action');
  const [isProcessing, setIsProcessing] = useState(false);
  const [deepThink, setDeepThink] = useState(false);
  const [viewport, setViewport] = useState({ width: 1280, height: 720 });
  const actionListRef = useRef<HTMLDivElement>(null);

  // === 实时预览状态 ===
  const [realtimePreview, setRealtimePreview] = useState(true);
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null);
  const [previewStatus, setPreviewStatus] = useState<string>('');
  const eventSourceRef = useRef<EventSource | null>(null);

  // 加载模板
  useEffect(() => {
    loadTemplates();
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    if (actionListRef.current) {
      actionListRef.current.scrollTop = actionListRef.current.scrollHeight;
    }
  }, [actions]);

  // 清理 EventSource
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const loadTemplates = async () => {
    try {
      const res = (await playgroundApi.getTemplates()) as {
        success: boolean;
        data: Template[];
      };
      if (res.success) {
        setTemplates(res.data);
        if (res.data.length > 0) {
          handleSelectTemplate(res.data[0].id);
        }
      }
    } catch (error) {
      message.error('加载模板失败');
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setContent(template.content);
      setCurrentTemplate(templateId);
      validateContent(template.content);
    }
  };

  const validateContent = async (yamlContent: string) => {
    try {
      const res = (await playgroundApi.preview(yamlContent)) as {
        success: boolean;
        data: any;
      };
      if (res.success) {
        setValidation(res.data);
      }
    } catch (error) {
      // 忽略错误
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
      setCurrentTemplate(null);
      setTimeout(() => validateContent(value), 500);
    }
  };

  const handleExecute = async () => {
    if (!validation?.valid) {
      message.error('YAML 格式有误，请先修正');
      return;
    }

    try {
      setExecuting(true);
      setExecutionLog([]);
      message.loading({ content: '执行中...', key: 'exec', duration: 0 });

      const res = (await playgroundApi.run(content)) as {
        success: boolean;
        data: any;
      };

      if (res.success) {
        const { data } = res.data;
        message.destroy('exec');

        if (data.success) {
          message.success('执行成功');
        } else {
          message.error(`执行失败: ${data.error || '未知错误'}`);
        }

        if (data.output) {
          const logs = parseExecutionLog(data.output);
          setExecutionLog(logs);
        }
      }
    } catch (error) {
      message.error('执行失败');
    } finally {
      setExecuting(false);
    }
  };

  const parseExecutionLog = (output: string): StepResult[] => {
    const logs: StepResult[] = [];
    const lines = output.split('\n');
    let stepNum = 0;

    lines.forEach((line) => {
      const taskMatch = line.match(/Task:\s*(.+)/i);
      if (taskMatch) {
        stepNum++;
        logs.push({
          step: stepNum,
          type: 'task',
          description: taskMatch[1].trim(),
          status: 'running',
          duration: 0
        });
      }

      const stepMatch = line.match(/Step\s*(\d+):\s*(.+)/i);
      if (stepMatch) {
        stepNum = parseInt(stepMatch[1]);
        logs.push({
          step: stepNum,
          type: stepMatch[2].trim(),
          description: '执行中',
          status: 'running',
          duration: 0
        });
      }

      if (line.includes('✓') || line.includes('Success')) {
        const lastLog = logs[logs.length - 1];
        if (lastLog) {
          lastLog.status = 'success';
        }
      }

      if (line.includes('✗') || line.includes('Error') || line.includes('Failed')) {
        const lastLog = logs[logs.length - 1];
        if (lastLog) {
          lastLog.status = 'failed';
          lastLog.error = line;
        }
      }
    });

    return logs;
  };

  const handleSave = async () => {
    try {
      let parsed;
      try {
        parsed = yaml.load(content);
      } catch (e) {
        message.error('YAML 格式错误');
        return;
      }

      const name =
        templates.find((t) => t.id === currentTemplate)?.name || 'Playground 脚本';

      const res = (await scriptApi.create({
        name: `${name} (来自Playground)`,
        content: parsed,
        description: '从 Playground 保存的脚本'
      })) as { success: boolean };

      if (res.success) {
        message.success('保存成功');
      }
    } catch (error) {
      message.error('保存失败');
    }
  };

  const handleClear = () => {
    setContent('');
    setValidation(null);
    setExecutionLog([]);
    setCurrentTemplate(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    message.success('已复制到剪贴板');
  };

  // === AI 即时交互功能 (Chrome 插件风格) ===

  // 执行单个 AI 操作（支持流式预览）
  const executeAIAction = async () => {
    if (!currentInput.trim()) {
      message.warning('请输入指令');
      return;
    }

    const action: AIAction = {
      id: Date.now().toString(),
      type: currentActionType,
      prompt: currentInput,
      status: 'running',
      timestamp: Date.now(),
      realtimePreview
    };

    setActions((prev) => [...prev, action]);
    setIsProcessing(true);
    setCurrentScreenshot(null);
    setPreviewStatus('');
    setCurrentInput('');

    // 如果开启实时预览，使用 SSE 模式
    if (realtimePreview) {
      executeWithStream(action);
    } else {
      executeWithoutStream(action);
    }
  };

  // 流式执行（带实时预览）
  const executeWithStream = (action: AIAction) => {
    const params = new URLSearchParams({
      url: targetUrl,
      type: currentActionType,
      prompt: action.prompt,
      deepThink: deepThink.toString(),
      viewportWidth: viewport.width.toString(),
      viewportHeight: viewport.height.toString()
    });

    if (currentActionType === 'input') {
      params.append('content', action.prompt);
    }

    const eventSource = new EventSource(
      `/api/playground/ai-instant-stream?${params.toString()}`
    );
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'start':
          setPreviewStatus('开始执行...');
          break;

        case 'thinking':
          setPreviewStatus(`AI 思考中: ${data.data.message}`);
          break;

        case 'step':
          setPreviewStatus(`执行步骤: ${data.data.message}`);
          break;

        case 'screenshot':
          if (data.data.image) {
            setCurrentScreenshot(data.data.image);
            if (data.data.isFinal) {
              setPreviewStatus('执行完成 - 最终截图');
            } else if (data.data.isNew) {
              setPreviewStatus(`截图更新 (第 ${data.data.index} 张)`);
            } else {
              setPreviewStatus('截图已生成');
            }
          }
          break;

        case 'stderr':
          break;

        case 'result':
          setPreviewStatus(data.data.success ? '执行完成' : '执行失败');

          // 更新操作结果
          // 构建详细错误信息
          let detailedError = data.data.error;
          if (!data.data.success && data.data.stderr) {
            // 如果有 stderr，追加到错误信息中
            const stderrPreview = data.data.stderr.substring(0, 500);
            if (stderrPreview && !detailedError?.includes(stderrPreview)) {
              detailedError = detailedError
                ? `${detailedError}\n\n执行日志:\n${stderrPreview}`
                : `执行日志:\n${stderrPreview}`;
            }
          }
          // 如果有 stdout 且包含错误信息，也追加
          if (!data.data.success && data.data.stdout && data.data.stdout.includes('Error')) {
            const errorLines = data.data.stdout
              .split('\n')
              .filter((line: string) =>
                line.includes('Error') ||
                line.includes('Failed') ||
                line.includes('failed')
              )
              .slice(0, 5)
              .join('\n');
            if (errorLines && !detailedError?.includes(errorLines)) {
              detailedError = detailedError
                ? `${detailedError}\n\n错误输出:\n${errorLines}`
                : `错误输出:\n${errorLines}`;
            }
          }

          setActions((prev) =>
            prev.map((a) =>
              a.id === action.id
                ? {
                    ...a,
                    status: data.data.success ? 'success' : 'failed',
                    result: data.data.result,
                    duration: data.data.duration,
                    error: detailedError || data.data.error,
                    screenshot: data.data.screenshots?.[data.data.screenshots.length - 1]
                  }
                : a
            )
          );

          if (data.data.success) {
            message.success('执行成功');
          } else {
            message.error(data.data.error || '执行失败');
          }
          break;

        case 'error':
          setActions((prev) =>
            prev.map((a) =>
              a.id === action.id
                ? { ...a, status: 'failed', error: data.data.message }
                : a
            )
          );
          setPreviewStatus('执行出错');
          message.error(data.data.message);
          break;

        case 'done':
          setIsProcessing(false);
          eventSource.close();
          break;
      }
    };

    eventSource.onerror = () => {
      setActions((prev) =>
        prev.map((a) =>
          a.id === action.id
            ? { ...a, status: 'failed', error: '连接中断' }
            : a
        )
      );
      setPreviewStatus('连接中断');
      setIsProcessing(false);
      eventSource.close();
      message.error('实时连接中断');
    };
  };

  // 非流式执行（原始模式）
  const executeWithoutStream = async (action: AIAction) => {
    try {
      const res = (await playgroundApi.aiInstantAction({
        url: targetUrl,
        type: currentActionType,
        prompt: action.prompt,
        content: currentActionType === 'input' ? action.prompt : undefined,
        deepThink,
        viewport
      })) as { success: boolean; data: any };

      if (res.success) {
        // 构建详细错误信息
        let detailedError = res.data.error || '';
        if (!res.data.success && res.data.stderr) {
          detailedError += `\n\n执行日志:\n${res.data.stderr}`;
        }
        if (!res.data.success && res.data.stdout) {
          detailedError += `\n\n错误输出:\n${res.data.stdout}`;
        }

        setActions((prev) =>
          prev.map((a) =>
            a.id === action.id
              ? {
                  ...a,
                  status: res.data.success ? 'success' : 'failed',
                  result: res.data.result,
                  duration: res.data.duration,
                  error: detailedError || res.data.error,
                  screenshot: res.data.screenshot,
                  stdout: res.data.stdout,
                  stderr: res.data.stderr
                }
              : a
          )
        );

        if (res.data.success) {
          message.success('执行成功');
        } else {
          message.error(res.data.error || '执行失败');
        }
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error
        || error?.message
        || '网络请求失败，请检查服务器状态';

      setActions((prev) =>
        prev.map((a) =>
          a.id === action.id
            ? { ...a, status: 'failed', error: errorMessage }
            : a
        )
      );
      message.error(`执行失败: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 清空所有操作
  const clearAllActions = () => {
    setActions([]);
    message.success('已清空历史记录');
  };

  // 删除单个操作
  const deleteAction = (id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  };

  // 重新执行操作
  const reExecuteAction = async (action: AIAction) => {
    const newAction: AIAction = {
      ...action,
      id: Date.now().toString(),
      status: 'running',
      timestamp: Date.now(),
      result: undefined,
      error: undefined,
      realtimePreview
    };

    setActions((prev) => [...prev, newAction]);
    setIsProcessing(true);

    try {
      const res = (await playgroundApi.aiInstantAction({
        url: targetUrl,
        type: action.type,
        prompt: action.prompt,
        content: action.content,
        deepThink,
        viewport
      })) as { success: boolean; data: any };

      if (res.success) {
        // 构建详细错误信息
        let detailedError = res.data.error || '';
        if (!res.data.success && res.data.stderr) {
          detailedError += `\n\n执行日志:\n${res.data.stderr}`;
        }
        if (!res.data.success && res.data.stdout) {
          detailedError += `\n\n错误输出:\n${res.data.stdout}`;
        }

        setActions((prev) =>
          prev.map((a) =>
            a.id === newAction.id
              ? {
                  ...a,
                  status: res.data.success ? 'success' : 'failed',
                  result: res.data.result,
                  duration: res.data.duration,
                  error: detailedError || res.data.error,
                  screenshot: res.data.screenshot,
                  stdout: res.data.stdout,
                  stderr: res.data.stderr
                }
              : a
          )
        );
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error
        || error?.message
        || '执行出错';
      setActions((prev) =>
        prev.map((a) =>
          a.id === newAction.id ? { ...a, status: 'failed', error: errorMessage } : a
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // 获取操作类型图标
  const getActionIcon = (type: AIAction['type']) => {
    switch (type) {
      case 'action':
        return <RobotOutlined />;
      case 'tap':
        return <AimOutlined />;
      case 'input':
        return <FormOutlined />;
      case 'scroll':
        return <DownOutlined />;
      case 'query':
        return <SearchOutlined />;
      case 'assert':
        return <CheckSquareOutlined />;
      case 'wait':
        return <HistoryOutlined />;
      default:
        return <RobotOutlined />;
    }
  };

  // 获取操作类型颜色
  const getActionColor = (type: AIAction['type']) => {
    switch (type) {
      case 'action':
        return 'purple';
      case 'tap':
        return 'blue';
      case 'input':
        return 'green';
      case 'scroll':
        return 'orange';
      case 'query':
        return 'cyan';
      case 'assert':
        return 'magenta';
      case 'wait':
        return 'gold';
      default:
        return 'default';
    }
  };

  // 获取操作类型名称
  const getActionName = (type: AIAction['type']) => {
    const names: Record<string, string> = {
      action: 'AI 自动',
      tap: '点击',
      input: '输入',
      scroll: '滚动',
      query: '查询',
      assert: '断言',
      wait: '等待'
    };
    return names[type] || type;
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'running':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      default:
        return null;
    }
  };

  // 常用示例指令
  const examples = [
    { type: 'action', text: '搜索 好买基金', icon: <SearchOutlined /> },
    { type: 'tap', text: '点击搜索按钮', icon: <AimOutlined /> },
    { type: 'input', text: '在搜索框输入内容', icon: <FormOutlined /> },
    { type: 'query', text: '提取页面标题', icon: <EyeOutlined /> },
    { type: 'assert', text: '验证页面包含 好买基金', icon: <CheckSquareOutlined /> },
    { type: 'scroll', text: '向下滚动页面', icon: <DownOutlined /> }
  ];

  const yamlTabItems = [
    {
      key: 'templates',
      label: (
        <span>
          <FileTextOutlined />
          模板
        </span>
      ),
      children: (
        <List
          dataSource={templates}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  type="link"
                  size="small"
                  onClick={() => handleSelectTemplate(item.id)}
                >
                  使用
                </Button>
              ]}
            >
              <List.Item.Meta
                title={item.name}
                description={
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {item.description}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      )
    },
    {
      key: 'log',
      label: (
        <span>
          <CodeOutlined />
          执行日志
        </span>
      ),
      children: (
        <div style={{ maxHeight: 450, overflow: 'auto' }}>
          {executionLog.length === 0 ? (
            <Text type="secondary" style={{ display: 'block', padding: 20 }}>
              暂无执行日志，点击"执行"开始测试
            </Text>
          ) : (
            <List
              dataSource={executionLog}
              renderItem={(item) => (
                <List.Item>
                  <Space>
                    {getStatusIcon(item.status)}
                    <Text strong>步骤 {item.step}</Text>
                    <Tag>{item.type}</Tag>
                    <Text type="secondary">{item.description}</Text>
                  </Space>
                </List.Item>
              )}
            />
          )}
        </div>
      )
    },
    {
      key: 'help',
      label: (
        <span>
          <FileTextOutlined />
          帮助
        </span>
      ),
      children: (
        <div style={{ padding: 8 }}>
          <Text strong>常用 Flow 步骤</Text>
          <Divider />
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            <p>
              <Tag>aiTap</Tag> - 点击元素
            </p>
            <p>
              <Tag>aiInput</Tag> - 输入文本
            </p>
            <p>
              <Tag>aiScroll</Tag> - 滚动页面
            </p>
            <p>
              <Tag>aiAssert</Tag> - 断言验证
            </p>
            <p>
              <Tag>aiQuery</Tag> - 数据提取
            </p>
            <p>
              <Tag>aiWaitFor</Tag> - 等待条件
            </p>
            <p>
              <Tag>sleep</Tag> - 固定等待(ms)
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div>
      <Card
        title={
          <Space>
            <ThunderboltOutlined />
            <span>交互执行平台</span>
          </Space>
        }
        extra={
          activeTab === 'yaml' ? (
            <Space>
              <Select
                placeholder="选择模板"
                style={{ width: 200 }}
                value={currentTemplate}
                onChange={handleSelectTemplate}
                options={templates.map((t) => ({ label: t.name, value: t.id }))}
                allowClear
              />
              <Button icon={<CopyOutlined />} onClick={handleCopy}>
                复制
              </Button>
              <Button icon={<ClearOutlined />} onClick={handleClear}>
                清空
              </Button>
              <Button icon={<SaveOutlined />} onClick={handleSave}>
                保存为脚本
              </Button>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleExecute}
                loading={executing}
                disabled={!validation?.valid}
              >
                执行
              </Button>
            </Space>
          ) : null
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'ai',
              label: (
                <span>
                  <RobotOutlined />
                  AI 即时交互 
                </span>
              ),
              children: (
                <Row gutter={16}>
                  <Col span={24}>
                    {/* 顶部配置栏 */}
                    <Card
                      size="small"
                      style={{ marginBottom: 16 }}
                      bodyStyle={{ padding: 12 }}
                    >
                      <Space size="large" wrap>
                        <Space>
                          <GlobalOutlined />
                          <Text strong>目标 URL:</Text>
                          <Input
                            value={targetUrl}
                            onChange={(e) => setTargetUrl(e.target.value)}
                            style={{ width: 300 }}
                            placeholder="https://..."
                          />
                        </Space>
                        <Space>
                          <Text>视口:</Text>
                          <Select
                            value={`${viewport.width}x${viewport.height}`}
                            onChange={(v) => {
                              const [w, h] = v.split('x').map(Number);
                              setViewport({ width: w, height: h });
                            }}
                            style={{ width: 120 }}
                            options={[
                              { label: '1280x720', value: '1280x720' },
                              { label: '1920x1080', value: '1920x1080' },
                              { label: '1440x900', value: '1440x900' },
                              { label: '375x812', value: '375x812' }
                            ]}
                          />
                        </Space>
                        <Space>
                          <Text>深度思考:</Text>
                          <RadioGroup
                            value={deepThink}
                            onChange={(e) => setDeepThink(e.target.value)}
                          >
                            <Radio.Button value={false}>关闭</Radio.Button>
                            <Radio.Button value={true}>开启</Radio.Button>
                          </RadioGroup>
                        </Space>
                        <Space>
                          <Text>实时预览:</Text>
                          <RadioGroup
                            value={realtimePreview}
                            onChange={(e) => setRealtimePreview(e.target.value)}
                          >
                            <Radio.Button value={false}>关闭</Radio.Button>
                            <Radio.Button value={true}>开启</Radio.Button>
                          </RadioGroup>
                        </Space>
                      </Space>
                    </Card>

                    {/* 实时预览区域 */}
                    {realtimePreview && (
                      <Card
                        title={
                          <Space>
                            <EyeOutlined />
                            <span>实时预览</span>
                            {isProcessing && (
                              <Badge status="processing" text={previewStatus} />
                            )}
                          </Space>
                        }
                        style={{ marginBottom: 16 }}
                        bodyStyle={{ padding: 12 }}
                      >
                        {/* 截图预览 */}
                        <div
                          style={{
                            minHeight: 200,
                            maxHeight: 400,
                            background: '#f0f0f0',
                            borderRadius: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            position: 'relative'
                          }}
                        >
                          {currentScreenshot ? (
                            <img
                              key={currentScreenshot.slice(-50)}
                              src={currentScreenshot}
                              alt="页面预览"
                              style={{
                                maxWidth: '100%',
                                maxHeight: 380,
                                borderRadius: 4,
                                objectFit: 'contain'
                              }}
                            />
                          ) : (
                            <Empty
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                              description={
                                isProcessing ? '等待获取中...' : '暂无操作'
                              }
                            />
                          )}
                        </div>
                      </Card>
                    )}

                    {/* 操作历史区域 */}
                    <Card
                      title={
                        <Space>
                          <HistoryOutlined />
                          <span>操作历史</span>
                          <Badge count={actions.length} style={{ backgroundColor: '#667eea' }} />
                        </Space>
                      }
                      extra={
                        actions.length > 0 && (
                          <Button
                            icon={<DeleteOutlined />}
                            size="small"
                            danger
                            onClick={clearAllActions}
                          >
                            清空
                          </Button>
                        )
                      }
                      style={{ marginBottom: 16 }}
                    >
                      <div
                        ref={actionListRef}
                        style={{
                          height: 350,
                          overflow: 'auto',
                          background: '#f5f5f5',
                          borderRadius: 8,
                          padding: 16
                        }}
                      >
                        {actions.length === 0 ? (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                              <div>
                                <Text type="secondary">暂无操作记录</Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  在下方输入指令开始测试
                                </Text>
                              </div>
                            }
                          />
                        ) : (
                          <Timeline mode="left">
                            {actions.map((action) => (
                              <Timeline.Item
                                key={action.id}
                                dot={
                                  <Avatar
                                    icon={getActionIcon(action.type)}
                                    size="small"
                                    style={{
                                      backgroundColor:
                                        action.status === 'failed'
                                          ? '#ff4d4f'
                                          : action.status === 'running'
                                            ? '#1890ff'
                                            : '#52c41a'
                                    }}
                                  />
                                }
                                label={
                                  <Text type="secondary" style={{ fontSize: 11 }}>
                                    {new Date(action.timestamp).toLocaleTimeString()}
                                    {action.duration && (
                                      <span> ({(action.duration / 1000).toFixed(1)}s)</span>
                                    )}
                                  </Text>
                                }
                              >
                                <Card
                                  size="small"
                                  style={{
                                    background:
                                      action.status === 'failed' ? '#fff2f0' : '#fff',
                                    borderColor:
                                      action.status === 'failed'
                                        ? '#ff4d4f'
                                        : action.status === 'running'
                                          ? '#1890ff'
                                          : '#52c41a'
                                  }}
                                  bodyStyle={{ padding: 12 }}
                                  actions={
                                    action.status === 'running'
                                      ? undefined
                                      : [
                                          <Tooltip title="重新执行">
                                            <PlayCircleOutlined
                                              onClick={() => reExecuteAction(action)}
                                            />
                                          </Tooltip>,
                                          <Tooltip title="删除">
                                            <DeleteOutlined
                                              onClick={() => deleteAction(action.id)}
                                            />
                                          </Tooltip>
                                        ]
                                  }
                                >
                                  <Space direction="vertical" style={{ width: '100%' }}>
                                    <Space>
                                      <Tag color={getActionColor(action.type)}>
                                        {getActionName(action.type)}
                                      </Tag>
                                      {action.realtimePreview && (
                                        <Tag color="blue" icon={<EyeOutlined />}>
                                          实时预览
                                        </Tag>
                                      )}
                                      {getStatusIcon(action.status)}
                                    </Space>
                                    <Text strong>{action.prompt}</Text>
                                    {action.content && action.type === 'input' && (
                                      <Text type="secondary" style={{ fontSize: 12 }}>
                                        输入内容: {action.content}
                                      </Text>
                                    )}
                                    {action.result && (
                                      <div
                                        style={{
                                          background: '#f6ffed',
                                          padding: 8,
                                          borderRadius: 4,
                                          fontSize: 12
                                        }}
                                      >
                                        <Text type="success">
                                          结果: {JSON.stringify(action.result)}
                                        </Text>
                                      </div>
                                    )}
                                    {action.error && (
                                      <Collapse
                                        ghost
                                        size="small"
                                        items={[
                                          {
                                            key: '1',
                                            label: (
                                              <Text type="danger" strong style={{ fontSize: 12 }}>
                                                <Space>
                                                  <span>执行失败</span>
                                                  <span style={{ fontWeight: 'normal', color: '#666' }}>
                                                    {action.error.length > 50
                                                      ? `${action.error.substring(0, 50)}...`
                                                      : action.error}
                                                  </span>
                                                </Space>
                                              </Text>
                                            ),
                                            children: (
                                              <div
                                                style={{
                                                  background: '#fff2f0',
                                                  border: '1px solid #ffccc7',
                                                  borderRadius: 4,
                                                  padding: 12,
                                                  marginTop: 8
                                                }}
                                              >
                                                <Text type="danger" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                                                  错误详情:
                                                </Text>
                                                <pre
                                                  style={{
                                                    fontSize: 11,
                                                    color: '#ff4d4f',
                                                    margin: 0,
                                                    whiteSpace: 'pre-wrap',
                                                    wordBreak: 'break-word',
                                                    maxHeight: 200,
                                                    overflow: 'auto'
                                                  }}
                                                >
                                                  {action.error}
                                                </pre>
                                                {action.screenshot && (
                                                  <div style={{ marginTop: 12 }}>
                                                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                                                      失败时页面截图:
                                                    </Text>
                                                    <img
                                                      src={action.screenshot}
                                                      alt="失败截图"
                                                      style={{
                                                        maxWidth: '100%',
                                                        maxHeight: 150,
                                                        borderRadius: 4,
                                                        border: '1px solid #ffccc7'
                                                      }}
                                                    />
                                                  </div>
                                                )}
                                              </div>
                                            )
                                          }
                                        ]}
                                      />
                                    )}
                                  </Space>
                                </Card>
                              </Timeline.Item>
                            ))}
                          </Timeline>
                        )}
                      </div>
                    </Card>

                    {/* 操作输入区域 */}
                    <Card>
                      {/* 操作类型选择 */}
                      <RadioGroup
                        value={currentActionType}
                        onChange={(e) => setCurrentActionType(e.target.value)}
                        style={{ marginBottom: 16 }}
                        buttonStyle="solid"
                      >
                        <Radio.Button value="action">
                          <RobotOutlined /> AI 自动
                        </Radio.Button>
                        <Radio.Button value="tap">
                          <AimOutlined /> 点击
                        </Radio.Button>
                        <Radio.Button value="input">
                          <FormOutlined /> 输入
                        </Radio.Button>
                        <Radio.Button value="scroll">
                          <DownOutlined /> 滚动
                        </Radio.Button>
                        <Radio.Button value="query">
                          <SearchOutlined /> 查询
                        </Radio.Button>
                        <Radio.Button value="assert">
                          <CheckSquareOutlined /> 断言
                        </Radio.Button>
                        <Radio.Button value="wait">
                          <HistoryOutlined /> 等待
                        </Radio.Button>
                      </RadioGroup>

                      {/* 输入框 */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <Input.TextArea
                          placeholder={
                            currentActionType === 'action'
                              ? '输入自然语言指令，如：搜索 好买基金'
                              : currentActionType === 'tap'
                                ? '描述要点击的元素，如：搜索按钮'
                                : currentActionType === 'input'
                                  ? '描述输入位置和要输入的内容，如：搜索框 - 好买基金'
                                  : currentActionType === 'scroll'
                                    ? '描述滚动方向和距离，如：向下滚动500像素'
                                    : currentActionType === 'query'
                                      ? '描述要查询的数据，如：提取页面所有链接'
                                      : currentActionType === 'assert'
                                        ? '描述要验证的内容，如：页面包含登录按钮'
                                        : '描述要等待的条件，如：等待搜索结果加载'
                          }
                          value={currentInput}
                          onChange={(e) => setCurrentInput(e.target.value)}
                          onPressEnter={(e) => {
                            if (!e.shiftKey && !isProcessing) {
                              e.preventDefault();
                              executeAIAction();
                            }
                          }}
                          autoSize={{ minRows: 2, maxRows: 4 }}
                          style={{ flex: 1 }}
                        />
                        <Button
                          type="primary"
                          icon={isProcessing ? <LoadingOutlined /> : <SendOutlined />}
                          onClick={executeAIAction}
                          loading={isProcessing}
                          disabled={!currentInput.trim()}
                          style={{ height: 'auto', minWidth: 80 }}
                          size="large"
                        >
                          {isProcessing ? '执行中' : '执行'}
                        </Button>
                      </div>

                      {/* 快速示例 */}
                      <div>
                        <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>
                          快速示例:
                        </Text>
                        <Space size={4} wrap>
                          {examples.map((ex) => (
                            <Tag
                              key={ex.text}
                              icon={ex.icon}
                              color={getActionColor(ex.type as AIAction['type'])}
                              style={{ cursor: 'pointer' }}
                              onClick={() => {
                                setCurrentActionType(ex.type as AIAction['type']);
                                setCurrentInput(ex.text);
                              }}
                            >
                              {ex.text}
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    </Card>
                  </Col>
                </Row>
              )
            },
            {
              key: 'yaml',
              label: (
                <span>
                  <CodeOutlined />
                  YAML 脚本
                </span>
              ),
              children: (
                <Row gutter={16}>
                  <Col span={14}>
                    <div
                      style={{
                        border: `1px solid ${validation?.valid ? '#52c41a' : '#d9d9d9'}`,
                        borderRadius: 4,
                        overflow: 'hidden'
                      }}
                    >
                      <Editor
                        height={500}
                        defaultLanguage="yaml"
                        value={content}
                        onChange={handleEditorChange}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          lineNumbers: 'on',
                          roundedSelection: false,
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          tabSize: 2
                        }}
                        theme="vs-light"
                      />
                    </div>
                    <div style={{ marginTop: 16 }}>
                      {validation && (
                        <Space>
                          <Badge
                            status={validation.valid ? 'success' : 'error'}
                            text={
                              validation.valid
                                ? '格式正确'
                                : `错误 (${validation.errors.length})`
                            }
                          />
                          {validation.warnings.length > 0 && (
                            <Badge
                              status="warning"
                              text={`警告 (${validation.warnings.length})`}
                            />
                          )}
                        </Space>
                      )}
                    </div>
                  </Col>
                  <Col span={10}>
                    <Tabs items={yamlTabItems} />
                  </Col>
                </Row>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default Playground;
