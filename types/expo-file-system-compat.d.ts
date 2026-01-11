/**
 * expo-file-system compat typings (Directory/File/Paths)
 *
 * 说明：
 * - 当前工程代码在多处使用 `expo-file-system` 中的 `Directory` / `File` / `Paths`（含 `.exists/.uri/.create/.list` 等成员）。
 * - 这些成员在运行时可用，但在 TS 类型定义中可能缺失，导致类型检查报错。
 * - 这里用 module augmentation 补齐最小成员集合，避免影响运行逻辑。
 */
declare module "expo-file-system" {
  export const Paths: {
    cache: string;
  };

  export class Directory {
    constructor(pathOrParent: string | Directory, childName?: string);
    name: string;
    uri: string;
    /**
     * 运行时兼容：不同实现可能是 boolean / Promise<boolean>。
     * 这里用 any 避免在业务代码里引入大量类型分支。
     */
    exists: any;
    create(): void;
    list(): any;
    delete(): Promise<void>;
  }

  export class File {
    constructor(pathOrParent: string | Directory, childName?: string);
    name: string;
    size: number;
    exists: any;
    textSync(): string;
    delete(): Promise<void>;

    static downloadFileAsync(srcUrl: string, dstDir: Directory): Promise<{ uri: string }>;
  }
}

