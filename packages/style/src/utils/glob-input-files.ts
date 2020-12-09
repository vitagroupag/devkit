import { JsonObject, logging } from '@angular-devkit/core';
import { glob } from 'glob';
import { absolutifyPath } from './absolutify-path';

export interface GlobInputFileOptions extends JsonObject {
  files?: string[];
  include?: string[];
  exclude?: string[];
  /* Defines the working directory for the glob resolution */
  rootDir?: string;
}

export function globInputFiles({ rootDir, files, include, exclude: ignore }: GlobInputFileOptions, workspaceRoot: string): string[] {
  const cwd = rootDir ? absolutifyPath(rootDir, workspaceRoot) : workspaceRoot;
  return (files || []).concat(include).reduce((acc, pattern) => {
    return acc.concat(glob.sync(pattern, {
      cwd, ignore, absolute: true, nodir: true
    }));
  }, []);
}
