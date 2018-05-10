// This should better be abstract always, forcing developer to define messages.

export type SchemaType = "string" | "number" | "boolean" | "object";
export type SchemaProperty = boolean | SchemaObject
export type SchemaObject = {
  _schema: true,
  mandatory: boolean,
  type?: SchemaType;
}
export interface Schema {
  [property: string]: SchemaProperty | Schema;
}

export function validateSchema(
  schema: Schema,
  object: any
): string | undefined {
  const result = validateSchemaFunc(schema, object, "");
  return result;
}

function getPathString(parent: string, key: string) {
  if (parent.length == 0) {
    return key;
  } else {
    return `${parent}.${key}`;
  }
}

function validateSchemaFunc(
  schema: Schema,
  object: any,
  jsonPath: string
): string | undefined {
  if (object == null) {
    return `Invalid null object at path ${jsonPath}`
  }

  for (let key in schema) {
    const keyPath = getPathString(jsonPath, key);
    let def = <SchemaObject>schema[key];
    if (typeof def == "boolean") {
      def = {
        _schema: true,
        mandatory: def
      }
    } else if (<boolean>def._schema != true) {
      const result = validateSchemaFunc(
        schema[key] as Schema,
        object[key],
        `${keyPath}`
      );
      if (result != undefined) {
        return result;
      }
    }

    if (def.mandatory && object[key] == undefined) {
      return `Missing property ${keyPath}`;
    }
    if (object[key] != undefined &&
      def.type != undefined &&
      def.type != typeof object[key]
    ) {
      return `Invalid value for type ${def.type} in ${keyPath} `
    }
  }

  return undefined;
}

export abstract class Representation {

  public static parse(
    //@ts-ignore
    json: any
  ): Representation {
    throw new Error(
      `parse(json) not implemented in Representation class $ {this.name
    } `
    );
  }

  // User can implement this if schema needs to be enforced
  public static getValidataionSchema(): Schema | undefined {
    return undefined;
  }

  public constructor(
    //@ts-ignore
    json: any
  ) {
  }

  // This doesn't have a default implementation because of robustness concerns.
  // This is supposed to be the one that's genrating output to the client.
  public abstract getJSON(): any;

  // TODO To be done later.
  protected getETag(): string | undefined {
    return undefined;
  }
}