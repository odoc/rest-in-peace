
export abstract class ResourceResponse {
  private _statusCode: number;

  public get statusCode(): number {
    return this._statusCode;
  }

  protected constructor(statusCode: number) {
    this._statusCode = statusCode;
  }

  public abstract getPayload(): any;
}

