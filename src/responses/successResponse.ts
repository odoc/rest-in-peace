
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

  public checkRepresentation(repClass: undefined | any) {//typeof Representatio
    if (this._isArray) {
      if (this._representations == undefined && repClass != undefined) {
        throw new Error(`No representations of type ${repClass.name}`)
      } else if (this._representations != undefined) {
        if (repClass != undefined) {
          for (const rep of this._representations) {
            if (!(rep instanceof repClass)) {
              throw new Error(
                `Invalid representation ${rep.getJSON()} when required ` +
                `representation is ${(<typeof Representation>repClass).name}`
              );
            }
          }
        } else if (this._representations.length > 0) {
          throw new Error(`Invalid representaions when there shouldn't be any.`)
        }
      }
    } else {
      if (this._representation == undefined && repClass != undefined) {
        throw new Error(`No representation of type ${repClass.name}`);
      } if (this._representation != undefined) {
        if (repClass != undefined &&
          !(this._representation instanceof repClass)
        ) {
          throw new Error(
            `Invalid representation ${this._representation.getJSON()} when ` +
            `required representation is ${(<typeof Representation>repClass).name}`
          );
        } else if (repClass == undefined) {
          throw new Error(`Invalid representaion when there shouldn't be one.`)
        }
      }
    }
  }

  public static OK(
    isArray: boolean,
    representations: Representation | Representation[]
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