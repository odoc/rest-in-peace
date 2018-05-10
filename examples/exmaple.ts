import {
  Representation,
  Schema,
  ResourceHandler,
  Method,
  ResourceRequest,
  Resource,
  ResourceResponse,
  Service,
  createService,
  SuccessResponse,
  ClientErrorResponse,
  Identity
} from './../src/main';

interface UserInterface {
  name: string,
  username: string,
  password?: string,
  address: any,
  age: number
}

// User Model where we have the app logic
// Also model is responsible of loading/unloading content

class Address {
  public line1: string;
  public line2: string;
  public street: true;
  public country: string
  public code: number;
  constructor(json: any) {
    this.line1 = json.line1;
    this.line2 = json.line2;
    this.street = json.street;
    this.country = json.country;
    this.code = json.code;
  }
  public toJSON() {
    return {
      line1: this.line1,
      line2: this.line2,
      street: this.street,
      country: this.country,
      code: this.code
    }
  }
}
class User {
  public name: string;
  public username: string;
  public password: string;
  public address: Address;
  public age: number
  constructor(json: any) {
    this.name = json.name;
    this.username = json.username;
    this.password = json.password;
    this.address = new Address(json.address);
    this.age = json.age;
  }

  private static users = new Map<string, User>();

  public static create(user: User): boolean {
    if (User.users.has(user.username)) {
      return false;
    }
    User.users.set(user.username, user);
    return true;
  }

  public static upsert(user: User) {
    User.users.set(user.username, user);
  }

  public static get(username: string): User | undefined {
    return User.users.get(username);
  }

  public static getAll(): User[] {
    let result: User[] = [];
    User.users.forEach((user) => result.push(user));
    return result;
  }
}

class UserRepresentation extends Representation {
  public static parse(json: any): UserRepresentation {
    return new UserRepresentation(json);
  }

  public static getValidataionSchema(): Schema {
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
      "age": { _schema: true, mandatory: false, type: "number" }
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
    if (method == Method.POST) { // anyone can create a user
      return false;
    }
    return true;
  }

  protected getAuthorizationRoles(method: Method | string): string[] {
    // only admin can delete and query all users
    if (method == Method.DELETE || method == Method.GET_ALL) {
      return ["admin"];
    } else {
      return ["user"] // all other methods can be done by normal users
    }
  }

  protected getRepresentationClass(version: number): typeof Representation {
    return UserRepresentation;
  }

  protected async onGetAll(
    request: ResourceRequest
  ): Promise<ResourceResponse> {
    // only admin roles can access this.
    const users: User[] = User.getAll();
    let userReps: UserRepresentation[] = [];
    users.forEach((user) => {
      userReps.push(UserRepresentation.fromModel(user));
    })

    // this is an array of reprsetatnions
    return Promise.resolve(SuccessResponse.OK(true, userReps));
  }

  private checkResourceAccess(resource: Resource,
    identity?: Identity
  ): ResourceResponse | undefined {
    // Check whether this user has access to this item
    if (identity == undefined ||
      identity.userId != resource.id.value
    ) {
      return ClientErrorResponse.notFound();
    }
    return
  }

  protected async onGet(
    request: ResourceRequest
  ): Promise<ResourceResponse> {
    const resource = <Resource>request.getResource();
    const accessError = this.checkResourceAccess(resource, request.identity);
    if (accessError != undefined) {
      return Promise.resolve(accessError);
    }

    // Get user account
    const user = User.get(resource.id.value);
    if (user == undefined) {
      return Promise.resolve(ClientErrorResponse.notFound())
    } else {
      const userRep = UserRepresentation.fromModel(user);
      return Promise.resolve(SuccessResponse.OK(false, userRep))
    }
  }

  // idempotent put
  protected async onPut(
    request: ResourceRequest
  ): Promise<ResourceResponse> {

    const resource = <Resource>request.getResource();
    const accessError = this.checkResourceAccess(resource, request.identity);
    if (accessError != undefined) {
      return Promise.resolve(accessError);
    }
    let userRep = <UserRepresentation>request.representation;
    let user = new User(userRep.getJSON());
    User.upsert(user);
    return Promise.resolve(SuccessResponse.OK(false, userRep))
  }

  protected async onPost(
    request: ResourceRequest
  ): Promise<ResourceResponse> {
    if (request.isArray) {
      (<Representation[]>request.allRepresentations).forEach(rep => {
        const user = new User(rep);
        User.create(user);
      });
      return Promise.resolve(SuccessResponse.OK(
        true,
        request.allRepresentations)
      );
    } else {
      const rep = request.representation;
      const user = new User(rep);
      User.create(user);
      return Promise.resolve(SuccessResponse.OK(false, rep));
    }
  }

  protected async onDelete(
    request: ResourceRequest
  ): Promise<ResourceResponse> {
    return Promise.resolve(ClientErrorResponse.methodNotAllowed());
  }
  protected async onCustomMethod(
    method: string,
    request: ResourceRequest
  ): Promise<ResourceResponse> {
    return Promise.resolve(ClientErrorResponse.methodNotAllowed());
  }
}

// TODO write auth hander to acccept token which is same as username

const authHandler = MyServiceAuthHandler.getHandler()
let myService = new Service("MyService", 8080, "/MyService", [1], authHandler)

const usersHandler = new UsersResourceHandler(myService);
const nestedBookHandler = new BooksResourceHandler(myService, usersHandler); // /usres/1/books/b1
const bookHandler = new BooksResourceHandler(myService); // /books/b1

myService.listen();
