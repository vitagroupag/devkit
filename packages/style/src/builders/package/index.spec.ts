import { architect, logger } from '../../test-setup';
import { Options } from './index';

describe('Library Builder', () => {
  it('should properly match and output asset copies', async () => {
    // A "run" can contain multiple outputs, and contains progress information.
    const run = await architect.scheduleBuilder('@vitagroup-devkit/style:package', {
      rootDir: 'packages/style/src/builders/package/__mock__/',
      copy: [
        {
          from: 'packages/style/src/builders/package/__mock__/src/',
          to: 'sass'
        }
      ],
      postcssConfig: 'packages/style/src/builders/package/__mock__/postcss.config.js',
      prebuild: {
        files: [ 'src/prebuilt/*.scss' ],
        outDir: 'dist/style/builders/package/__mock__/prebuilt'
      },
      outDir: 'dist/style/builders/package/__mock__'
    } as Options, { logger });

    // The "result" member is the next output of the runner.
    // This is of type BuilderOutput.
    const { success } = await run.result;

    // Stop the builder from running. This really stops Architect from keeping
    // the builder associated states in memory, since builders keep waiting
    // to be scheduled.
    await run.stop();

    expect(success).toBe(true);
  });
});
