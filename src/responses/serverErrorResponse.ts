import { ErrorResponse } from './errorResponse';

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
  protected constructor(
    statusCode: number,
    errorMessage?: string,
    stack?: string
  ) {
    if (errorMessage == undefined) {
      errorMessage = ServerErrorMessages.get(statusCode);
    }
    if (errorMessage == undefined) {
      errorMessage = "Server Error";
    }
    super(statusCode, errorMessage, stack);
  }


  /**
   * 500 Internal Server Error.
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
   * 501 Not Implemented.
   * Any custom method that server doesn't implement
   */
  public static notImplemented() {
    return new ServerErrorResponse(
      ServerErrorHttpStatusCode.NotImplemented
    );
  }

  /**
   * 502 Bad Gateway.
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