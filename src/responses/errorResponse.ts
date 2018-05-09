import { ResourceResponse } from './resourceResponse';

export class ErrorResponse extends ResourceResponse {
  protected _errorMessage: string;

  protected constructor(statusCode: number, errorMessage: string) {
    super(statusCode);
    this._errorMessage = errorMessage;
  }

  public getPayload(): any {
    return {
      error: {
        message: this._errorMessage
      }
    }
  }
}


