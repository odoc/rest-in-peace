import { Service, ServiceInterface } from './service';
import { Router, Express, Request, Response } from 'express';
import { Identity } from './identity';
import { ResourceAuthorizer } from './resourceAuthorizer'

export enum Method {
  GET = "GET", // get a specific resource
  PUT = "PUT", // put a specific resource
  // post a resrouce to create. Any other use of post should have it's own
  // custom method
  POST = "POST",
  DELETE = "DELETE", // delete a specific resource
  GET_ALL = "GET_ALL" // get all on resources
}

const METHODS = new Set<Method>([
  Method.GET,
  Method.GET_ALL,
  Method.PUT,
  Method.POST,
  Method.DELETE
]);

export interface ResourceAccessInfo {
  isAuthenticated: boolean;
  supportedRoles: string[]
}



export abstract class ResourceHandler {
  private service: Service;
  private parentHandler?: ResourceHandler;
  private router: Router;

  private resourceName: string;
  private paramId: string;
  private accessInfo = new Map<Method | string, ResourceAccessInfo>();
  private customMethodNames: string[] = [];
  private allMethodNames: (Method | string)[] = [];

  public constructor(service: ServiceInterface, parentHandler?: ResourceHandler) {
    this.service = service as Service;
    this.parentHandler = parentHandler;


    this.resourceName = this.getResourceIdentifierInPlural();
    this.paramId = `${this.resourceName}Id`;
    this.parseCustomMethods();
    this.parseAccessInfo();

    this.router = Router()
    this.setup()
    this.service.registerResourceHandler(this, parentHandler);
  }

  public getParamId(): string {
    return this.paramId;
  }

  public getService(): ServiceInterface {
    return this.service;
  }

  private parseAccessInfo() {
    this.allMethodNames.forEach((method: Method | string) => {
      this.accessInfo.set(method, {
        isAuthenticated: this.isAuthenticated(method),
        supportedRoles: this.getAuthorizationRoles(method).sort()
      })
    });
  }

  private parseCustomMethods() {
    METHODS.forEach((method: Method) => {
      this.allMethodNames.push(method);
    })
    const arr = this.getCustomMethods();
    arr.forEach((method) => {
      if (METHODS.has(method as Method)) {
        throw new Error(`Invalid custom method name ${method}`);
      }
      this.customMethodNames.push(method);
      this.allMethodNames.push(method);
    })
  }

  // Setup endpoints
  private setup() {
    this.onMethod = this.onMethod.bind(this);

    let authorizers = new Map<Method, ResourceAuthorizer>();
    METHODS.forEach((method: Method) => {
      const authorizer = new ResourceAuthorizer(
        this,
        this.onMethod,
        this.accessInfo.get(method) as ResourceAccessInfo,
        method
      )
      authorizers.set(method, authorizer);
    });

    this.router.get(
      '/',
      (<ResourceAuthorizer>authorizers.get(Method.GET_ALL)).handler
    );

    this.router.get(
      `/:${this.paramId}`,
      (<ResourceAuthorizer>authorizers.get(Method.GET)).handler
    );

    this.router.put(
      `/:${this.paramId}`,
      (<ResourceAuthorizer>authorizers.get(Method.PUT)).handler
    );

    this.router.post(
      '/',
      (<ResourceAuthorizer>authorizers.get(Method.POST)).handler
    );

    this.router.delete(
      `/:${this.paramId}`,
      (<ResourceAuthorizer>authorizers.get(Method.DELETE)).handler
    );

    // Custom handlers
    let customAuthorizers = new Map<string, ResourceAuthorizer>();
    this.customMethodNames.forEach((method) => {
      const auth = new ResourceAuthorizer(
        this,
        this.customMethod.bind(this),
        this.accessInfo.get(method) as ResourceAccessInfo,
        method
      )
      customAuthorizers.set(method, auth);
    })
    this.router.post(
      `/:${this.paramId}`,
      (req: Request, res: Response) => {
        const method: string | null = req.query.method;
        if (method == null) {
          const errorResponse = ErrorResourceResponse.getMethodNotImplemented(method);
          errorResponse.send(res);
        } else {
          const authorizer = customAuthorizers.get(method);
          if (authorizer == null) {
            const errorResponse = ErrorResourceResponse.getMethodNotImplemented(method);
            errorResponse.send(res);
          } else {
            authorizer.handler(req, res);
          }
        }
      }
    );
  }




  // private endpoint listenrs

  private onMethod(method: Method | string, req: Request, res: Response) {
    // Handle all methods here before calling acutal implementation
  }


  // Get be used from extending classes to get the current resource
  protected getResource(): Resource {
    // TODO
  }

  // Retruns the parent resources if exists from top to bottom
  protected getParentResources(): Resource[] {

  }

  // TODO abstract get, put, post and delete : each returning ResourcrResponse

  // Returns the resource name
  protected abstract getResourceIdentifierInPlural(): string;

  protected abstract getCustomMethods(): string[];

  protected abstract getRepresentationClass(
    version: number
  ): typeof Representation;

  // TODO
  // Posts can have a dedicated query key called "method". For each method we
  // should be able to set representations separately. If client doesn't pass
  // an ID then the method has to be create
  protected abstract getRepresentationClassForCustomMethod(
    method: string,
    version: number
  ): typeof Representation;

  protected abstract isAuthenticated(
    method: Method | string
  ): boolean;

  protected abstract getAuthorizationRoles(
    method: Method | string
  ): (AuthHandler.Role | string)[];
}