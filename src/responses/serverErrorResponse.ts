import { ErrorResponse } from './errorResponse';
import { Service } from './../service';

enum ServerErrorHttpStatusCode {
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

  // exception in server
  public static internalServerError(error: Error) {
    return new ServerErrorResponse(
      ServerErrorHttpStatusCode.InternalServerError,
      error.message,
      error.stack
    );
  }

  // any custom method that server doesn't implements
  public static notImplemented() {
    return new ServerErrorResponse(
      ServerErrorHttpStatusCode.NotImplemented
    );
  }

  public static badGateway(errorMessage?: string) {
    return new ServerErrorResponse(
      ServerErrorHttpStatusCode.BadGateway,
      errorMessage
    );
  }
}