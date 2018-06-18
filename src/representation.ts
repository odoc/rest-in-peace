// This should better be abstract always, forcing developer to define messages.
export type SchemaValue = string | number | boolean | Object;
export type SchemaType = "string" | "number" | "boolean" | "object";
export type SchemaProperty = boolean | SchemaObject
export type SchemaObject = {
  _schema: true,
  mandatory: boolean,
  type?: SchemaType,
  whitelist?: SchemaValue[]
}

// TODO having object propery names like type is not going to work with this.
export interface Schema {
  [property: string]: SchemaProperty | Schema;
}

function validateSchema(
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
      continue;
    }

    if (def.mandatory && object[key] == undefined) {
      return `Missing property ${keyPath}`;
    }
    if (object[key] != undefined &&
      def.type != undefined &&
      def.type != typeof object[key]
    ) {
      return `Invalid value for type ${def.type} in ${keyPath}`
    }
    if (def.whitelist != undefined && Array.isArray(def.whitelist)) {
      let found = false;
      for (let value of def.whitelist) {
        if (value == object[key]) {
          found = true;
          break;
        }
      }
      if (!found) {
        return `Invalid value ${object[key]} for property ${keyPath}. ` +
          `Possible values are: ${def.whitelist.join(',')}`
      }
    }
  }

  return undefined;
}

export abstract class Representation {
  private static requestSchema?: Schema;
  private static requestParseFunc: (json: any) => Representation;

  public static setupRequestParser(
    representationClass: typeof Representation,
    parseFunc: (json: any) => Representation,
    validationSchema?: Schema
  ) {
    representationClass.requestParseFunc = parseFunc;
    representationClass.requestSchema = validationSchema;
  }

  public static parseRequest(
    json: any
  ): Representation {
    if (this.requestSchema != undefined) {
      const error = validateSchema(this.requestSchema, json);
      if (error != undefined) {
        throw new Error(error);
      }
    }
    if (this.requestParseFunc == undefined) {
      throw new Error(
        `Representation.setRequestParser() is not called for ${this.name}`
      );
    }
    return this.requestParseFunc(json)
  }

  public static get isRequestSetupDone(): boolean {
    return this.requestParseFunc != undefined;
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