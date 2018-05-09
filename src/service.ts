//TODO for unhandled resource paths send 404 with json body.

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

const VERSION_ID = "version";

export class Service implements ServiceInterface {
  private name: string;
  private port: number;
  private basePath: string;
  private supportedVersions: number[];
  private authHandler?: AuthHandler;

  private app: Express;
  private serviceRouter: Router;
  private rootResourceHandlers: ResourceHandler[] = [];

  private static ports = new Set<number>();
  private static acquirePort(port: number): boolean {
    if (Service.ports.has(port)) {
      return false;
    }
    Service.ports.add(port);
    return true;
  }

  public static getVersionParamId(): string {
    return VERSION_ID;
  }

  // TODO check environment variables
  public static isDevelopment() {
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
    if (this.basePath[0] != '/') {
      this.basePath = `/${this.basePath}`;
    }
    this.app.use(`/:${VERSION_ID}${this.basePath}`, this.serviceRouter);
  }

  public registerRootResourceHandler(
    handler: ResourceHandler,
    router: Router
  ) {
    this.serviceRouter.use(
      `/${handler.getResourceIdentifierInPlural()}`,
      router
    )
    this.rootResourceHandlers.push(handler);
  }

  public async getIdentity(token?: string): Promise<Identity | undefined> {
    if (token == undefined || this.authHandler == undefined) {
      return Promise.resolve(undefined);
    } else {
      const identity = await this.authHandler.authenticate(token);
      return Promise.resolve(identity);
    }
  }

  public listen(callback?: Function): Server {
    const server = this.app.listen(this.port, callback);
    return server;
  }

  public getSupportedVersions(): number[] {
    return this.supportedVersions;
  }
}