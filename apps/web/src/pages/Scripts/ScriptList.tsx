import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Table,
  Tag,
  Space,
  Input,
  Upload,
  Modal,
  message,
  Popconfirm,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  UploadOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  DownloadOutlined,
  CopyOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { scriptApi, executeApi } from '../../services/api';
import dayjs from 'dayjs';

const { Search } = Input;

interface Script {
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

const ScriptList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [filteredScripts, setFilteredScripts] = useState<Script[]>([]);
  const [searchText, setSearchText] = useState('');
  const [executing, setExecuting] = useState<string | null>(null);

  useEffect(() => {
    loadScripts();
  }, []);

  useEffect(() => {
    if (searchText) {
      setFilteredScripts(
        scripts.filter(
          (s) =>
            s.name.toLowerCase().includes(searchText.toLowerCase()) ||
            s.description?.toLowerCase().includes(searchText.toLowerCase()) ||
            s.tags?.some((t) => t.toLowerCase().includes(searchText.toLowerCase()))
        )
      );
    } else {
      setFilteredScripts(scripts);
    }
  }, [searchText, scripts]);

  const loadScripts = async () => {
    try {
      setLoading(true);
      const res = (await scriptApi.getAll()) as { success: boolean; data: Script[] };
      if (res.success) {
        setScripts(res.data);
        setFilteredScripts(res.data);
      }
    } catch (error) {
      message.error('加载脚本失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = (await scriptApi.delete(id)) as { success: boolean };
      if (res.success) {
        message.success('删除成功');
        loadScripts();
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleExecute = async (script: Script) => {
    try {
      setExecuting(script.id);
      message.loading({ content: `正在执行: ${script.name}`, key: script.id, duration: 0 });

      await executeApi.execute(script.id, (data) => {
        if (data.type === 'execute:end') {
          if (data.data.success) {
            message.success({ content: '执行成功', key: script.id });
          } else {
            message.error({ content: `执行失败: ${data.data.error}`, key: script.id });
          }
          setExecuting(null);
          loadScripts();
        }
      });
    } catch (error) {
      message.error({ content: '执行失败', key: script.id });
      setExecuting(null);
    }
  };

  const handleImport = async (file: File) => {
    try {
      await scriptApi.import(file);
      message.success('导入成功');
      loadScripts();
      return false; // 阻止自动上传
    } catch (error) {
      message.error('导入失败');
      return false;
    }
  };

  const handleDuplicate = async (script: Script) => {
    try {
      const res = (await scriptApi.getById(script.id)) as {
        success: boolean;
        data: { meta: Script; content: any };
      };
      if (res.success) {
        const newRes = (await scriptApi.create({
          name: `${script.name} (复制)`,
          content: res.data.content,
          description: script.description,
          tags: script.tags
        })) as { success: boolean };

        if (newRes.success) {
          message.success('复制成功');
          loadScripts();
        }
      }
    } catch (error) {
      message.error('复制失败');
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
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
              {record.description}
            </div>
          )}
        </div>
      )
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) =>
        tags?.length ? (
          <Space size={4}>
            {tags.map((tag) => (
              <Tag key={tag} size="small">
                {tag}
              </Tag>
            ))}
          </Space>
        ) : null
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
      width: 100,
      render: (count: number) => <span>{count} 次</span>
    },
    {
      title: '最后更新',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      render: (_: any, record: Script) => (
        <Space size="small">
          <Tooltip title="执行">
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              size="small"
              loading={executing === record.id}
              disabled={record.status === 'running'}
              onClick={() => handleExecute(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => navigate(`/scripts/${record.id}/edit`)}
            />
          </Tooltip>
          <Tooltip title="导出">
            <Button
              icon={<DownloadOutlined />}
              size="small"
              onClick={() => scriptApi.export(record.id)}
            />
          </Tooltip>
          <Tooltip title="复制">
            <Button
              icon={<CopyOutlined />}
              size="small"
              onClick={() => handleDuplicate(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除"
            description={`确定要删除 "${record.name}" 吗？`}
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
        title="脚本管理"
        extra={
          <Space>
            <Search
              placeholder="搜索脚本"
              allowClear
              prefix={<SearchOutlined />}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
            />
            <Upload
              accept=".yaml,.yml"
              showUploadList={false}
              beforeUpload={handleImport}
            >
              <Button icon={<UploadOutlined />}>导入 YAML</Button>
            </Upload>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/scripts/new')}
            >
              新建脚本
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredScripts}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>
    </div>
  );
};

export default ScriptList;
