import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  message,
  Row,
  Col,
  Tabs,
  Tag,
  Divider,
  Spin,
  Alert
} from 'antd';
import {
  SaveOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  ArrowLeftOutlined,
  FileTextOutlined,
  CodeOutlined
} from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import yaml from 'js-yaml';
import { scriptApi, executeApi, playgroundApi } from '../../services/api';

const { TextArea } = Input;

interface ScriptForm {
  name: string;
  description?: string;
  tags?: string[];
  content: string;
}

const defaultYaml = `web:
  url: https://www.bing.com
  viewportWidth: 1280
  viewportHeight: 720

tasks:
  - name: 示例任务
    flow:
      - aiInput:
          prompt: 搜索框
          content: Midscene.js
      - aiTap: 搜索按钮
      - sleep: 3000
      - aiAssert: 页面显示搜索结果
`;

const ScriptEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const [form] = Form.useForm<ScriptForm>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [yamlContent, setYamlContent] = useState(defaultYaml);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);

  // 加载脚本内容
  useEffect(() => {
    if (isEditing) {
      loadScript();
    }
  }, [id]);

  const loadScript = async () => {
    try {
      setLoading(true);
      const res = (await scriptApi.getById(id!)) as {
        success: boolean;
        data: { meta: any; content: any };
      };

      if (res.success) {
        const { meta, content } = res.data;
        form.setFieldsValue({
          name: meta.name,
          description: meta.description,
          tags: meta.tags
        });
        setYamlContent(yaml.dump(content));
      }
    } catch (error) {
      message.error('加载脚本失败');
    } finally {
      setLoading(false);
    }
  };

  // 验证 YAML
  const validateYaml = useCallback(async (content: string) => {
    try {
      const res = (await playgroundApi.preview(content)) as {
        success: boolean;
        data: any;
      };
      if (res.success) {
        setValidationResult(res.data);
      }
    } catch (error) {
      // 忽略错误
    }
  }, []);

  // 编辑器内容变化
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setYamlContent(value);
      // 延迟验证，避免频繁请求
      setTimeout(() => validateYaml(value), 500);
    }
  };

  // 保存脚本
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      // 解析 YAML
      let parsedContent;
      try {
        parsedContent = yaml.load(yamlContent);
      } catch (e) {
        message.error('YAML 格式错误，请检查');
        return;
      }

      if (isEditing) {
        const res = (await scriptApi.update(id!, {
          ...values,
          content: parsedContent
        })) as { success: boolean };

        if (res.success) {
          message.success('更新成功');
        }
      } else {
        const res = (await scriptApi.create({
          ...values,
          content: parsedContent
        })) as { success: boolean };

        if (res.success) {
          message.success('创建成功');
          navigate('/scripts');
        }
      }
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 快速执行
  const handleExecute = async () => {
    try {
      setExecuting(true);
      message.loading({ content: '正在执行...', key: 'execute', duration: 0 });

      const res = (await playgroundApi.run(yamlContent)) as {
        success: boolean;
        data: any;
      };

      if (res.success) {
        if (res.data.success) {
          message.success({ content: '执行成功', key: 'execute' });
        } else {
          message.error({ content: `执行失败: ${res.data.error || '未知错误'}`, key: 'execute' });
        }
      }
    } catch (error) {
      message.error({ content: '执行失败', key: 'execute' });
    } finally {
      setExecuting(false);
    }
  };

  // 标签输入处理
  const handleTagsChange = (value: string) => {
    const tags = value.split(',').map((t) => t.trim()).filter(Boolean);
    form.setFieldValue('tags', tags);
  };

  const items = [
    {
      key: 'editor',
      label: (
        <span>
          <CodeOutlined />
          YAML 编辑器
        </span>
      ),
      children: (
        <div style={{ height: 500 }}>
          <Editor
            height="100%"
            defaultLanguage="yaml"
            value={yamlContent}
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
      )
    },
    {
      key: 'preview',
      label: (
        <span>
          <EyeOutlined />
          预览
        </span>
      ),
      children: (
        <div>
          {validationResult && (
            <>
              {!validationResult.valid && (
                <Alert
                  message="验证失败"
                  description={
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {validationResult.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  }
                  type="error"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}
              {validationResult.warnings.length > 0 && (
                <Alert
                  message="警告"
                  description={
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {validationResult.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  }
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}
              {validationResult.valid && (
                <Alert message="YAML 格式正确" type="success" showIcon style={{ marginBottom: 16 }} />
              )}
            </>
          )}
          <pre
            style={{
              background: '#f6f8fa',
              padding: 16,
              borderRadius: 4,
              overflow: 'auto',
              fontSize: 13
            }}
          >
            <code>{yamlContent}</code>
          </pre>
        </div>
      )
    }
  ];

  return (
    <Spin spinning={loading}>
      <div>
        <Card
          title={
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/scripts')}>
                返回
              </Button>
              <span>{isEditing ? '编辑脚本' : '新建脚本'}</span>
            </Space>
          }
          extra={
            <Space>
              <Button
                icon={<PlayCircleOutlined />}
                onClick={handleExecute}
                loading={executing}
              >
                快速执行
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={saving}
              >
                保存
              </Button>
            </Space>
          }
        >
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="name"
                  label="脚本名称"
                  rules={[{ required: true, message: '请输入脚本名称' }]}
                >
                  <Input placeholder="请输入脚本名称" prefix={<FileTextOutlined />} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="tags" label="标签">
                  <Input
                    placeholder="多个标签用逗号分隔"
                    onChange={(e) => handleTagsChange(e.target.value)}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="description" label="描述">
              <TextArea rows={2} placeholder="请输入脚本描述" />
            </Form.Item>

            <Divider />

            <Form.Item label="脚本内容" required>
              <Tabs items={items} defaultActiveKey="editor" />
            </Form.Item>
          </Form>
        </Card>
      </div>
    </Spin>
  );
};

export default ScriptEditor;
