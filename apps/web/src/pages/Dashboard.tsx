import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Spin, List, Tag, Typography } from 'antd';
import {
  FileTextOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import * as echarts from 'echarts';
import ReactECharts from 'echarts-for-react';
import { reportApi, scriptApi } from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface Stats {
  totalScripts: number;
  totalReports: number;
  totalExecutions: number;
  passRate: number;
  recentActivity: Array<{ date: string; count: number }>;
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentScripts, setRecentScripts] = useState<any[]>([]);
  const [recentReports, setRecentReports] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // 并行加载数据
      const [statsRes, scriptsRes, reportsRes] = await Promise.all([
        reportApi.getStats() as Promise<{ success: boolean; data: Stats }>,
        scriptApi.getAll() as Promise<{ success: boolean; data: any[] }>,
        reportApi.getAll() as Promise<{ success: boolean; data: any[] }>
      ]);

      if (statsRes.success) {
        setStats(statsRes.data);
      }

      if (scriptsRes.success) {
        // 获取最近更新的5个脚本
        const sorted = [...scriptsRes.data].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setRecentScripts(sorted.slice(0, 5));
      }

      if (reportsRes.success) {
        // 获取最近5个报告
        setRecentReports(reportsRes.data.slice(0, 5));
      }
    } finally {
      setLoading(false);
    }
  };

  // 活动趋势图表配置
  const getActivityChartOption = () => {
    if (!stats?.recentActivity) return {};

    return {
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: stats.recentActivity.map((a) => dayjs(a.date).format('MM-DD')),
        axisLine: { lineStyle: { color: '#e8e8e8' } },
        axisLabel: { color: '#666' }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#f0f0f0' } }
      },
      series: [
        {
          data: stats.recentActivity.map((a) => a.count),
          type: 'line',
          smooth: true,
          lineStyle: { color: '#667eea', width: 3 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(102, 126, 234, 0.3)' },
              { offset: 1, color: 'rgba(102, 126, 234, 0.05)' }
            ])
          },
          itemStyle: { color: '#667eea' }
        }
      ],
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e8e8e8',
        textStyle: { color: '#333' }
      }
    };
  };

  // 通过率饼图配置
  const getPassRateChartOption = () => {
    if (!stats) return {};

    const passCount = Math.round(stats.totalExecutions * (stats.passRate / 100));
    const failCount = stats.totalExecutions - passCount;

    return {
      series: [
        {
          type: 'pie',
          radius: ['50%', '70%'],
          avoidLabelOverlap: false,
          label: { show: false },
          emphasis: {
            label: { show: false }
          },
          data: [
            {
              value: passCount,
              name: '通过',
              itemStyle: { color: '#52c41a' }
            },
            {
              value: failCount,
              name: '失败',
              itemStyle: { color: '#ff4d4f' }
            }
          ]
        }
      ]
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'processing';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return '通过';
      case 'failed':
        return '失败';
      case 'running':
        return '运行中';
      default:
        return '空闲';
    }
  };

  return (
    <Spin spinning={loading}>
      <div style={{ padding: '8px 0' }}>
        <Title level={3} style={{ marginBottom: 24 }}>
          仪表盘
        </Title>

        {/* 统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={12} lg={6}>
            <Card>
              <Statistic
                title="总脚本数"
                value={stats?.totalScripts || 0}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#667eea' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} lg={6}>
            <Card>
              <Statistic
                title="总执行次数"
                value={stats?.totalExecutions || 0}
                prefix={<PlayCircleOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} lg={6}>
            <Card>
              <Statistic
                title="通过率"
                value={stats?.passRate || 0}
                precision={2}
                suffix="%"
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} lg={6}>
            <Card>
              <Statistic
                title="失败用例"
                value={
                  stats
                    ? Math.round(stats.totalExecutions * (1 - stats.passRate / 100))
                    : 0
                }
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 图表区域 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={16}>
            <Card title="近7天执行趋势">
              <ReactECharts
                option={getActivityChartOption()}
                style={{ height: 280 }}
              />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="执行结果分布">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ReactECharts
                  option={getPassRateChartOption()}
                  style={{ height: 280, width: '100%' }}
                />
              </div>
            </Card>
          </Col>
        </Row>

        {/* 最近活动 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              title="最近更新的脚本"
              extra={<a href="#/scripts">查看全部</a>}
            >
              <List
                dataSource={recentScripts}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Tag color={getStatusColor(item.status)}>
                        {getStatusText(item.status)}
                      </Tag>
                    ]}
                  >
                    <List.Item.Meta
                      title={<a href={`#/scripts/${item.id}/edit`}>{item.name}</a>}
                      description={
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <ClockCircleOutlined style={{ marginRight: 4 }} />
                          {dayjs(item.updatedAt).format('YYYY-MM-DD HH:mm')}
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              title="最近生成的报告"
              extra={<a href="#/reports">查看全部</a>}
            >
              <List
                dataSource={recentReports}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Tag color={getStatusColor(item.status)}>
                        {getStatusText(item.status)}
                      </Tag>
                    ]}
                  >
                    <List.Item.Meta
                      title={<a href={`#/reports/${item.id}`}>{item.name}</a>}
                      description={
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <ClockCircleOutlined style={{ marginRight: 4 }} />
                          {dayjs(item.startTime).format('YYYY-MM-DD HH:mm')}
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </Spin>
  );
};

export default Dashboard;
