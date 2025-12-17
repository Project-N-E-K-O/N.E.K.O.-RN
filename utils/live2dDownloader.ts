import { Directory, File, Paths } from 'expo-file-system';

function resolveUrl(baseUrl: string, relativePath: string): string {
  try {
    return new URL(relativePath, baseUrl).toString();
  } catch {
    if (baseUrl.endsWith('/')) return baseUrl + relativePath;
    return baseUrl + '/' + relativePath;
  }
}

async function ensureDirAsync(dir: string): Promise<void> {
  try {
    const destination = new Directory(dir);
    if (!destination.exists) {
      destination.create();
    }
  } catch (error) {
    console.log('ensureDirAsync error: ', error)
  }
}

async function downloadFileTo(dstPath: string, srcUrl: string): Promise<void> {
  console.log(`loadModelFile ${srcUrl} => ${dstPath}`)
  const dstDir = dstPath.substring(0, dstPath.lastIndexOf('/') + 1);
  await ensureDirAsync(dstDir);
  try {
    const dstFolder = new Directory(dstDir);
    const dst = new Directory(dstFolder.uri);
    const output = await File.downloadFileAsync(srcUrl, dst);
    console.log(`loaded file: ${output.uri}`)
  } catch (error) {
    // console.log(`loaded file error: ${error}`)
  }
}

export async function removeDownloadedModel(targetDirName: string): Promise<void> {
  const destination = new Directory(Paths.cache, targetDirName);
  console.log('removeDownloadedModel: ', destination.uri);

  if (await destination.exists) {
    console.log('removeDownloadedModel destination.uri: ', destination.uri);

    try {
      // 确保先清空目录
      const files = await destination.list();
      for (const file of files) {
        await file.delete();
      }

      await destination.delete(); // 注意加 await
      console.log("Deleted successfully:", destination.uri);
    } catch (err) {
      console.error("Failed to delete:", destination.uri, err);
    }
  }
}

/**
 * 已经把 model3.json 下载到本地后，继续解析并下载所有依赖到同一目录结构。
 * @param localModelJsonUri 例如: file:///data/user/0/<pkg>/cache/live2d/mao_pro/mao_pro.model3.json
 * @param remoteBaseUrl 远端基地址，例如: https://example.com/live2d/mao_pro/
 * @returns 返回原始的 localModelJsonUri
 */
export async function downloadDependenciesFromLocalModel(
  localModelJsonUri: string,
  remoteBaseUrl: string
): Promise<string> {
  // 读取本地 model3.json
  const file = new File(localModelJsonUri);

  const modelJsonStr = file.textSync()
  const model = JSON.parse(modelJsonStr);

  console.log('downloadDependenciesFromLocalModel model: ', model)

  // 计算本地根目录（保持与 model3.json 同一根目录）
  // e.g. file:///.../live2d/mao_pro/mao_pro.model3.json -> file:///.../live2d/mao_pro/
  const lastSlash = localModelJsonUri.lastIndexOf('/') + 1;
  const targetRoot = localModelJsonUri.substring(0, lastSlash);

  const files: string[] = [];
  if (model.FileReferences) {
    const refs = model.FileReferences;
    if (refs.Moc) files.push(refs.Moc);
    if (refs.Textures) files.push(...refs.Textures);
    if (refs.Physics) files.push(refs.Physics);
    if (refs.Pose) files.push(refs.Pose);
    if (refs.DisplayInfo) files.push(refs.DisplayInfo);
    if (refs.Expressions) files.push(...refs.Expressions.map((e: any) => e.File));
    if (refs.Motions) {
      Object.values(refs.Motions).forEach((arr: unknown) => {
        (arr as any[]).forEach((m) => {
          if (m && m.File) files.push(m.File);
        });
      });
    }
  }

  const uniqueFiles = Array.from(new Set(files.filter(Boolean)));

  // 并发下载所有依赖
  await Promise.all(
    uniqueFiles.map(async (relPath) => {
      const src = resolveUrl(remoteBaseUrl, relPath);
      const dst = `${targetRoot}${relPath}`;
      await downloadFileTo(dst, src);
    })
  );

  return localModelJsonUri;
}


