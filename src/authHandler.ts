import { Identity } from './identity';

export abstract class AuthHandler {
  public abstract async authenticate(token: string): Promise<Identity | null>;
}