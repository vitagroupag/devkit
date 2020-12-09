import { JsonArray } from '@angular-devkit/core';
import { architect, logger } from '../../test-setup';
import { Options } from './index';

describe('PostCSS Builder', () => {
  it('should properly match input and calculate output files', async () => {
    // A "run" can contain multiple outputs, and contains progress information.
    const run = await architect.scheduleBuilder('@vitagroup-devkit/style:postcss', {
      rootDir: 'packages/style/src/builders/postcss/__mock__',
      include: [ '*.css' ],
      exclude: [ 'ignore.css' ],
      outDir: 'dist/style/builders/postcss/__mock__'
    } as Options, { logger });

    // The "result" member is the next output of the runner.
    // This is of type BuilderOutput.
    const { success, inputFiles, outputFiles } = await run.result;

    // Stop the builder from running. This really stops Architect from keeping
    // the builder associated states in memory, since builders keep waiting
    // to be scheduled.
    await run.stop();

    expect(success).toBe(true);
    expect((inputFiles as JsonArray).length).toEqual(1);
    expect((outputFiles as JsonArray).length).toEqual(1);
  });
});
