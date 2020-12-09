import { JsonObject } from '@angular-devkit/core';
import { outputFile, readJson } from 'fs-extra';
import { basename, join } from 'path';
import { absolutifyPath } from './absolutify-path';

export interface CopyPackageMetadataOptions {
  includeProperties?: string[];
  additionalProperties?: JsonObject;
  workspaceRoot: string;
  outDir: string;
}

export async function copyPackageMetadata(packageJson: string, options: CopyPackageMetadataOptions): Promise<void> {
  const { workspaceRoot, outDir, includeProperties, additionalProperties = {} } = options;
  const content: JsonObject = await readJson(absolutifyPath(packageJson, workspaceRoot));
  const targetProperties = [ 'name', 'version', 'dependencies', 'peerDependencies', 'main', ...(includeProperties || []) ];
  const json = Object.assign(
    additionalProperties, Object.entries(content).reduce((acc, [ key, value ]) => {
      return targetProperties.includes(key)
        ? { ...acc, [ key ]: value }
        : acc;
    }, {})
  );
  const filePath = absolutifyPath(join(outDir, basename(packageJson)), workspaceRoot);
  await outputFile(filePath, JSON.stringify(json, null, 2));
}
