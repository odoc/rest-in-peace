// This should better be abstract always, forcing developer to define messages.



export abstract class Message {
  protected json: Object;
  public constructor(json: Object) {
    this.json = json;
  }

  public abstract getParseError(): string | null;

  public abstract getJSON(): Object;

  // TODO
  protected getETag(): string | null {
    return null;
  }
}

interface UserMessageInterface {
  name: string;
  password: string;
}

class UserMessage extends Message {
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

