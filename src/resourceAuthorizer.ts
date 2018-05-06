import { ResourceHandler, ResourceAccessInfo, Method } from "./resourceHandler";
import { Request, Response } from 'express'
import { Service } from './service';

export class ResourceAuthorizer {
  public constructor(
    private resourceHandler: ResourceHandler,
    private requestHandler: (
      method: Method | string,
      request: Request,
      response: Response,
    ) => void,
    private accessInfo: ResourceAccessInfo,
    private method: Method | string
  ) {
    this.handler = this.handler.bind(this);
  }

  public async handler(request: Request, response: Response) {
    if (this.accessInfo.isAuthenticated) {
      const identity = await (<Service>this.resourceHandler.getService())
        .getIdentity(
          request.headers.authorization
        );
      let errorResponse: ErrorResourceResponse | null = null;
      if (identity == null) {
        errorResponse = ErrorResourceResponse.getUnauthenticated();
      } else {
        const supportedRoles = this.accessInfo.supportedRoles;
        const roles = identity.getSortedRoles();
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
      if (errorResponse != null) {
        errorResponse.send(response);
        return;
      }
    }
    this.requestHandler(this.method, request, response);
  }
}