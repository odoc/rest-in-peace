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
import { Service } from './service';
import { Representation } from './representation';

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
  private _representation: Representation;
  private _version: number;
  private _request: Request;

  private resources = new Map<string, Resource>();
  private curResource: Resource;

  // TODO receive representation and save it here
  // TODO it can be an array of representations
  public constructor(
    request: Request,
    resourceHandlers: ResourceHandler[],
    resourceIdClasses: (typeof ResourceId)[]
  ) {
    this._request = request;
    this._params = request.params;
    this._query = request.query;

    //extract version
    this._version = request.params[Service.getVersionParamId()];

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

  public get representation(): Representation {
    return this._representation;
  }

  public getResource(resourceIdentifier?: string): Resource | undefined {
    if (resourceIdentifier == null) {
      return this.curResource;
    } else {
      return this.resources.get(resourceIdentifier)
    }
  }
}