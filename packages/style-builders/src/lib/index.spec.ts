import { logging } from '@angular-devkit/core';
import { architect } from '../test-setup';
import { Options } from './index';

describe('Library Builder', () => {
  it('should properly match and output asset copies', async () => {
    const logger = new logging.Logger('');
    const logs = [];
    logger.subscribe(entry => logs.push(`[${entry.level}] ${entry.message}`));

    // A "run" can contain multiple outputs, and contains progress information.
    const run = await architect.scheduleBuilder('@vitagroup/style-builders:lib', {
      rootDir: 'packages/style-builders/src/lib/__mock__/',
      copy: [ 'packages/style-builders/src/lib/__mock__/sass/' ],
      postcssConfig: 'packages/style-builders/src/lib/__mock__/postcss.config.js',
      prebuild: {
        files: [ 'sass/prebuilt/*.scss' ],
        outDir: 'dist/style-builders/lib/prebuilt'
      },
      outDir: 'dist/style-builders/lib'
    } as Options, { logger });

    // The "result" member is the next output of the runner.
    // This is of type BuilderOutput.
    const { success, error } = await run.result;

    // Stop the builder from running. This really stops Architect from keeping
    // the builder associated states in memory, since builders keep waiting
    // to be scheduled.
    await run.stop();

    console.log(logs);

    expect(success).toBe(true);
  });
});
