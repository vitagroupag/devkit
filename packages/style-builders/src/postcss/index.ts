import { BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import { outputFileSync, readFileSync } from 'fs-extra';
import { basename, extname, join } from 'path';
import postcss, { AcceptedPlugin, ProcessOptions } from 'postcss';
import postcssrc from 'postcss-load-config';
import { absolutifyPath, GlobInputFileOptions, globInputFiles } from '../utils';

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
    const configPath = absolutifyPath(rc, cwd);
    const { plugins, options: postCssOptions } = postcssrc.sync(null, configPath, {
      stopDir: wsd
    });

    const postCssProcessor = postcss(plugins as AcceptedPlugin[]);

    if (replace == null && outDir == null) {
      logger.error(`Unable to run ${ context.builder.builderName }. Require either "replace" or "outDir" option to be set`);
      return resolve({ success: false });
    }

    try {
      const outFilesAndPromises = [];

      logger.debug(`Analyzing input file patterns...`);
      const inputFiles = globInputFiles({ ...options, cwd });
      logger.debug(`Found ${ inputFiles.length } matching input file(s).`);

      for (const file of inputFiles) {
        const outFile = absolutifyPath(
          !replace
            ? join(outDir, basename(file, extname(file)) + ext)
            : file,
          cwd
        );

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
      resolve({ success: false, error: err.toString() });
    }
  });
});
