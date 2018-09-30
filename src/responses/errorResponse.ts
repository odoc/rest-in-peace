import { ResourceResponse } from './resourceResponse';
import { Service } from './../service';

export class ErrorResponse extends ResourceResponse {
  protected _errorMessage: string;
  private _stack?: string;

  protected constructor(
    statusCode: number,
    errorMessage: string,
    stack?: string
  ) {
    super(statusCode);
    this._errorMessage = errorMessage;
    this._stack = stack
  }

  public getPayload(): any {
    return {
      error: {
        message: this._errorMessage,
        stack: Service.isDevelopment() ? this._stack : undefined
      }
    }
  }

  public static error(status: number, errorMessgae: string, stack?: string) {
    return new ErrorResponse(status, errorMessgae, stack);
  }
}


