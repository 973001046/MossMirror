import React from 'react';
import { Layout, Typography, Space, Badge } from 'antd';
import {
  ExperimentOutlined,
  GithubOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';

const { Header } = Layout;
const { Title } = Typography;

const AppHeader: React.FC = () => {
  return (
    <Header
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <Space align="center">
        <ExperimentOutlined style={{ fontSize: 28, color: 'white' }} />
        <Title level={4} style={{ margin: 0, color: 'white' }}>
          AI驱动自动化测试平台
        </Title>
        <Badge
          count="v1.0"
          style={{ backgroundColor: 'rgba(255,255,255,0.3)', color: 'white' }}
        />
      </Space>

      {/* <Space>
        <a
          href="https://midscenejs.com/zh"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'white', opacity: 0.8 }}
        >
          <QuestionCircleOutlined style={{ fontSize: 18 }} />
        </a>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'white', opacity: 0.8 }}
        >
          <GithubOutlined style={{ fontSize: 18 }} />
        </a>
      </Space> */}
    </Header>
  );
};

export default AppHeader;
