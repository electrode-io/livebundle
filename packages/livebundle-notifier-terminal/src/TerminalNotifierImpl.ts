import debug from "debug";
import { LiveBundleContentType, Package, Notifier } from "livebundle-sdk";
import chalk from "chalk";

const log = debug("livebundle-notifier-terminal:TerminalNotifierImpl");

export class TerminalNotifierImpl implements Notifier {
  public constructor(
    private readonly logger: { log: (message?: string) => void } = console,
  ) {}

  public static async create(): Promise<TerminalNotifierImpl> {
    return new TerminalNotifierImpl();
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

    const deepLinkUrl: string = generators.deeplink?.deepLinkUrl as string;
    const qrCodeTerminal: string = generators.qrcode?.terminalImage as string;

    if (qrCodeTerminal) {
      this.logger.log(`\n${chalk.bold.blue("QR Code")}\n${qrCodeTerminal}`);
    }

    if (deepLinkUrl) {
      this.logger.log(
        `${chalk.bold.blue("Deep Link URL")}\n${chalk.bold(deepLinkUrl)}`,
      );
    }
  }
}
