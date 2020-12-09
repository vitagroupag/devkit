import { JsonObject } from '@angular-devkit/core';
import { copy } from 'fs-extra';
import { glob } from 'glob';
import { match } from 'minimatch';
import { basename, join } from 'path';
import { absolutifyPath } from './absolutify-path';

export interface AssetCopy {
  /** Target folder or file path to be copied. For further globbing please use {@link pattern} */
  from: string;
  /** Destination folder or file path to copy to */
  to?: string;
  /** Optional exclude patterns to filter the copy operations with */
  exclude?: string[];
}

export interface GlobAssetCopy extends AssetCopy, JsonObject {
  /** Optional glob pattern to further refine the target file paths */
  pattern?: string;
}

export interface GlobAssetCopyOptions {
  copy?: Array<string | GlobAssetCopy>;
}

export interface CallableAssetCopy extends AssetCopy {
  (): Promise<void>;
}

export function makeCallableAssetCopy({ from, to, exclude }: AssetCopy, workspaceRoot: string, outDir: string): CallableAssetCopy {
  const hasDestination = to != null;
  to = hasDestination ? join(outDir, to) : outDir;
  const filter = exclude?.length
    && (src => exclude.every(pattern => !match([ src ], pattern).length));
  from = absolutifyPath(from, workspaceRoot);
  to = absolutifyPath(to, workspaceRoot);

  if (!hasDestination && (basename(from) !== basename(to)))
    to = join(to, basename(from));

  return Object.assign(async function callableAssetCopy() {
    return await copy(from, to, { filter, recursive: true });
  }, { from, to, exclude });
}

export function globAssetCopies({ copy }: GlobAssetCopyOptions, workspaceRoot: string, outDir: string): CallableAssetCopy[] {
  return (copy || []).reduce((copies, copy) => {
    const nextCopies: AssetCopy[] = [];

    if (typeof copy === 'string') nextCopies.push({ from: copy });
    else if ((copy as GlobAssetCopy).pattern == null) nextCopies.push(copy);
    else {
      const { pattern, exclude, from, to } = copy as GlobAssetCopy;
      const cwd = absolutifyPath(from, workspaceRoot);
      const paths = glob.sync(pattern, {
        cwd, ignore: exclude, absolute: true, noglobstar: true
      });
      nextCopies.push(
        ...paths.map(path => ({ from: path, to }))
      );
    }

    return copies.concat(nextCopies.map(
      assetCopy => makeCallableAssetCopy(assetCopy, workspaceRoot, outDir)
    ));
  }, []);
}

export function assetCopy(assetCopy: AssetCopy, workspaceRoot: string, outDir: string): Promise<void> {
  return makeCallableAssetCopy(assetCopy, workspaceRoot, outDir)();
}
