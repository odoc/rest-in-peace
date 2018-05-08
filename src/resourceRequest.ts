// Notes: request.session is something we can do with a sessions service
// i.e. GET/POST sessions, app etc
// auth server is not required to be session aware. It should act simply as
// an identity provider

// identities are in groups. at service level we should be able to define
// permissions each group has. Individual identities might also have resource
// permissions defined separately, in which case identity permissions will have
// higher precedence.

// TODO
// Usage: request.meta
// Usage: request.message
// Usage: request.params
// Usage: request.queries

// identity, permissions
// session

import { Request } from 'express';
import { ResourceHandler } from './resourceHandler';
import { Representation } from './representation';
import { Identity } from './identity';

export class ResourceId {
  private _value: string;

  public constructor(value: string) {
    this._value = value;
  }

  public get value(): string {
    return this._value;
  }
}

export class Resource {
  private _identifier: string;
  private _id: ResourceId;
  private _parent?: Resource;

  public constructor(identifier: string, id: ResourceId, parent?: Resource) {
    this._identifier = identifier;
    this._id = id;
    this._parent = parent;
  }

  public get identifier(): string {
    return this._identifier;
  }

  public get id(): ResourceId {
    return this._id;
  }

  public get parent(): Resource | undefined {
    return this._parent;
  }
}

export interface ResourceRequestInterface {

}

export class ResourceRequest implements ResourceRequestInterface {
  private _params: any;
  private _query: any;
  private _version: number;
  private _request: Request;
  private _representation?: Representation;
  private _representations?: Representation[];
  private _identity?: Identity;
  private _isArray = false;

  private resources = new Map<string, Resource>();
  private curResource: Resource;

  // TODO it can be an array of representations
  public constructor(
    request: Request,
    resourceHandlers: ResourceHandler[],
    resourceIdClasses: (typeof ResourceId)[],
    version: number,
    representation?: Representation | Representation[],
    identity?: Identity
  ) {
    this._request = request;
    this._params = request.params;
    this._query = request.query;
    this._version = version;

    if (Array.isArray(representation)) {
      this._representations = representation
      this._isArray = true;
    } else {
      this._representation = representation;
    }
    this._identity = identity;

    //extract version

    // Generate resources
    let lastResource: Resource | undefined = undefined;
    for (let i = 0; i < resourceHandlers.length; ++i) {
      const resourceIdClass = resourceIdClasses[i]
      let cur: Resource = new Resource(
        resourceHandlers[i].getResourceIdentifierInPlural(),
        new resourceIdClass(request.params[resourceHandlers[i].getParamId()]),
        lastResource
      )
      this.resources.set(
        resourceHandlers[i].getResourceIdentifierInPlural(),
        cur
      );
      lastResource = cur;
    }
    this.curResource = <Resource>lastResource;
  }

  public get query(): any {
    return this._query;
  }

  public get version(): number {
    return this._version;
  }

  public isArray(): boolean {
    return this._isArray;
  }

  public get representation(): Representation | undefined {
    return this._representation;
  }

  public get allRepresentation(): Representation[] | undefined {
    return this._representations;
  }

  public get identity(): Identity | undefined {
    return this._identity;
  }

  public getResource(resourceIdentifier?: string): Resource | undefined {
    if (resourceIdentifier == undefined) {
      return this.curResource;
    } else {
      return this.resources.get(resourceIdentifier)
    }
  }
}