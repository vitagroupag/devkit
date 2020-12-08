import { BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import { readFileSync } from 'fs';
import { outputFileSync } from 'fs-extra';
import { basename, extname, isAbsolute, join } from 'path';
import postcss, { AcceptedPlugin, ProcessOptions } from 'postcss';
import postcssrc from 'postcss-load-config';
import { GlobInputFileOptions, globInputFiles } from '../utils';

export interface Options extends JsonObject, GlobInputFileOptions {
  replace?: boolean;
  outDir?: string;
  ext?: string;
  configPath?: string;
}

export default createBuilder<Options>((options, context) => {
  return new Promise<BuilderOutput>((resolve) => {
    const { ext = '.css', replace, outDir, configPath: rc } = options;
    const { logger, currentDirectory: cwd, workspaceRoot: wsd } = context;
    const configPath = isAbsolute(rc) ? rc : join(cwd, rc);
    const { plugins, options: postCssOptions } = postcssrc.sync(null, configPath, {
      stopDir: wsd
    });

    const postCssProcessor = postcss(plugins as AcceptedPlugin[]);

    if (replace == null && outDir == null) {
      logger.error(`Unable to run ${ context.builder.builderName }. Require either "replace" or "outDir" option to be set`);
      return resolve({ success: false });
    }

    try {
      const outputFiles = [];

      logger.debug(`Analyzing input file patterns...`);
      const inputFiles = globInputFiles({ ...options, cwd });
      logger.debug(`Found ${ inputFiles.length } matching input file(s).`);

      for (const file of inputFiles) {
        const outFile = !replace
          ? join(outDir, basename(file, extname(file)) + ext)
          : file;

        logger.debug(`Processing css file "${ file }"`);
        const result = postCssProcessor.process(
          readFileSync(file).toString(), {
            ...postCssOptions as unknown as ProcessOptions,
            from: file, to: outFile
          }
        ).sync();
        logger.info(`Wrote post processed css to "${ outFile }"`);

        outputFileSync(outFile, result.css);
        if (result.map != null)
          outputFileSync(`${ outFile }.map`, result.map.toJSON());

        outputFiles.push(outFile);
      }

      resolve({
        success: true,
        inputFiles,
        outputFiles
      });
    } catch (err) {
      resolve({ success: false, error: err.toString() });
    }
  });
});
