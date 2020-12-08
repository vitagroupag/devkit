import { BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import { outputFileSync, readFileSync } from 'fs-extra';
import { basename, extname, join } from 'path';
import postcss, { AcceptedPlugin, ProcessOptions } from 'postcss';
import postcssrc from 'postcss-load-config';
import { GlobInputFileOptions, globInputFiles } from '../utils';

export interface Options extends JsonObject, GlobInputFileOptions {
  replace?: boolean;
  outDir?: string;
  ext?: string;
  config?: string;
}

export default createBuilder<Options>((options, context) => {
  return new Promise<BuilderOutput>((resolve) => {
    const { ext = '.css', replace, outDir, config, rootDir } = options;
    const { logger, workspaceRoot } = context;
    const configPath = join(workspaceRoot, (config || rootDir));
    const { plugins, options: postCssOptions } = postcssrc.sync(null, configPath, {
      stopDir: workspaceRoot
    });

    const postCssProcessor = postcss(plugins as AcceptedPlugin[]);

    if (replace == null && outDir == null) {
      logger.error(`Unable to run ${ context.builder.builderName }. Require either "replace" or "outDir" option to be set`);
      return resolve({ success: false });
    }

    try {
      const outFilesAndPromises = [];

      logger.info(`Analyzing input file patterns...`);
      logger.debug(`rootDir = ${rootDir}, files = ${options?.files}, include = ${options?.include}, exclude = ${options?.exclude}`);
      const inputFiles = globInputFiles({ ...options, rootDir }, workspaceRoot);
      logger.info(`Found ${ inputFiles.length } matching input file(s).`);

      for (const file of inputFiles) {
        const outFile = !replace
          ? join(outDir, basename(file, extname(file)) + ext)
          : file;

        logger.info(`Processing css file "${ file }"`);
        const css = readFileSync(file).toString();
        const resultPromise = postCssProcessor.process(css, {
          ...postCssOptions as unknown as ProcessOptions,
          from: file, to: outFile
        }).async();

        outFilesAndPromises.push([ outFile, resultPromise ]);
      }

      Promise.all(outFilesAndPromises.map(([ outFile, resultPromise ]) => {
        return resultPromise.then(result => [ outFile, result ]);
      })).then(outFilesAndResults => {
        const outputFiles = [];
        for (const [ outFile, result ] of outFilesAndResults) {
          logger.info(`Writing "${ outFile }"`);

          outputFileSync(outFile, result.css, { encoding: 'utf-8' });
          if (result.map != null)
            outputFileSync(`${ outFile }.map`, result.map.toString(), { encoding: 'utf-8' });

          outputFiles.push(outFile);
        }
        resolve({
          success: true,
          outputFiles,
          inputFiles
        });
      }).catch(err => resolve({ success: false, error: err.toString() }));
    } catch (err) {
      logger.error(err.toString());
      resolve({ success: false, error: err.toString() });
    }
  });
});
