import { JsonArray } from '@angular-devkit/core';
import { architect, architectHost } from '../test-setup';
import { Options } from './index';

test('@vitagroup/style-builders:sass', async () => {
  architectHost.currentDirectory = __dirname;

  // A "run" can contain multiple outputs, and contains progress information.
  const run = await architect.scheduleBuilder('@vitagroup/style-builders:sass', {
    outDir: '../../dist/css',
    include: [ '__mock__/*.scss' ],
    exclude: [ '__mock__/ignore.scss' ],
    sourceMap: true
  } as Options);

  // The "result" member is the next output of the runner.
  // This is of type BuilderOutput.
  const { success, inputFiles, outputFiles } = await run.result;

  // Stop the builder from running. This really stops Architect from keeping
  // the builder associated states in memory, since builders keep waiting
  // to be scheduled.
  await run.stop();

  expect(success).toBe(true);
  expect((inputFiles as JsonArray).length).toEqual(2);
  expect((outputFiles as JsonArray).length).toEqual(1);
});
