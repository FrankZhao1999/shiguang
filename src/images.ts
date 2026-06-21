import { File, Directory, Paths } from 'expo-file-system';

// 配图持久化策略：数据库里只存「文件名」（相对），渲染时再用 resolveImage 拼成
// 当前文档目录下的绝对 URI。原因：iOS 的 App 容器路径（含一段 UUID）在重装 /
// iCloud 备份恢复后会变，若把绝对路径存进库，恢复后图片 URI 全失效会裂图。

const IMAGE_DIR = 'images';

function imagesDir(): Directory {
  return new Directory(Paths.document, IMAGE_DIR);
}

// 从任意路径 / URI 里取出纯文件名（去掉目录与可能的查询串）。
function basename(p: string): string {
  const noQuery = p.split('?')[0];
  const parts = noQuery.split('/');
  return parts[parts.length - 1] || noQuery;
}

// 取一张卡的所有配图「文件名」。兼容历史数据：旧库可能存了绝对路径，或用了
// 单图字段 imageUri —— 统一归一成文件名返回（renderer 再用 resolveImage 解析）。
export function getImages(card: {
  imageUris: string | null;
  imageUri: string | null;
}): string[] {
  let raw: string[] = [];
  if (card.imageUris) {
    try {
      const arr = JSON.parse(card.imageUris);
      if (Array.isArray(arr)) raw = arr;
    } catch {
      // 解析失败则忽略，往下回退
    }
  }
  if (raw.length === 0 && card.imageUri) raw = [card.imageUri];
  return raw.map((s) => basename(String(s)));
}

// 把「文件名」解析成当前可显示的绝对 URI。容器路径每次重装 / 恢复都不同，
// 所以始终在运行时用当前文档目录重新拼，天然修复历史绝对路径。
export function resolveImage(name: string): string {
  return new File(imagesDir(), basename(name)).uri;
}

// 复制选中的图片进 app 文档目录，返回「文件名」（存进数据库）。
export function persistImage(srcUri: string): string {
  try {
    const dir = imagesDir();
    if (!dir.exists) dir.create({ idempotent: true });

    const src = new File(srcUri);
    const ext = src.extension || '.jpg';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const dest = new File(dir, name);
    src.copy(dest);
    return name;
  } catch (e) {
    // 复制失败时退回原值，至少不丢功能（极少发生）。
    console.warn('persistImage failed:', e);
    return srcUri;
  }
}

// 把一张 base64 图片（来自备份）写进配图目录。若同名文件已存在则跳过
// （备份文件名带时间戳+随机串，冲突概率极低）。
export function writeImageBase64(name: string, base64: string): void {
  const dir = imagesDir();
  if (!dir.exists) dir.create({ idempotent: true });
  const file = new File(dir, basename(name));
  if (file.exists) return;
  file.create();
  file.write(base64, { encoding: 'base64' });
}

// 读取一张配图为 base64（用于「导出含图备份」）。文件不存在返回 null。
export async function readImageBase64(name: string): Promise<string | null> {
  try {
    const file = new File(imagesDir(), basename(name));
    if (!file.exists) return null;
    return await file.base64();
  } catch (e) {
    console.warn('readImageBase64 failed:', e);
    return null;
  }
}

// 删除一张已持久化的配图（按文件名，只删 app 自己目录里的）。
export function deleteImage(name: string | null): void {
  if (!name) return;
  try {
    const file = new File(imagesDir(), basename(name));
    if (file.exists) file.delete();
  } catch (e) {
    console.warn('deleteImage failed:', e);
  }
}
