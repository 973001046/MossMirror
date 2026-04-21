import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';
import AppHeader from './components/AppHeader';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ScriptList from './pages/Scripts/ScriptList';
import ScriptEditor from './pages/Scripts/ScriptEditor';
import Playground from './pages/Playground';
import ReportList from './pages/Reports/ReportList';
import ReportDetail from './pages/Reports/ReportDetail';
import ExecutionReportList from './pages/ExecutionReports/ExecutionReportList';
import BatchRun from './pages/BatchRun';

const { Content } = Layout;

const App: React.FC = () => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader />
      <Layout>
        <Sidebar />
        <Content style={{ padding: 24, background: '#f5f7fa', overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/scripts" element={<ScriptList />} />
            <Route path="/scripts/new" element={<ScriptEditor />} />
            <Route path="/scripts/:id/edit" element={<ScriptEditor />} />
            <Route path="/playground" element={<Playground />} />
            <Route path="/reports" element={<ReportList />} />
            <Route path="/reports/:id" element={<ReportDetail />} />
            <Route path="/execution-reports" element={<ExecutionReportList />} />
            <Route path="/batch" element={<BatchRun />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
