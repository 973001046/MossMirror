import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Table,
  Checkbox,
  Space,
  message,
  Progress,
  List,
  Tag,
  Typography,
  Form,
  Input,
  Switch,
  InputNumber,
  Divider,
  Spin,
  Badge,
  Alert,
  Row,
  Col
} from 'antd';
import {
  PlayCircleOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
import { scriptApi, executeApi } from '../services/api';

const { Text, Title } = Typography;

interface Script {
  id: string;
  name: string;
  description?: string;
  status: string;
  runCount: number;
}

interface BatchResult {
  scriptId: string;
  scriptName: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  duration?: number;
  error?: string;
}

const BatchRun: React.FC = () => {
  const navigate = useNavigate();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [executing, setExecuting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [batchConfig, setBatchConfig] = useState({
    name: `批量执行-${new Date().toLocaleString()}`,
    parallel: true,
    maxConcurrency: 4,
    stopOnError: false
  });

  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = async () => {
    try {
      setLoading(true);
      const res = (await scriptApi.getAll()) as { success: boolean; data: Script[] };
      if (res.success) {
        setScripts(res.data.filter((s) => s.status !== 'running'));
      }
    } catch (error) {
      message.error('加载脚本失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请至少选择一个脚本');
      return;
    }

    try {
      setExecuting(true);
      setProgress(0);
      setResults(
        selectedRowKeys.map((id) => {
          const script = scripts.find((s) => s.id === id as string);
          return {
            scriptId: id as string,
            scriptName: script?.name || '',
            status: 'pending'
          };
        })
      );

      message.loading({ content: '批量执行中...', key: 'batch', duration: 0 });

      const res = (await executeApi.batchExecute({
        scriptIds: selectedRowKeys as string[],
        ...batchConfig
      })) as { success: boolean; data: any };

      if (res.success) {
        message.success({ content: '批量执行完成', key: 'batch' });

        // 更新结果
        if (res.data?.results) {
          const newResults = selectedRowKeys.map((id, index) => {
            const script = scripts.find((s) => s.id === id as string);
            const execResult = res.data.results[index];
            return {
              scriptId: id as string,
              scriptName: script?.name || '',
              status: execResult?.success ? 'success' : 'failed',
              duration: execResult?.duration,
              error: execResult?.error
            };
          });
          setResults(newResults);
        }

        // 如果有报告，提示用户
        if (res.data?.id) {
          message.success(
            <span>
              报告已生成，
              <a href={`#/reports/${res.data.id}`}>点击查看</a>
            </span>,
            5
          );
        }
      }
    } catch (error) {
      message.error({ content: '批量执行失败', key: 'batch' });
    } finally {
      setExecuting(false);
      setProgress(100);
      loadScripts();
    }
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Script) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          {record.description && (
            <div style={{ fontSize: 12, color: '#999' }}>{record.description}</div>
          )}
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colors: Record<string, string> = {
          idle: 'default',
          running: 'processing',
          success: 'success',
          failed: 'error'
        };
        const texts: Record<string, string> = {
          idle: '空闲',
          running: '运行中',
          success: '成功',
          failed: '失败'
        };
        return <Tag color={colors[status]}>{texts[status]}</Tag>;
      }
    },
    {
      title: '执行次数',
      dataIndex: 'runCount',
      key: 'runCount',
      width: 100
    }
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys)
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'running':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      default:
        return <FileTextOutlined style={{ color: '#999' }} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return '成功';
      case 'failed':
        return '失败';
      case 'running':
        return '执行中';
      default:
        return '等待中';
    }
  };

  return (
    <div>
      <Card
        title={
          <Space>
            <ThunderboltOutlined />
            <span>批量执行</span>
          </Space>
        }
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
            返回
          </Button>
        }
      >
        <Row gutter={24}>
          {/* 左侧脚本列表 */}
          <Col span={16}>
            <Card
              title={
                <Space>
                  <UnorderedListOutlined />
                  <span>选择脚本</span>
                  <Badge count={selectedRowKeys.length} style={{ backgroundColor: '#667eea' }} />
                </Space>
              }
              type="inner"
            >
              <Alert
                message="提示"
                description="选择要批量执行的脚本，支持并行和串行两种模式"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Table
                rowSelection={rowSelection}
                columns={columns}
                dataSource={scripts}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 8 }}
                size="small"
                rowClassName={(record) => (record.status === 'running' ? 'ant-table-row-disabled' : '')}
              />
            </Card>
          </Col>

          {/* 右侧配置和执行 */}
          <Col span={8}>
            <Card
              title="执行配置"
              type="inner"
              style={{ marginBottom: 16 }}
            >
              <Form layout="vertical">
                <Form.Item label="批次名称">
                  <Input
                    value={batchConfig.name}
                    onChange={(e) =>
                      setBatchConfig({ ...batchConfig, name: e.target.value })
                    }
                    placeholder="输入批次名称"
                  />
                </Form.Item>

                <Form.Item label="并行执行">
                  <Switch
                    checked={batchConfig.parallel}
                    onChange={(checked) =>
                      setBatchConfig({ ...batchConfig, parallel: checked })
                    }
                  />
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    {batchConfig.parallel ? '多个脚本同时执行' : '逐个执行'}
                  </Text>
                </Form.Item>

                {batchConfig.parallel && (
                  <Form.Item label="最大并发数">
                    <InputNumber
                      min={1}
                      max={10}
                      value={batchConfig.maxConcurrency}
                      onChange={(value) =>
                        setBatchConfig({ ...batchConfig, maxConcurrency: value || 4 })
                      }
                    />
                  </Form.Item>
                )}

                <Form.Item label="出错时停止">
                  <Switch
                    checked={batchConfig.stopOnError}
                    onChange={(checked) =>
                      setBatchConfig({ ...batchConfig, stopOnError: checked })
                    }
                  />
                </Form.Item>

                <Divider />

                <Button
                  type="primary"
                  block
                  icon={<PlayCircleOutlined />}
                  onClick={handleExecute}
                  loading={executing}
                  disabled={selectedRowKeys.length === 0}
                  size="large"
                >
                  开始批量执行 ({selectedRowKeys.length} 个脚本)
                </Button>
              </Form>
            </Card>

            {/* 执行结果 */}
            {results.length > 0 && (
              <Card title="执行结果" type="inner">
                {executing && (
                  <Progress percent={progress} status="active" style={{ marginBottom: 16 }} />
                )}

                <List
                  size="small"
                  dataSource={results}
                  renderItem={(item) => (
                    <List.Item>
                      <Space>
                        {getStatusIcon(item.status)}
                        <Text strong style={{ width: 120 }} ellipsis={{ tooltip: item.scriptName }}>
                          {item.scriptName}
                        </Text>
                        <Tag color={item.status === 'success' ? 'success' : item.status === 'failed' ? 'error' : 'default'}>
                          {getStatusText(item.status)}
                        </Tag>
                        {item.duration && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {(item.duration / 1000).toFixed(2)}s
                          </Text>
                        )}
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            )}
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default BatchRun;
