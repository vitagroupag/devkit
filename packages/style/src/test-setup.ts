import { Architect } from '@angular-devkit/architect';
import { TestingArchitectHost } from '@angular-devkit/architect/testing';
import { logging, schema } from '@angular-devkit/core';
import { join } from 'path';

export let architect: Architect;
export let architectHost: TestingArchitectHost;

export let logger: logging.Logger;

if (global[ '__DEBUG__' ]) {
  let logs: string[];

  beforeEach(() => {
    logs = [];
    logger = new logging.Logger('root');
    logger.subscribe(entry =>
      logs.push(`[${ entry.level }] ${ entry.message }`)
    );
  });
  afterEach(() => {
    console.log(logs.join('\n'));
  });
}

beforeAll(async () => {
  const registry = new schema.CoreSchemaRegistry();
  registry.addPostTransform(schema.transforms.addUndefinedDefaults);

  // Arguments to TestingArchitectHost are workspace and current directories.
  // Since we don't use those, both are the same in this case.
  architectHost = new TestingArchitectHost(join(__dirname, '../../..'));
  architect = new Architect(architectHost, registry);

  // This will either take a Node package name, or a path to the directory
  // for the package.json file.
  await architectHost.addBuilderFromPackage(join(__dirname, '..'));
  // console.log('#', Array.from((architectHost as any)._builderMap.keys()))
});
