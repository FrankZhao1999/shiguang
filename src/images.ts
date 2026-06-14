import { File, Directory, Paths } from 'expo-file-system';

// 把选中的图片复制一份到 app 自己的文档目录（不会被系统清理），返回新路径。
// 这样即使系统清掉了相册缓存里的原图，卡片配图也不会变裂图。
export function persistImage(srcUri: string): string {
  try {
    const dir = new Directory(Paths.document, 'images');
    if (!dir.exists) dir.create({ idempotent: true });

    const src = new File(srcUri);
    const ext = src.extension || '.jpg';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const dest = new File(dir, name);
    src.copy(dest);
    return dest.uri;
  } catch (e) {
    // 复制失败时退回原路径，至少不丢功能（极少发生）。
    console.warn('persistImage failed:', e);
    return srcUri;
  }
}

// 删除一张已持久化的配图（仅删 app 自己目录里的，外部路径不动）。
export function deleteImage(uri: string | null): void {
  if (!uri) return;
  try {
    const dir = new Directory(Paths.document, 'images');
    if (!uri.startsWith(dir.uri)) return; // 不是我们复制进来的就不碰
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (e) {
    console.warn('deleteImage failed:', e);
  }
}
