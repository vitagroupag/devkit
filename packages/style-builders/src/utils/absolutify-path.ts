import { isAbsolute, join } from 'path';

export function absolutifyPath(path: string, cwd = process.cwd()): string {
  return isAbsolute(path) ? path : join(cwd, path);
}
