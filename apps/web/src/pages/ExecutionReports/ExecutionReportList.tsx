import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  message,
  Popconfirm,
  Modal,
  Empty,
  Tooltip,
  DatePicker,
  Select,
  Form,
  Row,
  Col
} from 'antd';
import {
  DeleteOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined
} from '@ant-design/icons';
import { executionReportApi } from '../../services/api';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

type ExecutionMode = 'ai-instant' | 'playground';

interface ExecutionReport {
  id: string;
  filename: string;
  reportPath: string;
  executionTime: string;
  timestamp: number;
  status: 'success' | 'failed' | 'unknown';
  prompt: string;
  duration?: number;
  executionMode: ExecutionMode;
  output?: string;
}

const ExecutionReportList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<ExecutionReport[]>([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ExecutionReport | null>(null);
  const [filterForm] = Form.useForm();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async (filters?: { startDate?: string; endDate?: string; status?: string; executionMode?: string }) => {
    try {
      setLoading(true);
      const res = await executionReportApi.getAll(filters) as unknown as { success: boolean; data: ExecutionReport[] };
      if (res.success) {
        setReports(res.data);
      }
    } catch (error) {
      message.error('加载执行报告失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (values: any) => {
    const { dateRange, status, executionMode } = values;
    const filters: { startDate?: string; endDate?: string; status?: string; executionMode?: string } = {};

    if (dateRange && dateRange[0] && dateRange[1]) {
      filters.startDate = dateRange[0].format('YYYY-MM-DD');
      filters.endDate = dateRange[1].format('YYYY-MM-DD');
    }

    if (status && status !== 'all') {
      filters.status = status;
    }

    if (executionMode && executionMode !== 'all') {
      filters.executionMode = executionMode;
    }

    loadReports(filters);
  };

  const handleReset = () => {
    filterForm.resetFields();
    loadReports();
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await executionReportApi.delete(id) as unknown as { success: boolean };
      if (res.success) {
        message.success('删除成功');
        loadReports();
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleViewDetail = (report: ExecutionReport) => {
    setSelectedReport(report);
    setDetailModalVisible(true);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      success: 'success',
      failed: 'error',
      unknown: 'default'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      success: '成功',
      failed: '失败',
      unknown: '未知'
    };
    return texts[status] || status;
  };

  const getExecutionModeColor = (mode: ExecutionMode) => {
    const colors: Record<ExecutionMode, string> = {
      'ai-instant': 'blue',
      'playground': 'purple'
    };
    return colors[mode] || 'default';
  };

  const getExecutionModeText = (mode: ExecutionMode) => {
    const texts: Record<ExecutionMode, string> = {
      'ai-instant': 'AI 即时交互',
      'playground': 'YAML 脚本'
    };
    return texts[mode] || mode;
  };

  const handleOpenOriginal = (report: ExecutionReport) => {
    window.open(`/ai-reports/${report.filename}`, '_blank');
  };

  const columns = [
    {
      title: '执行时间',
      dataIndex: 'executionTime',
      key: 'executionTime',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      )
    },
    {
      title: '执行方式',
      dataIndex: 'executionMode',
      key: 'executionMode',
      width: 120,
      render: (mode: ExecutionMode) => (
        <Tag color={getExecutionModeColor(mode)}>{getExecutionModeText(mode)}</Tag>
      )
    },
    {
      title: '提示词',
      dataIndex: 'prompt',
      key: 'prompt',
      ellipsis: true,
      render: (prompt: string) => (
        <Tooltip title={prompt} placement="topLeft">
          <span>{prompt}</span>
        </Tooltip>
      )
    },
    {
      title: '执行输出',
      dataIndex: 'output',
      key: 'output',
      ellipsis: true,
      render: (output: string | undefined) => {
        if (!output) return '-';
        return (
          <Tooltip title={output} placement="topLeft">
            <span>{output}</span>
          </Tooltip>
        );
      }
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration: number) => {
        if (!duration) return '-';
        if (duration < 1000) return `${duration}ms`;
        return `${(duration / 1000).toFixed(2)}s`;
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_: any, record: ExecutionReport) => (
        <Space size="small">
          <Button
            icon={<EyeOutlined />}
            size="small"
            type="primary"
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          <Button
            icon={<ExportOutlined />}
            size="small"
            onClick={() => handleOpenOriginal(record)}
          >
            原页
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这份执行报告吗？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Card
        title={
          <Space>
            <ThunderboltOutlined />
            <span>执行报告</span>
          </Space>
        }
      >
        {/* 搜索过滤区域 */}
        <Form
          form={filterForm}
          layout="vertical"
          onFinish={handleFilter}
          style={{ marginBottom: 24 }}
        >
          <Row gutter={16} align="bottom">
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="dateRange" label="执行时间范围">
                <RangePicker
                  style={{ width: '100%' }}
                  placeholder={['开始日期', '结束日期']}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6} lg={4}>
              <Form.Item name="status" label="执行状态">
                <Select placeholder="选择状态" allowClear>
                  <Option value="all">全部状态</Option>
                  <Option value="success">成功</Option>
                  <Option value="failed">失败</Option>
                  <Option value="unknown">未知</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6} lg={4}>
              <Form.Item name="executionMode" label="执行方式">
                <Select placeholder="选择执行方式" allowClear>
                  <Option value="all">全部方式</Option>
                  <Option value="ai-instant">AI 即时交互</Option>
                  <Option value="playground">YAML 脚本</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={24} md={6} lg={6}>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                    搜索
                  </Button>
                  <Button onClick={handleReset} icon={<ReloadOutlined />}>
                    重置
                  </Button>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <Table
          columns={columns}
          dataSource={reports}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无执行报告"
              />
            )
          }}
        />
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title={
          <Space>
            <EyeOutlined />
            <span>执行报告详情</span>
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width="90%"
        style={{ top: 20 }}
        footer={null}
        styles={{ body: { padding: 0, height: 'calc(100vh - 200px)' } }}
      >
        {selectedReport && (
          <iframe
            src={`/ai-reports/${selectedReport.filename}`}
            style={{
              width: '100%',
              height: '100%',
              border: 'none'
            }}
            title="AI Execution Report"
          />
        )}
      </Modal>
    </div>
  );
};

export default ExecutionReportList;
