import { Message } from './../src/message';

interface UserMessageInterface {
  name: string;
  password: string;
}

class UserResourceMessage extends Message {
  //@ts-ignore
  protected json: UserMessageInterface;
  public constructor(json: UserMessageInterface) {
    super(json);
  }

  public getParseError(): string | null {
    if (this.json.name == null) {
      return "error"
    }
    return null;
  }

  public getJSON(): UserMessageInterface {
    return this.json;
  }
}


class UsersResourceHandler extends ResourceHandler {
  private static shared = new UsersResourceHandler();
  public static getHandler(): UsersResourceHandler {
    return UsersResourceHandler.shared;
  }


  private constructor() {
    super();
  }

  protected getResourceIdentifierInPlural(): string {
    return "users";
  }

  protected getAuthorization(): ResourceAuthorization {
    return {
      "all": {

      }
    }
  }

  // TODO
  protected getGetParams(): string[] {
    return ["userId"]
  }

  protected getMessageClass(): typeof Message {
    return UserResourceMessage;
  }

  // TODO
  protected getPostMessageClass(): typeof Message | null {
    return null;
  }

  protected getPutMessageClass(): typeof Message | null {
    return null
  }

  public async get(request: ResourceRequest): Promise<ResourceResponse> {


  }

  public async post(request: ResourceRequest): Promise<ResourceResponse> {
    const message = request.getMessage();
    // opetion 1
    let user = new User(message.getJSON());
    await user.save();

    // options 2
    // Not writing this function like this.
    // i.e only line in this function might look like:
    // return ModelResourceResponse.onPost(requst.getMessage(), User);

    // option 3
    // Write special ResouceHandler class (i.e. ModelCRUDResourceHandler)

    const createdUser = UserResourceMessage(user.toJSON());
    return SuccessResourceResponse.onOK(createdUser);
  }

  public async delete(request: ResourceRequest): Promise<ResourceResponse> {
    return ClientErrorResourceResponse.onMethodNotImplemented();
  }
}

let myService = new RESTService("MyService", "/MyService");
const authHandler = MyServiceAuthHandler.getHandler()
myService.setAuthHandler(authHandler);
myService.setSupportedVersions([2, 3, 4]);

const usersHandler = new UsersResourceHandler(myService)
const nestedBookHandler = new BooksResourceHandler(myService, usersHandler); // /usres/1/books/b1
const bookHandler = new BooksResourceHandler(myService); // /books/b1

myService.start();


