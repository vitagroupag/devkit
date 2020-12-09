import { createBuilder } from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import * as postcssBuilder from '../postcss';
import * as sassBuilder from '../sass';
import { globAssetCopies, GlobAssetCopyOptions, GlobInputFileOptions } from '../utils';

export type StylePreprocessorType = 'sass' | string;

export interface Options extends JsonObject, GlobAssetCopyOptions {
  prebuild?: GlobInputFileOptions & {
    /** Optional output directory path overwrite. Defaults to the {@link Options.outDir} value */
    outDir?: string;
  };
  postcssConfig?: string;
  style?: StylePreprocessorType;
  outDir: string;
  /** The root directory path relative to the workspace root */
  rootDir: string;
}

export default createBuilder<Options>(async (options, context) => {
  const { logger, workspaceRoot } = context;
  const { rootDir, outDir, postcssConfig, style = 'sass', prebuild } = options;

  try {
    if (prebuild != null) {
      logger.info(`Prebuild configuration found. Scheduling builders...`);

      logger.info(`Running sass builder...`);
      const sassBuild = await context.scheduleBuilder(`@vitagroup/style-builders:${ style }`, {
        ...prebuild,
        outDir: prebuild.outDir || outDir,
        rootDir: prebuild.rootDir || rootDir
      } as sassBuilder.Options, {
        logger: context.logger.createChild(style)
      });

      const sassResult = await sassBuild.result;
      if (!sassResult.success) return sassResult;

      logger.info(`Running postcss builder...`);
      const postcssBuild = await context.scheduleBuilder(`@vitagroup/style-builders:postcss`, {
        rootDir, files: sassResult.outputFiles, replace: true, config: postcssConfig
      } as postcssBuilder.Options, {
        logger: context.logger.createChild('postcss')
      });

      const postcssResult = await postcssBuild.result;
      if (!postcssResult.success) return postcssResult;
    }

    if (options.copy?.length > 0) {
      logger.info(`Copying files...`);

      const copies = globAssetCopies(options, workspaceRoot, outDir);
      await Promise.all(copies.map(
        copy => copy().then(() => {
          logger.debug(`Copied "${ copy.from }" to "${ copy.to }"`);
        })
      ));
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
});
