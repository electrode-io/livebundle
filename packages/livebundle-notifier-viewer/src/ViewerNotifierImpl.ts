import debug from "debug";

import { LiveBundleContentType, Package, NotifierPlugin } from "livebundle-sdk";
import open from "open";

const log = debug("livebundle-notifier-terminal:ViewerNotifierImpl");

export class ViewerNotifierImpl implements NotifierPlugin {
  public constructor(private readonly op: typeof open = open) {}

  public static async create(): Promise<ViewerNotifierImpl> {
    return new ViewerNotifierImpl();
  }

  public async notify({
    generators,
    pkg,
    type,
  }: {
    generators: Record<string, Record<string, unknown>>;
    pkg?: Package;
    type: LiveBundleContentType;
  }): Promise<void> {
    log(
      `notify(generators: ${JSON.stringify(
        generators,
        null,
        2,
      )}, pkg: ${JSON.stringify(pkg, null, 2)}, type: ${type})`,
    );

    const qrCodeLocalImagePath: string = generators.qrcode
      ?.localImagePath as string;

    if (qrCodeLocalImagePath) {
      this.op(qrCodeLocalImagePath);
    }
  }
}
