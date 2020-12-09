import { JsonObject, logging } from '@angular-devkit/core';

export function debugLogJsonObject(logger: logging.LoggerApi, obj: JsonObject): void {
  for (const [ key, value ] of Object.entries(obj))
    logger.debug(`${ key } = "${ value }"`);
}
