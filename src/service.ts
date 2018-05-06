import { AuthHandler } from './authHandler';
import { ResourceHandler } from './resourceHandler';
import { Identity } from './identity';
import { Express, Router, } from 'express'
import express from 'express';
import { Server } from 'http';

export interface ServiceInterface {
  listen(callback: Function): Server;

}

export function createService(
  name: string,
  port: number,
  basePath: string,
  supportedVersions: number[],
  authHandler?: AuthHandler
): ServiceInterface {
  return new Service(name, port, basePath, supportedVersions, authHandler);
}


export class Service implements ServiceInterface {
  private name: string;
  private port: number;
  private basePath: string;
  private supportedVersions: number[];
  private authHandler?: AuthHandler;

  private app: Express;
  private serviceRouter: Router;
  private resourceHandlers: ResourceHandler[] = [];

  private static ports = new Set<number>();
  private static acquirePort(port: number): boolean {
    if (Service.ports.has(port)) {
      return false;
    }
    Service.ports.add(port);
    return true;
  }

  constructor(
    name: string,
    port: number,
    basePath: string,
    supportedVersions: number[],
    authHandler?: AuthHandler) {

    this.name = name;
    this.port = port;
    this.basePath = basePath;
    this.supportedVersions = supportedVersions;
    this.authHandler = authHandler;

    if (!Service.acquirePort(port)) {
      throw new Error(`Port already taken: ${port}`);
    }
    this.app = express()
    this.serviceRouter = express.Router();
    this.app.use(this.basePath, this.serviceRouter);
  }

  public registerResourceHandler(
    handler: ResourceHandler,
    parentHandler?: ResourceHandler
  ) {
    if (parentHandler == null) {
      this.serviceRouter.use(
        handler.getResourceIdentifierInPlural(),
        handler.getRouter()
      );
    } else {
      parentHandler.getRouter().use(
        handler.getResourceIdentifierInPlural(),
        handler.getRouter()
      );
    }
    this.resourceHandlers.push(handler);
  }

  public async getIdentity(token?: string): Promise<Identity | null> {
    if (token == null || this.authHandler == null) {
      return Promise.resolve(null);
    } else {
      const identity = await this.authHandler.authenticate(token);
      return Promise.resolve(identity);
    }
  }

  public listen(callback?: Function): Server {
    const server = this.app.listen(this.port, callback);
    return server;
  }
}