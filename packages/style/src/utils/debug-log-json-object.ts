import { JsonObject, logging } from '@angular-devkit/core';

export function debugLogJsonObject(logger: logging.LoggerApi, obj: JsonObject): void {
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') logger.debug(`${key} = "${value}"`);
    else logger.debug(`${key} = ${value}`);
  }
}
