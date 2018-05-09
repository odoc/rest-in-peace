import { Representation, Schema } from './../src/representation';
import { ResourceHandler, Method } from './../src/resourceHandler';
import { ResourceRequest } from '../src/resourceRequest';
import { Service } from '../src/service'

interface UserInterface {
  name: string,
  username: string,
  password?: string,
  address: any,
  age: number
}

// Assume user model is already created.

class UserRepresentation extends Representation {
  public static parse(json: any): UserRepresentation {
    return new UserRepresentation(json);
  }

  public static getSchema(): Schema {
    return {
      "name": { _schema: true, mandatory: true, type: "string" },
      "username": { _schema: true, mandatory: true, type: "string" },
      "password": { _schema: true, mandatory: true, type: "string" },
      "address": {
        "line1": true,
        "line2": false,
        "street": true,
        "country": true,
        "code": { _schema: true, mandatory: true, type: "number" }
      },
      "age": false // not optional
    }
  }

  // model -> representation transformation
  public static fromModel(user: User): UserRepresentation {
    return new UserRepresentation({
      name: user.name,
      username: user.username,
      // no password
      address: user.address.toJSON(), // taking to json of this is fine
      age: user.age
    });
  }

  // represtnation -> model transformation is straigth forwards
  // i.e. new User(userRep.getJSON()) works fine
  // Otherwise it might make sense to create another function here called
  // public toModel()

  private json: UserInterface;

  // This is supposed to be called from both the prase() method - (read) and
  // from the API implementation (probably passing what's returned from
  // model.toJSON())
  public constructor(json: UserInterface) {
    super(json);
    this.json = json;
  }

  public getJSON(): any {
    return this.json;
  }
}


class UsersResourceHandler extends ResourceHandler {

  public getResourceIdentifierInPlural(): string {
    return "users";
  }

  protected isAuthenticated(method: Method | string): boolean {
    if (method == Method.POST) {
      return false;
    }
    return true;
  }

  protected getAuthorizationRoles(method: Method | string): string[] {
    if (method == Method.DELETE) {
      return ["admin"];
    } else {
      return ["user"]
    }
  }

  protected getRepresentationClass(version: number): typeof Representation {
    return UserRepresentation;
  }

  protected async onGetAll(
    request: ResourceRequest
  ): Promise<ResourceResponse> {
    // Get users acccounts only this user has access to.
    const users: User[] = await User.getAll<User>(
      { adminUser: request.identity.id }
    );
    let userReps: UserRepresentation[] = [];
    users.forEach((user) => {
      userReps.push(UserRepresentation.fromModel(user));
    })

    // this is an array of reprsetatnions
    return Promise.resolve(SuccessResourceResponse.OK(userReps));
  }
  protected async onGet(
    request: ResourceRequest
  ): Promise<ResourceResponse> {
    // Get user account
    const user: User = await User.get<User>(
      { id: request.identity.id }
    );
    if (user == undefined) {
      return Promise.resolve(ClienetErrorResourceResponse.notFound())
    } else {
      const userRep = UserRepresentation.fromModel(user);
      Promise.resolve(SuccessResourceResponse.OK(userRep))
    }
  }

  // idempotent put
  protected async onPut(
    request: ResourceRequest
  ): Promise<ResourceResponse> {

    // Get user account
    let user: User = await User.get<User>(
      { id: request.identity.id }
    );
    if (user == undefined) {
      user = new User(request.representation.getJSON());
      try {
        user.save()
      } catch (e) {
        Promise.resolve(ServerErrorResourceResponse.serverError("Error creating user"));
      }
      const userRep = UserRepresentation.fromModel(user);
      return Promise.resolve(SuccessResourceResponse.created(userRep));
    } else {
      try {
        user.update(request.representation.getJSON())
      } catch (e) {
        Promise.resolve(ServerErrorResourceResponse.serverError("Error updating user"));
      }
      const userRep = UserRepresentation.fromModel(user);
      Promise.resolve(SuccessResourceResponse.OK(userRep))
    }
  }

  protected async onPost(
    request: ResourceRequest
  ): Promise<ResourceResponse> {
    const userRep = request.representation;
    // opetion 1
    let user = new User(userRep.getJSON());
    // TODO try catch
    await user.save();

    const createdUser = UserRepresentation.fromModel(user)
    return Promise.resolve(SuccessResourceResponse.onOK(createdUser));
  }

  protected async onDelete(
    request: ResourceRequest
  ): Promise<ResourceResponse> {
    // TODO

  }
  protected async onCustomMethod(
    method: string,
    request: ResourceRequest
  ): Promise<ResourceResponse> {

  }
}

const authHandler = MyServiceAuthHandler.getHandler()
let myService = new Service("MyService", 8080, "/MyService", [1], authHandler)

const usersHandler = new UsersResourceHandler(myService);
const nestedBookHandler = new BooksResourceHandler(myService, usersHandler); // /usres/1/books/b1
const bookHandler = new BooksResourceHandler(myService); // /books/b1

myService.listen();
