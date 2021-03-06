import { createBuilder } from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import { join } from 'path';
import * as postcssBuilder from '../postcss';
import * as sassBuilder from '../sass';
import { copyPackageMetadata, globAssetCopies, GlobAssetCopyOptions, GlobInputFileOptions } from '../../utils';

export type StylePreprocessorType = 'sass' | string;

export interface Options extends JsonObject, GlobAssetCopyOptions {
  prebuild?: GlobInputFileOptions & {
    /** Optional output directory path overwrite. Defaults to the {@link Options.outDir} value */
    outDir?: string;
  };
  postcssConfig?: string;
  style?: StylePreprocessorType;
  stylePreprocessorOptions?: {
    includePaths?: string[];
  };
  outDir: string;
  /** The root directory path relative to the workspace root */
  rootDir: string;
}

export default createBuilder<Options>(async (options, context) => {
  const { logger, workspaceRoot } = context;
  const { rootDir, outDir, postcssConfig, style = 'sass', prebuild } = options;
  const packageJson = join(rootDir, 'package.json');

  try {
    logger.info(`Copying package metadata...`);
    logger.debug(`packageJson = "${ packageJson }"`);
    logger.debug(`workspaceRoot = "${ workspaceRoot }"`);
    await copyPackageMetadata(packageJson, { workspaceRoot, outDir });

    if (prebuild != null) {
      logger.info(`Prebuild configuration found. Scheduling builders...`);

      logger.info(`Running sass builder...`);
      const sassBuild = await context.scheduleBuilder(`@vitagroup-devkit/style:${ style }`, {
        ...prebuild,
        outDir: prebuild.outDir || outDir,
        rootDir: prebuild.rootDir || rootDir,
        includePaths: options.stylePreprocessorOptions?.includePaths
      } as sassBuilder.Options, {
        logger: context.logger.createChild(style)
      });

      const sassResult = await sassBuild.result;
      if (!sassResult.success) return sassResult;

      logger.info(`Running postcss builder...`);
      const postcssBuild = await context.scheduleBuilder(`@vitagroup-devkit/style:postcss`, {
        rootDir, files: sassResult.outputFiles, replace: true, config: postcssConfig
      } as postcssBuilder.Options, {
        logger: context.logger.createChild('postcss')
      });

      const postcssResult = await postcssBuild.result;
      if (!postcssResult.success) return postcssResult;
    }

    if (options.copy?.length > 0) {
      logger.info(`Preparing to copy other files...`);

      const copies = globAssetCopies(options, workspaceRoot, outDir);
      await Promise.all(copies.map(
        copy => copy().then(() => {
          logger.debug(`Copied "${ copy.from }" to "${ copy.to }"`);
        })
      ));

      logger.info('Done.');
    }

    return { success: true };
  } catch (err) {
    logger.error(err);
    return { success: false, error: err.toString() };
  }
});
