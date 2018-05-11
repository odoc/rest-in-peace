import {
  Representation,
  Schema,
  ResourceHandler,
  Method,
  ResourceRequest,
  Resource,
  Service,
  ResourceResponse,
  createService,
  SuccessResponse,
  ClientErrorResponse,
  Identity,
  AuthHandler
} from './../src/main';

interface CallEventInterface {
  time: number,
  duration: number
}

interface UserInterface {
  name: string,
  username: string,
  password?: string,
  address: any,
  age: number,
  callEvents: CallEventInterface[]
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

class CallEvent {
  public time: Date;
  public duration: number;
  public constructor(json: CallEventInterface) {
    this.time = new Date(json.time);
    this.duration = json.duration;
  }
}
class User {
  public name: string;
  public username: string;
  public password: string;
  public address: Address;
  public age: number
  public callEvents: CallEvent[];
  constructor(json: any) {
    this.name = json.name;
    this.username = json.username;
    this.password = json.password;
    this.address = new Address(json.address);
    this.age = json.age;
    this.callEvents = [];
  }

  private setJSON(json: any) {
    this.name = json.name;
    this.username = json.username;
    this.password = json.password;
    this.address = new Address(json.address);
    this.age = json.age;
  }

  public addCallEvent(event: CallEvent) {
    this.callEvents.push(event);
  }

  public update(json: any) {
    this.setJSON(json);
  }

  private static users = new Map<string, User>();

  public static create(user: User): boolean {
    if (User.users.has(user.username)) {
      return false;
    }
    User.users.set(user.username, user);
    return true;
  }

  public static get(username: string): User | undefined {
    return User.users.get(username);
  }

  public static getAll(age?: number): User[] {
    let result: User[] = [];
    User.users.forEach((user) => {
      if (age == undefined) {
        result.push(user)
      } else if (user.age == age) {
        result.push(user);
      }
    });
    return result;
  }
}

class CallEventRepresentation extends Representation {
  public static parse(json: any): CallEventRepresentation {
    return new CallEventRepresentation(json);
  }

  public static getValidataionSchema(): Schema {
    return {
      time: { _schema: true, mandatory: true, type: "number" },
      duration: { _schema: true, mandatory: true, type: "number" }
    }
  }

  private json: CallEventInterface;

  public constructor(json: CallEventInterface) {
    super(json);
    this.json = json;
  }

  public getJSON(): CallEventInterface {
    return this.json;
  }
}

class UserRepresentation extends Representation {
  public static parse(json: any): UserRepresentation {
    json.callEvents = null; // PUT/POST can't have callEvents
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
    let callEvents: CallEventInterface[] = [];
    user.callEvents.forEach(event => callEvents.push({
      time: event.time.getTime(),
      duration: event.duration
    }));
    return new UserRepresentation({
      name: user.name,
      username: user.username,
      // no password
      address: user.address.toJSON(), // taking to json of this is fine
      age: user.age,
      callEvents: callEvents
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
    //@ts-ignore
    const _ = version
    return UserRepresentation;
  }

  protected getCustomMethods(): string[] {
    return ["addCallEvent"];
  }

  protected getRepresentationClassForCustomMethod(
    //@ts-ignore
    method: string,
    //@ts-ignore
    version: number
  ): typeof Representation {
    return CallEventRepresentation;
  }

  protected async onGetAll(
    request: ResourceRequest
  ): Promise<ResourceResponse> {
    // only admin roles can access this.

    // get age range
    let age: number | undefined = parseInt(request.query.age);
    if (isNaN(age)) {
      age = undefined;
    }
    const users: User[] = User.getAll(age);
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
    if (resource.id.value != userRep.getJSON().username) {
      return Promise.resolve(ClientErrorResponse.conflict("Invalid username"));
    }
    let user = User.get(resource.id.value);
    if (user == undefined) {
      user = new User(userRep.getJSON())
      User.create(user);
      return Promise.resolve(SuccessResponse.created(false,
        UserRepresentation.fromModel(user)));
    } else {
      user.update(userRep.getJSON());
      return Promise.resolve(SuccessResponse.OK(false, UserRepresentation.fromModel(user)))
    }
  }

  protected async onPost(
    request: ResourceRequest
  ): Promise<ResourceResponse> {
    if (request.isArray()) {
      let result: UserRepresentation[] = [];
      (<Representation[]>request.allRepresentations).forEach(rep => {
        const user = new User(rep.getJSON());
        if (User.create(user)) {
          result.push(UserRepresentation.fromModel(user));
        }
      });
      return Promise.resolve(SuccessResponse.created(true, result));
    } else {
      const rep = request.representation;
      const user = new User((rep as Representation).getJSON());
      const result = User.create(user);
      if (!result) {
        return Promise.resolve(ClientErrorResponse.conflict(
          "username not available"
        ));
      }
      return Promise.resolve(SuccessResponse.created(
        false,
        UserRepresentation.fromModel(user)
      ));
    }
  }

  protected async onDelete(
    //@ts-ignore
    request: ResourceRequest
  ): Promise<ResourceResponse> {
    return Promise.resolve(ClientErrorResponse.methodNotAllowed());
  }

  protected async onCustomMethod(
    //@ts-ignore
    method: string,
    //@ts-ignore
    request: ResourceRequest
  ): Promise<ResourceResponse> {
    if (method != "addCallEvent") {
      return Promise.resolve(ClientErrorResponse.methodNotAllowed());
    }

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
      const callEventRep = request.representation as CallEventRepresentation;
      if (callEventRep == undefined) {
        return Promise.resolve(ClientErrorResponse.badRequest(
          "Missing representation"
        ));
      }
      user.addCallEvent(new CallEvent(callEventRep.getJSON()));
      const userRep = UserRepresentation.fromModel(user);
      return Promise.resolve(SuccessResponse.OK(false, userRep))
    }
  }
}

// TODO write auth hander to acccept token which is same as username

class SimpleAuthhandler extends AuthHandler {
  public async authenticate(token: string): Promise<Identity | undefined> {
    if (token == "admin") {
      return Promise.resolve(new Identity("admin", "Admin", ["admin"]))
    }
    const user = User.get(token);
    if (user != undefined) {
      const roles = ["user"];
      const idnetity = new Identity(user.username, user.name, roles);
      return Promise.resolve(idnetity);
    }
    return;
  }
}

const authHandler = new SimpleAuthhandler();
let userService: Service = createService(
  "UserService",
  8081,
  "/UserService",
  [1],
  authHandler
);


//@ts-ignore
const usersHandler = new UsersResourceHandler(userService);
// const nestedBookHandler = new BooksResourceHandler(myService, usersHandler); // /usres/1/books/b1
// const bookHandler = new BooksResourceHandler(myService); // /books/b1

userService.listen();
