import { ResourceHandler, ResourceAccessInfo, Method } from "./resourceHandler";
import { Request, Response } from 'express'
import { Service } from './service';
import { Identity } from "./identity";

export class ResourceAuthorizer {
  public constructor(
    private resourceHandler: ResourceHandler,
    private requestHandler: (
      method: Method | string,
      request: Request,
      response: Response,
      identity?: Identity
    ) => void,
    private accessInfo: ResourceAccessInfo,
    private method: Method | string
  ) {
    this.handler = this.handler.bind(this);
  }

  public async handler(request: Request, response: Response) {
    let identity: Identity | undefined = undefined;
    if (this.accessInfo.isAuthenticated) {
      identity = await (<Service>this.resourceHandler.getService())
        .getIdentity(
          request.headers.authorization
        );
      let errorResponse: ErrorResourceResponse | undefined = undefined;
      if (identity == undefined) {
        errorResponse = ErrorResourceResponse.getUnauthenticated();
      } else {
        const supportedRoles = this.accessInfo.supportedRoles;
        const roles = identity.sortedRoles;
        // TODO search two sorted array for non-empty join
        let found = false;
        if (supportedRoles.length > 0 && roles.length > 0) {
          let supportedPos = 0, rolesPos = 0;
          while (true) {
            if (supportedRoles[supportedPos] == roles[rolesPos]) {
              found = true;
              break;
            } else if (supportedRoles[supportedPos] < roles[rolesPos]) {
              supportedPos++;
              if (supportedPos == supportedRoles.length) {
                break;
              }
            } else {
              rolesPos++;
              if (rolesPos == roles.length) {
                break;
              }
            }
          }
        }
        if (!found) {
          errorResponse = ErrorResourceResponse.getUnauthorized();
        }
      }
      if (errorResponse != undefined) {
        errorResponse.send(response);
        return;
      }
    }
    this.requestHandler(this.method, request, response, identity);
  }
}