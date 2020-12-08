import { glob } from 'glob';

export interface GlobInputFileOptions {
  files?: string[];
  include?: string[];
  exclude?: string[];
  /* Defines the current working directory for the glob resolution */
  cwd?: string;
}

export function globInputFiles({ cwd, files, include, exclude: ignore }: GlobInputFileOptions): string[] {
  return (files || []).concat(include).reduce((acc, pattern) => {
    return acc.concat(glob.sync(pattern, {
      cwd, ignore, absolute: true, nodir: true
    }));
  }, []);
}
