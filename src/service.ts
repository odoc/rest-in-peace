//TODO for unhandled resource paths send 404 with json body.

import { AuthHandler } from './authHandler';
import { ResourceHandler } from './resourceHandler';
import { Identity } from './identity';
import { Express, Router } from 'express'
import express from 'express';
import bodyParser from 'body-parser';
import { Server } from 'http';
import { ClientErrorResponse } from './responses/clientErrorResponse';
import { AddressInfo } from 'net';

const IS_DEV = process.env.NODE_ENV == 'development'

export interface ServiceInterface {
  listen(callback?: Function): Server;
  getBaseUrl(): string | undefined;
}

export function createService(
  name: string,
  port: number,
  basePath: string,
  supportedVersions: number[],
  authHandler?: AuthHandler
): ServiceInterface {
  const service: ServiceInterface = new Service(
    name,
    port,
    basePath,
    supportedVersions,
    authHandler
  );
  return service;
}

const VERSION_ID = "version";

export class Service implements ServiceInterface {
  private name: string;
  private port: number;
  private basePath: string;
  private supportedVersions: number[];
  private authHandler?: AuthHandler;

  private app: Express;
  private server?: Server;
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
    return IS_DEV;
  }

  constructor(
    //@ts-ignore
    name: string,
    port: number,
    basePath: string,
    supportedVersions: number[],
    authHandler?: AuthHandler) {

    this.name = name;
    this.port = port;
    this.basePath = basePath;
    // Sort and remove duplicates in supported versions
    supportedVersions.sort();
    this.supportedVersions = [];
    for (let i = 0, last = -1; i < supportedVersions.length; ++i) {
      if (supportedVersions[i] != last) {
        this.supportedVersions.push(supportedVersions[i]);
      }
      last = supportedVersions[i];
    }
    if (this.supportedVersions.length == 0 || this.supportedVersions[0] < 1) {
      throw new Error(
        `No or invalid supportedVersions in service ${this.name}`
      );
    }
    this.authHandler = authHandler;

    if (!Service.acquirePort(port)) {
      throw new Error(`Port already taken: ${port}`);
    }
    this.app = express()
    this.serviceRouter = express.Router({ mergeParams: true });
    if (this.basePath[0] != '/') {
      this.basePath = `/${this.basePath}`;
    }
    this.app.use(bodyParser.json());
    this.app.use(<any>((err: any,
      //@ts-ignore
      req: any,
      res: any,
      next: any
    ) => {
      if ((err instanceof SyntaxError)) {
        const error = ClientErrorResponse.badRequest(err.message);
        error.send(res);
      } else {
        next();
      }
    }));
    this.app.use(`${this.basePath}/:${VERSION_ID}`, this.serviceRouter);
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
    if (this.server != undefined) {
      throw new Error("Can't listen more than once");
    }
    this.server = this.app.listen(this.port, callback);
    return this.server;
  }

  public getSupportedVersions(): number[] {
    return this.supportedVersions;
  }

  public getBaseUrl(): string | undefined {
    if (this.server == undefined) {
      return undefined;
    }
    const address = this.server.address() as AddressInfo;
    const version = this.supportedVersions[this.supportedVersions.length - 1];
    return `${address.address}:${address.port}${this.basePath}/v${version}`;
  }
}