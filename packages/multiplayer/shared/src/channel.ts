export type ExtractParams<T extends string> =
  T extends `${infer _Start}{${infer Param}}${infer Rest}` ? Param | ExtractParams<Rest> : never;

export type ParamsFromPath<T extends string> =
  ExtractParams<T> extends never ? {} : { [K in ExtractParams<T>]: string };

export type HasParams<T extends string> = ExtractParams<T> extends never ? false : true;

export function resolvePath<T extends string>(template: T, params: ParamsFromPath<T>): string {
  let result: string = template;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`{${key}}`, value as string);
  }
  return result;
}

export function parsePath<T extends string>(
  template: T,
  resolved: string,
): ParamsFromPath<T> | null {
  const paramNames: string[] = [];
  let regexStr = "^";

  let remaining: string = template;
  while (remaining.length > 0) {
    const paramStart = remaining.indexOf("{");
    if (paramStart === -1) {
      regexStr += escapeRegex(remaining);
      break;
    }

    if (paramStart > 0) {
      regexStr += escapeRegex(remaining.slice(0, paramStart));
    }

    const paramEnd = remaining.indexOf("}", paramStart);
    if (paramEnd === -1) {
      return null;
    }

    const paramName = remaining.slice(paramStart + 1, paramEnd);
    paramNames.push(paramName);
    regexStr += "([^/]+)";

    remaining = remaining.slice(paramEnd + 1);
  }

  regexStr += "$";

  const regex = new RegExp(regexStr);
  const match = resolved.match(regex);

  if (!match) {
    return null;
  }

  const params: Record<string, string> = {};
  for (let i = 0; i < paramNames.length; i++) {
    params[paramNames[i]] = match[i + 1];
  }

  return params as ParamsFromPath<T>;
}

export function getParamNames(template: string): string[] {
  const names: string[] = [];
  const regex = /\{([^}]+)\}/g;
  let match;
  while ((match = regex.exec(template)) !== null) {
    names.push(match[1]);
  }
  return names;
}

export function hasParams(template: string): boolean {
  return template.includes("{");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
