import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  message,
  Popconfirm,
  DatePicker,
  Select,
  Input,
  Row,
  Col
} from 'antd';
import {
  FileTextOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  SearchOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { reportApi } from '../../services/api';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Search } = Input;
const { Option } = Select;

interface Report {
  id: string;
  name: string;
  scriptId: string;
  scriptName: string;
  status: 'success' | 'failed' | 'partial';
  startTime: string;
  endTime: string;
  duration: number;
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
}

const ReportList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [filters, setFilters] = useState({
    status: undefined as string | undefined,
    dateRange: undefined as [dayjs.Dayjs, dayjs.Dayjs] | undefined,
    search: ''
  });

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    let filtered = [...reports];

    if (filters.status) {
      filtered = filtered.filter((r) => r.status === filters.status);
    }

    if (filters.dateRange) {
      const [start, end] = filters.dateRange;
      filtered = filtered.filter((r) => {
        const reportDate = dayjs(r.startTime);
        return reportDate.isAfter(start) && reportDate.isBefore(end);
      });
    }

    if (filters.search) {
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          r.scriptName.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    setFilteredReports(filtered);
  }, [filters, reports]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = (await reportApi.getAll()) as { success: boolean; data: Report[] };
      if (res.success) {
        setReports(res.data);
        setFilteredReports(res.data);
      }
    } catch (error) {
      message.error('加载报告失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = (await reportApi.delete(id)) as { success: boolean };
      if (res.success) {
        message.success('删除成功');
        loadReports();
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleExport = (report: Report) => {
    window.open(`/reports/${report.id}/html`, '_blank');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      success: 'success',
      failed: 'error',
      partial: 'warning'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      success: '通过',
      failed: '失败',
      partial: '部分通过'
    };
    return texts[status] || status;
  };

  const columns = [
    {
      title: '报告名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Report) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <div style={{ fontSize: 12, color: '#999' }}>
            脚本: {record.scriptName}
          </div>
        </div>
      )
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
      title: '脚本数',
      key: 'scripts',
      width: 120,
      render: (_: any, record: Report) => (
        <Space>
          <Tag color="success">{record.summary.passed}</Tag>
          <span>/</span>
          <Tag color="error">{record.summary.failed}</Tag>
          <span>/</span>
          <span>{record.summary.total}</span>
        </Space>
      )
    },
    {
      title: '步骤数',
      key: 'steps',
      width: 120,
      render: (_: any, record: Report) => (
        <Space>
          <Tag color="success">{record.summary.steps.passed}</Tag>
          <span>/</span>
          <Tag color="error">{record.summary.steps.failed}</Tag>
          <span>/</span>
          <span>{record.summary.steps.total}</span>
        </Space>
      )
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration: number) => `${(duration / 1000).toFixed(2)}s`
    },
    {
      title: '执行时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: Report) => (
        <Space size="small">
          <Button
            icon={<EyeOutlined />}
            size="small"
            onClick={() => navigate(`/reports/${record.id}`)}
          >
            查看
          </Button>
          <Button
            icon={<DownloadOutlined />}
            size="small"
            onClick={() => handleExport(record)}
          >
            导出
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这份报告吗？"
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
        title="测试报告"
        extra={
          <Row gutter={16} align="middle">
            <Col>
              <Select
                placeholder="按状态筛选"
                allowClear
                style={{ width: 120 }}
                value={filters.status}
                onChange={(value) => setFilters({ ...filters, status: value })}
              >
                <Option value="success">通过</Option>
                <Option value="failed">失败</Option>
                <Option value="partial">部分通过</Option>
              </Select>
            </Col>
            <Col>
              <RangePicker
                onChange={(dates) =>
                  setFilters({
                    ...filters,
                    dateRange: dates as [dayjs.Dayjs, dayjs.Dayjs]
                  })
                }
              />
            </Col>
            <Col>
              <Search
                placeholder="搜索报告"
                allowClear
                prefix={<SearchOutlined />}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                style={{ width: 200 }}
              />
            </Col>
          </Row>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredReports}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>
    </div>
  );
};

export default ReportList;
