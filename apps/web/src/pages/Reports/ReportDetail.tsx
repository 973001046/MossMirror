import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Descriptions,
  Tag,
  Spin,
  message,
  Space,
  Collapse,
  List,
  Timeline,
  Empty,
  Row,
  Col,
  Statistic
} from 'antd';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { reportApi } from '../../services/api';
import dayjs from 'dayjs';

const { Panel } = Collapse;

interface ReportDetail {
  id: string;
  name: string;
  scriptId: string;
  scriptName: string;
  status: 'success' | 'failed' | 'partial';
  startTime: string;
  endTime: string;
  duration: number;
  results: Array<{
    success: boolean;
    duration: number;
    steps: Array<{
      step: number;
      type: string;
      description: string;
      status: string;
      duration: number;
      error?: string;
    }>;
    error?: string;
    screenshot?: string;
  }>;
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

const ReportDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadReport();
    }
  }, [id]);

  const loadReport = async () => {
    try {
      setLoading(true);

      // 并行加载报告详情和 HTML
      const [reportRes, htmlRes] = await Promise.all([
        reportApi.getById(id!) as Promise<{ success: boolean; data: ReportDetail }>,
        reportApi.getHtml(id!).catch(() => ({ success: false, data: null }))
      ]);

      if (reportRes.success) {
        setReport(reportRes.data);
      }

      if ((htmlRes as any).success) {
        setHtmlContent((htmlRes as any).data);
      }
    } catch (error) {
      message.error('加载报告失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      success: 'success',
      failed: 'error',
      partial: 'warning'
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'partial':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      default:
        return null;
    }
  };

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'running':
        return <ClockCircleOutlined style={{ color: '#1890ff' }} />;
      default:
        return <FileTextOutlined style={{ color: '#999' }} />;
    }
  };

  return (
    <Spin spinning={loading}>
      {report ? (
        <div>
          <Card
            title={
              <Space>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/reports')}>
                  返回
                </Button>
                <span>{report.name}</span>
              </Space>
            }
            extra={
              <Space>
                <Button icon={<DownloadOutlined />} onClick={() => window.open(`/reports/${id}/html`, '_blank')}>
                  导出 HTML
                </Button>
              </Space>
            }
          >
            {/* 概览信息 */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card bordered={false} style={{ background: '#f6ffed' }}>
                  <Statistic
                    title="执行状态"
                    value={report.status === 'success' ? '通过' : report.status === 'failed' ? '失败' : '部分通过'}
                    valueStyle={{ color: report.status === 'success' ? '#52c41a' : report.status === 'failed' ? '#ff4d4f' : '#faad14' }}
                    prefix={getStatusIcon(report.status)}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card bordered={false} style={{ background: '#f6ffed' }}>
                  <Statistic
                    title="通过脚本"
                    value={report.summary.passed}
                    suffix={`/ ${report.summary.total}`}
                    valueStyle={{ color: '#52c41a' }}
                    prefix={<CheckCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card bordered={false} style={{ background: '#fff2f0' }}>
                  <Statistic
                    title="失败脚本"
                    value={report.summary.failed}
                    suffix={`/ ${report.summary.total}`}
                    valueStyle={{ color: '#ff4d4f' }}
                    prefix={<CloseCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card bordered={false}>
                  <Statistic
                    title="总耗时"
                    value={`${(report.duration / 1000).toFixed(2)}s`}
                    prefix={<ClockCircleOutlined />}
                  />
                </Card>
              </Col>
            </Row>

            {/* 详细信息 */}
            <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="脚本名称">{report.scriptName}</Descriptions.Item>
              <Descriptions.Item label="执行时间">
                {dayjs(report.startTime).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="结束时间">
                {dayjs(report.endTime).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="总步骤数">
                {report.summary.steps.total} (成功: {report.summary.steps.passed}, 失败: {report.summary.steps.failed})
              </Descriptions.Item>
            </Descriptions>

            {/* 执行详情 */}
            <Card title="执行详情" type="inner">
              <Collapse defaultActiveKey={['0']}>
                {report.results.map((result, index) => (
                  <Panel
                    key={index}
                    header={
                      <Space>
                        {result.success ? (
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        ) : (
                          <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                        )}
                        <span>执行 #{index + 1}</span>
                        <Tag color={result.success ? 'success' : 'error'}>
                          {result.success ? '通过' : '失败'}
                        </Tag>
                        <span style={{ color: '#999', fontSize: 12 }}>
                          耗时: {(result.duration / 1000).toFixed(2)}s
                        </span>
                      </Space>
                    }
                  >
                    {result.error && (
                      <div style={{ marginBottom: 16 }}>
                        <Tag color="error">错误信息</Tag>
                        <div
                          style={{
                            background: '#fff2f0',
                            borderLeft: '4px solid #ff4d4f',
                            padding: 12,
                            marginTop: 8,
                            fontSize: 13,
                            color: '#666',
                            borderRadius: 4
                          }}
                        >
                          {result.error}
                        </div>
                      </div>
                    )}

                    <List
                      header={<div>执行步骤</div>}
                      bordered
                      dataSource={result.steps}
                      renderItem={(step) => (
                        <List.Item>
                          <List.Item.Meta
                            avatar={getStepStatusIcon(step.status)}
                            title={
                              <Space>
                                <span>步骤 {step.step}</span>
                                <Tag>{step.type}</Tag>
                                <Tag color={step.status === 'success' ? 'success' : step.status === 'failed' ? 'error' : 'default'}>
                                  {step.status === 'success' ? '成功' : step.status === 'failed' ? '失败' : '执行中'}
                                </Tag>
                              </Space>
                            }
                            description={
                              <div>
                                <div>{step.description}</div>
                                {step.error && (
                                  <div style={{ color: '#ff4d4f', marginTop: 4, fontSize: 12 }}>
                                    错误: {step.error}
                                  </div>
                                )}
                                <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                                  耗时: {(step.duration / 1000).toFixed(2)}s
                                </div>
                              </div>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  </Panel>
                ))}
              </Collapse>
            </Card>

            {/* 原始 HTML 报告（如果有） */}
            {htmlContent && (
              <Card title="HTML 报告预览" type="inner" style={{ marginTop: 24 }}>
                <iframe
                  srcDoc={htmlContent}
                  style={{ width: '100%', height: 500, border: 'none' }}
                  title="HTML Report"
                />
              </Card>
            )}
          </Card>
        </div>
      ) : (
        <Card>
          <Empty description="报告不存在或已删除" />
        </Card>
      )}
    </Spin>
  );
};

export default ReportDetail;
