class AuthenticationResponse {
  private identity: Identity;
  private permissions: Permissions;
  constructor(identity: Identity, permissions: Permissions) {
    this.identity = identity;
    this.permissions = permissions;
  }
}