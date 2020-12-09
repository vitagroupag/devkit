import { createBuilder } from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import { outputFileSync } from 'fs-extra';
import { basename, extname, join } from 'path';
import * as sass from 'sass';
import { absolutifyPath, debugLogJsonObject, GlobInputFileOptions, globInputFiles } from '../utils';

type SassJsonOptions = Omit<sass.Options, 'importer' | 'functions' | 'file' | 'data' | 'outFile'>;

export interface Options extends JsonObject, SassJsonOptions, GlobInputFileOptions {
  outDir: string;
}

export default createBuilder<Options>(async (options, context) => {
  const { logger, workspaceRoot } = context;
  const { rootDir, outDir } = options;

  try {
    const outFilesAndPromises = [];

    logger.info(`Analyzing input file patterns...`);
    debugLogJsonObject(logger, options);
    const inputFiles = globInputFiles({ ...options, rootDir }, workspaceRoot);
    logger.info(`Found ${ inputFiles.length } matching input file(s).`);

    if (inputFiles?.length === 0) {
      logger.error(`At lease some input is required! Aborting...`);
      return { success: false };
    }

    for (const file of inputFiles) {
      const outFile = absolutifyPath(
        join(outDir, basename(file, extname(file)) + '.css'), workspaceRoot
      );

      if (basename(outFile).startsWith('_')) {
        logger.debug(`Found leading underscore, skipping "${ file }"`);
        continue;
      }

      logger.debug(`Preparing "${ file }" to be rendered...`);
      const includePaths = (options.includePaths || [])
        .concat(rootDir)
        .map(path => absolutifyPath(path, workspaceRoot));
      const renderPromise = new Promise((resolve, reject) => {
        try {
          sass.render({ ...options, includePaths, file, outFile }, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        } catch (e) {
          reject(e);
        }
      });
      outFilesAndPromises.push([ outFile, renderPromise ]);
    }

    const outputFiles = [];
    await Promise.all(outFilesAndPromises.map(
      ([ outFile, renderPromise ]) => renderPromise.then(async (result: sass.Result) => {
        outputFileSync(outFile, result.css);
        if (result.map != null)
          outputFileSync(`${ outFile }.map`, result.map);

        outputFiles.push(outFile);

        logger.info(`Rendered "${ outFile }" (${ result.css.length } bytes)`);
      })
    ));

    return { success: true, inputFiles, outputFiles };
  } catch (err) {
    logger.error(err.toString());
    return { success: false, error: err.toString() };
  }
});
