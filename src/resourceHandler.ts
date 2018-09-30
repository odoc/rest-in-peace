/*  TODOs

Representation base classe and handler parseing representations
ResourceResponse implemntations

*/

import { Service, ServiceInterface } from './service';
import { Router, Request, Response } from 'express';
import { Identity } from './identity';
import { ResourceAuthorizer } from './resourceAuthorizer'
import { ResourceRequest, ResourceId } from './resourceRequest';
import { Representation } from './representation';
import { ResourceResponse } from './responses/resourceResponse';
import { ServerErrorResponse } from './responses/serverErrorResponse';
import { ClientErrorResponse } from './responses/clientErrorResponse';
import { SuccessResponse } from './main';

export enum Method {
  GET = "GET", // get a specific resource
  PUT = "PUT", // put a specific resource
  // post a resrouce to create. Any other use of post should have it's own
  // custom method
  POST = "POST",
  DELETE = "DELETE", // delete a specific resource
  GET_ALL = "GET_ALL" // get all on resources
}

const METHOD_HANDLERS = new Map<Method, string>([
  [Method.GET, "onGet"],
  [Method.GET_ALL, "onGetAll"],
  [Method.PUT, "onPut"],
  [Method.POST, "onPost"],
  [Method.DELETE, "onDelete"]
]);

export interface ResourceAccessInfo {
  isAuthenticated: boolean;
  supportedRoles: string[]
}

export interface RepresentationPair {
  request?: typeof Representation;
  response?: typeof Representation;
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
  private methodHandlers = new Map<Method,
    (request: ResourceRequest) => Promise<ResourceResponse>>();
  private allResourceHandlers: ResourceHandler[] = [];
  private allResourceIdClasses: (typeof ResourceId)[] = [];
  private representationClasses = new Map<number, RepresentationPair>();
  private customRepresentationClasses = new Map<Method | string,
    Map<number, RepresentationPair>>();

  public constructor(service: ServiceInterface, parentHandler?: ResourceHandler) {
    this.service = service as Service;
    this.parentHandler = parentHandler;


    this.resourceName = this.getResourceIdentifierInPlural();
    this.paramId = `${this.resourceName}Id`;
    this.parseCustomMethods();
    this.parseAccessInfo();

    this.router = Router({ mergeParams: true });

    // if (parentHandler == undefined) {
    //   this.router = Router();
    // } else {
    // }

    this.setupMethodHandlers();
    this.setupParentHandlers();
    this.setupRepresentationClasses();

    if (parentHandler == undefined) {
      this.service.registerRootResourceHandler(this, this.router);
    } else {
      parentHandler.getRouter().use(
        `/:${parentHandler.getParamId()}` +
        `/${this.getResourceIdentifierInPlural()}`,
        this.router
      )
    }
  }

  public getParamId(): string {
    return this.paramId;
  }

  public getService(): ServiceInterface {
    return this.service;
  }

  protected getRouter(): Router {
    return this.router;
  }

  /** Sort and remove duplicate roles */
  private processRoles(roles: string[]): string[] {
    roles.sort();
    let result = [];
    let last = undefined;
    for (const role of roles) {
      if (role != last) {
        result.push(role);
      }
      last = role;
    }
    return result;
  }

  private parseAccessInfo() {
    this.allMethodNames.forEach((method: Method | string) => {
      this.accessInfo.set(method, {
        isAuthenticated: this.isAuthenticated(method),
        supportedRoles: this.processRoles(this.getAuthorizationRoles(method))
      })
    });
  }

  private parseRepresentationClasses(
    repClasses: typeof Representation | RepresentationPair
  ): RepresentationPair {
    if (typeof repClasses == 'function') {
      return {
        request: repClasses,
        response: repClasses
      }
    } else {
      return repClasses;
    }
  }

  private setupRepresentationClasses() {
    this.service.getSupportedVersions().forEach((version) => {
      const pair = this.parseRepresentationClasses(
        this.getRepresentationClasses(version)
      )
      if (pair.request != undefined && !pair.request.isRequestSetupDone) {
        throw new Error(
          `Representation ${pair.request.name} setupRequestParser()` +
          `is not called`
        );
      }
      this.representationClasses.set(version, pair);
      this.customMethodNames.forEach((method) => {
        let custom = this.customRepresentationClasses.get(method);
        if (custom == undefined) {
          custom = new Map<number, RepresentationPair>();
          this.customRepresentationClasses.set(method, custom);
        }

        const pair = this.parseRepresentationClasses(
          this.getRepresentationClassesForCustomMethod(
            method,
            version
          )
        );
        if (pair.request != undefined && !pair.request.isRequestSetupDone) {
          throw new Error(
            `Representation ${pair.request.name} setupRequestParser()` +
            `is not called`
          );
        }
        custom.set(version, pair);
      })
    })
  }

  private parseCustomMethods() {
    METHOD_HANDLERS.forEach((_: string, method: Method) => {
      this.allMethodNames.push(method);
    })
    const arr = this.getCustomMethods();
    arr.forEach((method) => {
      if (METHOD_HANDLERS.has(method as Method)) {
        throw new Error(`Invalid custom method name ${method}`);
      }
      this.customMethodNames.push(method);
      this.allMethodNames.push(method);
    })
  }

  // Setting up ancestry
  private setupParentHandlers() {
    let curHandler: ResourceHandler | undefined = this;
    while (curHandler != undefined) {
      this.allResourceHandlers.push(curHandler);
      this.allResourceIdClasses.push(curHandler.getResourceIdClass());
      curHandler = curHandler.parentHandler;
    }
    this.allResourceHandlers.reverse();
    this.allResourceIdClasses.reverse();
  }

  // Setup endpoints
  private setupMethodHandlers() {
    // setup methods
    this.onMethod = this.onMethod.bind(this);
    METHOD_HANDLERS.forEach((handlerName, method: Method) => {
      const func = (this as any)[handlerName] as
        (request: ResourceRequest) => Promise<ResourceResponse>;
      if (func == undefined) {
        throw new Error(`Method handler ${handlerName} does not exist`);
      }
      this.methodHandlers.set(method, func.bind(this));
    });

    let authorizers = new Map<Method, ResourceAuthorizer>();
    METHOD_HANDLERS.forEach((_: string, method: Method) => {
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
        this.onMethod,
        this.accessInfo.get(method) as ResourceAccessInfo,
        method
      )
      customAuthorizers.set(method, auth);
    })
    this.router.post(
      `/:${this.paramId}`,
      (req: Request, res: Response) => {
        const method: string | undefined = req.query.method;
        if (method == undefined) {
          const errorResponse = ServerErrorResponse.notImplemented();
          errorResponse.send(res);
        } else {
          const authorizer = customAuthorizers.get(method);
          if (authorizer == undefined) {
            const errorResponse = ServerErrorResponse.notImplemented();
            errorResponse.send(res);
          } else {
            authorizer.handler(req, res);
          }
        }
      }
    );
  }

  // Handler for all method requests
  private async onMethod(
    method: Method | string,
    req: Request,
    res: Response,
    identity: Identity | undefined,
    matchingRoles: string[]
  ) {
    let response: ResourceResponse | undefined;

    // Validate media types
    if (req.headers.accept != "application/json") {
      response = ClientErrorResponse.notAcceptable();
    } else if (req.headers["content-type"] != "application/json") {
      response = ClientErrorResponse.unsupportedMediaType();
    }

    if (response != undefined) {
      response.send(res);
      return;
    }

    const func = this.methodHandlers.get(method as Method);
    let verStr: string = req.params[Service.getVersionParamId()];
    if (verStr.length > 0 && verStr.charAt(0).toLowerCase() == 'v') {
      verStr = verStr.substr(1);
    }
    let version = parseInt(verStr);
    if (isNaN(version)) {
      version = 0;
    }
    let representationPair: RepresentationPair | undefined;

    // get the correct representation calss
    if (func != undefined) { // in-build method
      representationPair = this.representationClasses.get(version);
    } else { // custom method
      representationPair = (<any>this.customRepresentationClasses.get(method)).
        get(version);
    }

    // recieved API version is not supposed
    if (representationPair == undefined) {
      response = ClientErrorResponse.badRequest(
        `version ${version} not supported.`
      );
      response.send(res);
      return
    }

    // extract representation
    // req.body.data can be an array of representations
    // In such case there need to be additioanl req.body.isArray flag
    let representation: Representation | undefined;
    let representations: Representation[] = [];
    // payload have a top level "data" key
    let data: any = undefined;
    if (req.body != undefined) {
      data = req.body.data;
    }

    // // Trying to catch case where JSON is no parsed due to too large payload
    // // But this logic is not correct - it won't work well with legit GET
    // if (req.body != undefined && req.body.data == undefined &&
    //   req.body.isArray == undefined
    // ) {
    //   response = ClientErrorResponse.unprocessableEntity(
    //     "Invalid payload without isArray and data properties. " +
    //     "Or it can be a case where payload is larger than max-allowed 50MB."
    //   );
    //   response.send(res);
    //   return;
    // }
    let isArray = false;
    if (req.body != undefined && req.body.isArray == true) {
      isArray = true;
    }

    // Array of representation is supported only with PoST
    if (isArray == true && method != Method.POST) {
      response = ClientErrorResponse.unprocessableEntity(
        "Can't accept an array of representations."
      );
      response.send(res);
      return
    }

    if (data != null) {
      try {
        if (isArray == true) {
          if (!Array.isArray(data)) {
            throw new Error("Not an array.");
          }
          if (representationPair.request != undefined) {
            for (let item of data) {
              representations.push(representationPair.request.parseRequest(item));
            }
          }
        } else {
          if (representationPair.request != undefined) {
            representation = representationPair.request.parseRequest(data);
          }
        }
      } catch (e) {
        response = ClientErrorResponse.unprocessableEntity(
          e.message
        );
        response.send(res);
        return;
      }
    }

    // Check whether PUT and POST have representations
    if (representationPair.request != undefined) {
      if ((representation == undefined && method == Method.PUT) ||
        (
          representation == undefined &&
          isArray == false &&
          method == Method.POST) ||
        ( // no array for post
          isArray == true &&
          data == null
        )
      ) {
        response = ClientErrorResponse.badRequest("Missing representation");
        response.send(res);
        return;
      }
    }

    let request: ResourceRequest = new ResourceRequest(
      req,
      this.allResourceHandlers,
      this.allResourceIdClasses,
      version,
      isArray == true ? representations : representation,
      identity,
      matchingRoles
    );

    // Call the correct handler with the generated request
    try {
      if (func != undefined) {
        response = await func(request);
      } else {
        response = await this.onCustomMethod(method, request);
      }
      if (response instanceof SuccessResponse) {
        response.checkRepresentation(
          representationPair.response
        );
      }
    } catch (e) {
      console.error(e);
      response = ServerErrorResponse.internalServerError(e);
    }

    response.send(res);
  }

  // TODO abstract get, put, post and delete : each returning ResourcrResponse

  // Returns the resource name
  public abstract getResourceIdentifierInPlural(): string;

  protected getCustomMethods(): string[] {
    return [];
  }

  protected abstract getRepresentationClasses(
    version: number
  ): typeof Representation | RepresentationPair;

  // Posts have a dedicated query key called "method" which represents custom // methods where POST without "method" query means "create"

  // For each custom method user should be able to set representations
  // separately.
  // If users doesn't provide custom class representations by overriding
  // following method then default representaions are assumed based on the
  // version

  protected getRepresentationClassesForCustomMethod(
    //@ts-ignore
    method: string,
    version: number
  ): typeof Representation | RepresentationPair {
    return this.getRepresentationClasses(version);
  }

  protected abstract isAuthenticated(
    method: Method | string
  ): boolean;

  protected abstract getAuthorizationRoles(method: Method | string): string[];

  protected getResourceIdClass(): typeof ResourceId {
    return ResourceId;
  }

  protected async onGetAll(
    //@ts-ignore
    request: ResourceRequest
  ): Promise<ResourceResponse> {
    return Promise.resolve(ClientErrorResponse.methodNotAllowed());
  }
  protected async onGet(
    //@ts-ignore
    request: ResourceRequest
  ): Promise<ResourceResponse> {
    return Promise.resolve(ClientErrorResponse.methodNotAllowed());
  }
  protected async onPut(
    //@ts-ignore
    request: ResourceRequest
  ): Promise<ResourceResponse> {
    return Promise.resolve(ClientErrorResponse.methodNotAllowed());
  }
  protected async onPost(
    //@ts-ignore
    request: ResourceRequest
  ): Promise<ResourceResponse> {
    return Promise.resolve(ClientErrorResponse.methodNotAllowed());
  }
  protected async onDelete(
    //@ts-ignore
    request: ResourceRequest
  ): Promise<ResourceResponse> {
    return Promise.resolve(ClientErrorResponse.methodNotAllowed());
  }
  protected async onCustomMethod(
    //@ts-ignore
    method: string,
    //@ts-ignore
    request: ResourceRequest
  ): Promise<ResourceResponse> {
    return Promise.resolve(ClientErrorResponse.methodNotAllowed());
  }
}