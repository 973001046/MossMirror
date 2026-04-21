import React from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  FileTextOutlined,
  CodeOutlined,
  BarChartOutlined,
  PlayCircleOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';

const { Sider } = Layout;

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '仪表盘'
    },
    {
      key: '/playground',
      icon: <CodeOutlined />,
      label: 'Playground'
    },
    {
      key: '/execution-reports',
      icon: <ThunderboltOutlined />,
      label: '执行报告'
    },
    {
      key: '/scripts',
      icon: <FileTextOutlined />,
      label: '脚本管理'
    },
    {
      key: '/batch',
      icon: <PlayCircleOutlined />,
      label: '批量执行'
    },
    {
      key: '/reports',
      icon: <BarChartOutlined />,
      label: '测试报告'
    }
  ];

  return (
    <Sider
      width={200}
      style={{
        background: '#fff',
        boxShadow: '2px 0 8px rgba(0,0,0,0.05)'
      }}
    >
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        style={{ height: '100%', borderRight: 0, paddingTop: 16 }}
      />
    </Sider>
  );
};

export default Sidebar;
