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

class ResourceRequest {
  private _params: any;
  private _queries: any;
  private _data: ResourceMessage;
  private _version: number;


  public get params(): any {
    return this._params;
  }

  public get queries(): any {
    return this._queries;
  }

  protected constructor(req: Request) {
    // TODO
  }

}