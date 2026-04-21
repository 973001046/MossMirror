import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import { PATHS, generateId, sanitizeFilename } from '../utils/fileUtils.js';
import { ScriptMeta, YamlScript } from '../models/types.js';

const META_FILE = path.join(PATHS.data, 'scripts-meta.json');

// 获取所有脚本元数据
export async function getAllScripts(): Promise<ScriptMeta[]> {
  if (!fs.existsSync(META_FILE)) {
    return [];
  }
  const data = await fs.readJson(META_FILE);
  return data.scripts || [];
}

// 保存脚本元数据
async function saveScriptsMeta(scripts: ScriptMeta[]): Promise<void> {
  await fs.ensureDir(PATHS.data);
  await fs.writeJson(META_FILE, { scripts }, { spaces: 2 });
}

// 创建脚本
export async function createScript(
  name: string,
  content: YamlScript,
  description?: string,
  tags?: string[]
): Promise<ScriptMeta> {
  const id = generateId();
  const filename = `${sanitizeFilename(name)}-${id}.yaml`;
  const filePath = path.join(PATHS.scripts, filename);

  // 保存 YAML 文件
  const yamlContent = yaml.dump(content);
  await fs.writeFile(filePath, yamlContent, 'utf-8');

  const now = new Date().toISOString();
  const script: ScriptMeta = {
    id,
    name,
    description,
    tags,
    createdAt: now,
    updatedAt: now,
    runCount: 0,
    status: 'idle',
    filePath: filename
  };

  const scripts = await getAllScripts();
  scripts.push(script);
  await saveScriptsMeta(scripts);

  return script;
}

// 获取脚本内容
export async function getScriptContent(id: string): Promise<{ meta: ScriptMeta; content: YamlScript } | null> {
  const scripts = await getAllScripts();
  const meta = scripts.find(s => s.id === id);
  if (!meta) return null;

  const filePath = path.join(PATHS.scripts, meta.filePath);
  if (!fs.existsSync(filePath)) return null;

  const yamlContent = await fs.readFile(filePath, 'utf-8');
  const content = yaml.load(yamlContent) as YamlScript;

  return { meta, content };
}

// 更新脚本
export async function updateScript(
  id: string,
  updates: { name?: string; content?: YamlScript; description?: string; tags?: string[] }
): Promise<ScriptMeta | null> {
  const scripts = await getAllScripts();
  const index = scripts.findIndex(s => s.id === id);
  if (index === -1) return null;

  const script = scripts[index];

  // 更新元数据
  if (updates.name) script.name = updates.name;
  if (updates.description !== undefined) script.description = updates.description;
  if (updates.tags) script.tags = updates.tags;
  script.updatedAt = new Date().toISOString();

  // 更新内容
  if (updates.content) {
    const filePath = path.join(PATHS.scripts, script.filePath);
    const yamlContent = yaml.dump(updates.content);
    await fs.writeFile(filePath, yamlContent, 'utf-8');
  }

  await saveScriptsMeta(scripts);
  return script;
}

// 删除脚本
export async function deleteScript(id: string): Promise<boolean> {
  const scripts = await getAllScripts();
  const index = scripts.findIndex(s => s.id === id);
  if (index === -1) return false;

  const script = scripts[index];
  const filePath = path.join(PATHS.scripts, script.filePath);

  // 删除文件
  if (fs.existsSync(filePath)) {
    await fs.remove(filePath);
  }

  // 删除元数据
  scripts.splice(index, 1);
  await saveScriptsMeta(scripts);

  return true;
}

// 导入 YAML 文件
export async function importYaml(file: Express.Multer.File, name?: string, description?: string): Promise<ScriptMeta> {
  const content = yaml.load(file.buffer.toString('utf-8')) as YamlScript;
  const scriptName = name || file.originalname.replace('.yaml', '').replace('.yml', '');
  return createScript(scriptName, content, description);
}

// 导出 YAML 文件
export async function exportYaml(id: string): Promise<{ filename: string; content: string } | null> {
  const result = await getScriptContent(id);
  if (!result) return null;

  const filename = `${sanitizeFilename(result.meta.name)}.yaml`;
  const content = yaml.dump(result.content);

  return { filename, content };
}

// 更新脚本状态
export async function updateScriptStatus(
  id: string,
  status: ScriptMeta['status'],
  incrementRunCount = false
): Promise<void> {
  const scripts = await getAllScripts();
  const script = scripts.find(s => s.id === id);
  if (!script) return;

  script.status = status;
  script.updatedAt = new Date().toISOString();
  if (incrementRunCount) {
    script.runCount++;
    script.lastRunAt = new Date().toISOString();
  }

  await saveScriptsMeta(scripts);
}
