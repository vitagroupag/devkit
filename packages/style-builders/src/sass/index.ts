import { BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import { outputFileSync } from 'fs-extra';
import { basename, extname, join } from 'path';
import * as sass from 'sass';
import { GlobInputFileOptions, globInputFiles } from '../utils';

type SassJsonOptions = Omit<sass.Options, 'importer' | 'functions' | 'file' | 'data' | 'outFile'>;

export interface Options extends JsonObject, SassJsonOptions, GlobInputFileOptions {
  outDir: string;
}

export default createBuilder<Options>((options, context) => {
  return new Promise<BuilderOutput>((resolve) => {
    const { logger, currentDirectory: cwd } = context;
    const outDirPath = join(cwd, options.outDir);

    try {
      const outputFiles = [];

      logger.debug(`Analyzing input file patterns...`);
      const inputFiles = globInputFiles({ ...options, cwd });
      logger.debug(`Found ${ inputFiles.length } matching input file(s).`);

      for (const file of inputFiles) {
        const outFile = join(outDirPath, basename(file, extname(file)) + '.css');

        if (basename(outFile).startsWith('_')) {
          logger.debug(`Found leading underscore, skipping "${outFile}"`);
          continue;
        }

        logger.debug(`Rendering sass file "${ file }" to "${ outFile }"`);
        const result = sass.renderSync({ ...options, file, outFile });
        logger.info(`Rendered "${ outFile }" in ${ result.stats.duration }ms (${ result.css.length } bytes)`);

        outputFileSync(outFile, result.css);
        if (result.map != null)
          outputFileSync(`${ outFile }.map`, result.map);

        outputFiles.push(outFile);
      }

      resolve({
        success: true,
        inputFiles,
        outputFiles
      });
    } catch (err) {
      logger.error(err.toString());
      resolve({ success: false });
    }
  });
});
