import { ErrorResponse } from './errorResponse';
import { Service } from './../service';

export enum ServerErrorHttpStatusCode {
  InternalServerError = 500,
  NotImplemented = 501,
  BadGateway = 502
}

const ServerErrorMessages = new Map<number, string>([
  [ServerErrorHttpStatusCode.InternalServerError, "Internal Server Error"],
  [ServerErrorHttpStatusCode.NotImplemented, "Not implemented"],
  [ServerErrorHttpStatusCode.BadGateway, "Bad Gateway"]
])

export class ServerErrorResponse extends ErrorResponse {
  private _stack?: string;

  protected constructor(statusCode: number,
    errorMessage?: string,
    stack?: string
  ) {
    if (errorMessage == undefined) {
      errorMessage = ServerErrorMessages.get(statusCode);
    }
    if (errorMessage == undefined) {
      errorMessage = "Server Error";
    }
    super(statusCode, errorMessage);
    this._stack = stack;
  }

  public getPayload(): any {
    return {
      error: {
        message: this._errorMessage,
        stack: Service.isDevelopment() ? this._stack : undefined
      }
    }
  }

  /**
   * Exception in server
   */
  public static internalServerError(error: Error) {
    return new ServerErrorResponse(
      ServerErrorHttpStatusCode.InternalServerError,
      error.message,
      error.stack
    );
  }

  /**
   * Any custom method that server doesn't implements
   */
  public static notImplemented() {
    return new ServerErrorResponse(
      ServerErrorHttpStatusCode.NotImplemented
    );
  }

  /**
   * The server, while acting as a gateway or proxy, received an invalid
   * response from the upstream server.
   */
  public static badGateway(error?: string | Error) {
    if (error == undefined || typeof error == 'string') {
      return new ServerErrorResponse(
        ServerErrorHttpStatusCode.BadGateway,
        error
      );
    } else {
      return new ServerErrorResponse(
        ServerErrorHttpStatusCode.BadGateway,
        error.message,
        error.stack
      );
    }
  }
}