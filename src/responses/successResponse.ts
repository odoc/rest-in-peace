
import { ResourceResponse } from './resourceResponse';
import { Representation } from './../representation';

enum SuccessHttpStatusCode {
  OK = 200,
  Created = 201,
  NoContent = 204,
}

export class SuccessResponse extends ResourceResponse {
  private _isArray: boolean;
  private _representation?: Representation;
  private _representations?: Representation[];

  private constructor(
    statusCode: number,
    isArray: boolean,
    representations?: Representation | Representation[]
  ) {
    super(statusCode);
    this._isArray = isArray;
    if (isArray) {
      this._representations = representations as Representation[];
    } else {
      this._representation = representations as Representation;
    }
  }

  public isArray(): boolean {
    return this._isArray;
  }

  public get representation(): Representation | undefined {
    return this._representation;
  }

  public get representations(): Representation[] | undefined {
    return this._representations;
  }

  public getPayload(): any {
    let result: any;
    if (this._isArray) {
      result = []
      if (this._representations != undefined) {
        this._representations.forEach(rep => {
          result.push(rep.getJSON());
        });
      }
    } else {
      result = undefined;
      if (this._representation != undefined) {
        result = this._representation.getJSON();
      }
    }
    return {
      isArray: this._isArray,
      data: result
    }
  }

  public static OK(
    isArray: boolean,
    representations?: Representation | Representation[]
  ): SuccessResponse {
    return new SuccessResponse(
      SuccessHttpStatusCode.OK,
      isArray,
      representations
    );
  }

  public static created(
    isArray: boolean,
    representations: Representation | Representation[]
  ): SuccessResponse {
    return new SuccessResponse(
      SuccessHttpStatusCode.Created,
      isArray,
      representations
    )
  }

  public static noCotent(): SuccessResponse {
    return new SuccessResponse(
      SuccessHttpStatusCode.NoContent,
      false,
      undefined
    );
  }
}