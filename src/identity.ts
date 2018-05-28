export class Identity {
  private _userId: string;
  private _name: string;
  private _roles: string[];
  private didSortRoles: boolean = false;

  public static hasRole(role: string, inRoles: string[]): boolean {
    let l = 0, r = inRoles.length;
    while (r - l > 1) {
      let m = l + Math.floor((r - l) / 2);
      if (role < inRoles[m]) {
        r = m;
      } else {
        l = m;
      }
    }
    return inRoles[l] == role;
  }

  public constructor(userId: string,
    name: string,
    optionallySortedRoles: string[]
  ) {
    this._userId = userId;
    this._name = name;
    this._roles = optionallySortedRoles;
  }

  private sortRoles() {
    // This is inerstion sort because it's very
    // likely that the given list is already sorted.
    // With already sorted assumtion it's O(n) instead of O(n^2)

    // Also if the list is small (say n < 10), then insertion sort is faster
    // than quick sort.

    for (let i = 1; i < this._roles.length; ++i) {
      const curVal = this._roles[i];
      let j = i - 1;
      while (j >= 0 && this._roles[j] > curVal) {
        this._roles[j + 1] = this._roles[j];
        --j;
      }
      this._roles[j + 1] = curVal;
    }

    // Make sure there are no duplicates
    let tempArr: string[] = [];
    let last: string | undefined = undefined;
    for (const role of this._roles) {
      if (role != last) {
        tempArr.push(role);
      }
      last = role;
    }
    this._roles = tempArr;

    this.didSortRoles = true;
  }

  public get userId() {
    return this._userId;
  }

  public get name() {
    return this._name;
  }

  public get sortedRoles(): string[] {
    if (!this.didSortRoles) {
      this.sortRoles();
    }
    return this._roles;
  }

  public hasRole(role: string): boolean {
    if (!this.didSortRoles) {
      this.sortRoles();
    }
    return Identity.hasRole(role, this._roles);
  }
}