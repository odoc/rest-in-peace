abstract class AuthHandler {
  public abstract async authenticate(token: string): Promise<AuthenticationResponse>;

  public abstract authorize(identity: Identity): Permissions;
}