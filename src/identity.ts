export class Identity {
  // TODO userID
  private name: string;
  private roles: string[];
  private didSortRoles: boolean = false;
  public constructor(name: string, roles: string[]) {
    this.name = name;
    this.roles = roles;
  }

  private sortRoles() {
    // This is inerstion sort because it's very
    // likely that the given list is already sorted.
    // With already sorted assumtion it's O(n) instead of O(n^2)

    // Also if the list is small (say n < 10), then insertion sort is faster
    // than quick sort.

    for (let i = 1; i < this.roles.length; ++i) {
      const curVal = this.roles[i];
      let j = i - 1;
      while (j >= 0 && this.roles[j] > curVal) {
        this.roles[j + 1] = this.roles[j];
        --j;
      }
      this.roles[j + 1] = curVal;
    }

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