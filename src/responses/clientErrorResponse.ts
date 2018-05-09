import { ErrorResponse } from './errorResponse';

enum ClientErrorHttpStatusCode {
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  MethodNotAllowed = 405,
  NotAcceptable = 406,
  Conflict = 409,
  UnsupportedMediaType = 415,
  UnprocessableEntity = 422
}

const ClientErrorMessages = new Map<number, string>([
  [ClientErrorHttpStatusCode.BadRequest, "Bad Request"],
  [ClientErrorHttpStatusCode.Unauthorized, "Unauthorized"],
  [ClientErrorHttpStatusCode.Forbidden, "Forbidden"],
  [ClientErrorHttpStatusCode.NotFound, "Not Found"],
  [ClientErrorHttpStatusCode.MethodNotAllowed, "Method Not Allowed"],
  [ClientErrorHttpStatusCode.NotAcceptable, "Not Acceptable"],
  [ClientErrorHttpStatusCode.Conflict, "Conflict"],
  [ClientErrorHttpStatusCode.UnsupportedMediaType, "Unsupported Media Type"],
  [ClientErrorHttpStatusCode.UnprocessableEntity, "Unprocessable Entity"]
]);

export class ClientErrorResponse extends ErrorResponse {

  protected constructor(statusCode: number, errorMessage?: string) {
    if (errorMessage == undefined) {
      errorMessage = ClientErrorMessages.get(statusCode);
    }
    if (errorMessage == undefined) {
      errorMessage = "Client Error";
    }
    super(statusCode, errorMessage);
  }

  // general bad request, not symantic or syntax error
  public static badRequest(errorMessage?: string) {
    return new ClientErrorResponse(
      ClientErrorHttpStatusCode.BadRequest,
      errorMessage
    )
  }

  // client must authenticate. Authorization is covered by Forbidden
  public static unauthorized() {
    return new ClientErrorResponse(
      ClientErrorHttpStatusCode.Unauthorized
    )
  }

  // unauthorized to access the given method.
  public static forbidden() {
    return new ClientErrorResponse(
      ClientErrorHttpStatusCode.Forbidden
    )
  }

  // resource couldn't be found or not authoized
  public static notFound() {
    return new ClientErrorResponse(
      ClientErrorHttpStatusCode.NotFound
    )
  }

  // When one of the GET, GET_ALL, POST, PUT, POST not implemented.
  public static methodNotAllowed() {
    return new ClientErrorResponse(
      ClientErrorHttpStatusCode.MethodNotAllowed
    )
  }

  // Media-type on accept can't be served
  public static notAcceptable() {
    return new ClientErrorResponse(
      ClientErrorHttpStatusCode.NotAcceptable
    )
  }

  // request conflicts with the current state of the server.

  public static conflict(errorMessage?: string) {
    return new ClientErrorResponse(
      ClientErrorHttpStatusCode.Conflict,
      errorMessage
    )
  }

  public static unsupportedMediaType() {
    return new ClientErrorResponse(
      ClientErrorHttpStatusCode.UnsupportedMediaType
    )
  }

  // folllows content-type but sematics are invalid - i.e. schema issue
  public static unprocessableEnitity(errorMessage?: string) {
    return new ClientErrorResponse(
      ClientErrorHttpStatusCode.UnprocessableEntity,
      errorMessage
    )
  }
}