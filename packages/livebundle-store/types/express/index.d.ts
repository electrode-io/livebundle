// eslint-disable-next-line
import { Bundle, Package, Store } from "../index";

declare global {
  namespace Express {
    export interface Request {
      text: string;
      // eslint-disable-next-line
      params: any;
      store: Store;
      bundle: Bundle;
      pkg: Package;
    }
  }
}
