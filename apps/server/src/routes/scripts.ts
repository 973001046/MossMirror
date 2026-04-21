import express from 'express';
import multer from 'multer';
import * as scriptService from '../services/scriptService.js';
import { YamlScript } from '../models/types.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 获取所有脚本
router.get('/', async (req, res) => {
  try {
    const scripts = await scriptService.getAllScripts();
    res.json({ success: true, data: scripts });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 创建脚本
router.post('/', async (req, res) => {
  try {
    const { name, content, description, tags } = req.body;

    if (!name || !content) {
      return res.status(400).json({
        success: false,
        error: 'Name and content are required'
      });
    }

    const script = await scriptService.createScript(name, content as YamlScript, description, tags);
    res.json({ success: true, data: script });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 获取脚本内容
router.get('/:id', async (req, res) => {
  try {
    const result = await scriptService.getScriptContent(req.params.id);

    if (!result) {
      return res.status(404).json({ success: false, error: 'Script not found' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 更新脚本
router.put('/:id', async (req, res) => {
  try {
    const { name, content, description, tags } = req.body;
    const script = await scriptService.updateScript(req.params.id, {
      name,
      content,
      description,
      tags
    });

    if (!script) {
      return res.status(404).json({ success: false, error: 'Script not found' });
    }

    res.json({ success: true, data: script });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 删除脚本
router.delete('/:id', async (req, res) => {
  try {
    const success = await scriptService.deleteScript(req.params.id);

    if (!success) {
      return res.status(404).json({ success: false, error: 'Script not found' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 导入 YAML
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { name, description } = req.body;
    const script = await scriptService.importYaml(req.file, name, description);

    res.json({ success: true, data: script });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 导出 YAML
router.get('/:id/export', async (req, res) => {
  try {
    const result = await scriptService.exportYaml(req.params.id);

    if (!result) {
      return res.status(404).json({ success: false, error: 'Script not found' });
    }

    res.setHeader('Content-Type', 'text/yaml');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.content);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as ScriptRoutes };
