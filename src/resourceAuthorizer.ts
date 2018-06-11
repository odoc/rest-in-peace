import { ResourceHandler, ResourceAccessInfo, Method } from "./resourceHandler";
import { Request, Response } from 'express'
import { Service } from './service';
import { Identity } from "./identity";
import { ClientErrorResponse } from "./responses/clientErrorResponse";
import { ResourceResponse } from "./responses/resourceResponse";
import { ServerErrorResponse } from "./responses/serverErrorResponse";

export class ResourceAuthorizer {
  public constructor(
    private resourceHandler: ResourceHandler,
    private requestHandler: (
      method: Method | string,
      request: Request,
      response: Response,
      identity: Identity | undefined,
      matchingRoles: string[]
    ) => void,
    private accessInfo: ResourceAccessInfo,
    private method: Method | string
  ) {
    this.handler = this.handler.bind(this);
  }

  public async handler(request: Request, response: Response) {
    let identity: Identity | undefined = undefined;
    let matchingRoles: string[] = [];

    if (this.accessInfo.isAuthenticated) {
      let errorResponse: ResourceResponse | undefined = undefined;

      try {
        identity = await (<Service>this.resourceHandler.getService())
          .getIdentity(
            request.headers.authorization
          );
      } catch (e) {
        console.error(e);
        errorResponse = ServerErrorResponse.badGateway(e);
      }
      if (identity == undefined) {
        if (errorResponse == undefined) {
          errorResponse = ClientErrorResponse.unauthorized();
        }
      } else {
        const supportedRoles = this.accessInfo.supportedRoles;
        const roles = identity.sortedRoles;
        // TODO search two sorted array for non-empty join
        if (supportedRoles.length > 0 && roles.length > 0) {
          let supportedPos = 0, rolesPos = 0;
          while (true) {
            if (supportedRoles[supportedPos] == roles[rolesPos]) {
              matchingRoles.push(roles[rolesPos]);
              supportedPos++;
              rolesPos++;
              if (
                supportedPos == supportedRoles.length ||
                rolesPos == roles.length
              ) {
                break;
              }
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
        if (matchingRoles.length == 0) {
          errorResponse = ClientErrorResponse.forbidden();
        }
      }
      if (errorResponse != undefined) {
        errorResponse.send(response);
        return;
      }
    }
    this.requestHandler(this.method,
      request,
      response,
      identity,
      matchingRoles
    );
  }
}