export class Identity {
  private name: string;
  private roles: string[];
  private didSortRoles: boolean = false;
  public constructor(name: string, roles: string[]) {
    this.name = name;
    this.roles = roles;
  }

  private sortRoles() {
    // TODO this should be an inerstion sort because it's very
    // likely that the given list is already sorted
    this.roles.sort();

    this.didSortRoles = true;
  }

  public getName(): string {
    return this.name;
  }

  public getSortedRoles(): string[] {
    if (!this.didSortRoles) {
      this.sortRoles();
    }
    return this.roles;
  }
}