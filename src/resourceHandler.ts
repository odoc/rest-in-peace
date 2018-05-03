
enum Method {
  GET = "GET", // get a specific resource
  PUT = "PUT", // put a specific resource
  POST = "POST", // post a resrouce to create
  DELETE = "DELETE", // delete a specific resource
  GET_ALL = "GET_ALL" // get all on resources
}

abstract class ResourceHandler {
  private service: RESTService | null;

  // TODO: pass in the parent resource handler so that
  public constructor(parentHandler: ResourceHandler) {
    this.service = null;
  }

  protected setService(service: RESTService) {
    if (this.service != null) {
      throw new Error(`${this.consutructor.name} has been used with some other service`)
    }
    this.service = service;
  }

  // TODO abstract get, put, post and delete : each returning ResourcrResponse

  // Returns the resource name
  protected abstract getResourceIdentifierInPlural(): string;

  protected abstract getCustomMethods(): string[];

  protected abstract getRepresentation(): typeof Representation;

  // TODO
  // Posts can have a dedicated query key called "method". For each method we
  // should be able to set representations separately. If client doesn't pass
  // an ID then the method has to be create
  protected abstract getRepresentationsForCustomMethod(
    method: string,
  ): typeof Representation;

  protected abstract isAuthenticated(
    method: Method | string
  ): boolean;

  protected abstract getAuthorizationRoles(
    method: Method | string
  ): (AuthHandler.Role | string)[];



}