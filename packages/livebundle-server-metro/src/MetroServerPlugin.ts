import debug from "debug";
import { ServerPlugin, ServerOpts } from "livebundle-sdk";
import tmp from "tmp";
import path from "path";
import cp from "child_process";
import fs from "fs-extra";

const log = debug("livebundle-bundler-metro:MetroServerPlugin");

export class MetroServerPlugin implements ServerPlugin {
  private readonly spawn;

  public constructor({
    spawn = cp.spawn,
  }: {
    spawn?: typeof cp.spawn;
  } = {}) {
    this.spawn = spawn;
  }

  public async launchServer(opts?: ServerOpts): Promise<void> {
    log(`launchServer(opts:${JSON.stringify(opts, null, 2)})`);
    return this.darwinStartPackagerInNewWindow({
      args: this.buildCommandArgs(opts),
    });
  }

  public static async create(): Promise<MetroServerPlugin> {
    return new MetroServerPlugin();
  }

  public buildCommandArgs(opts?: ServerOpts): string[] {
    const commandArgs = opts?.rest || [];
    if (opts?.host) {
      commandArgs.push("--host", opts.host);
    }
    if (opts?.port) {
      commandArgs.push("--port", opts.port.toString(10));
    }
    return commandArgs;
  }

  public async darwinStartPackagerInNewWindow({
    cwd = process.cwd(),
    args = [],
  }: {
    cwd?: string;
    args?: string[];
  } = {}): Promise<void> {
    const scriptPath = await this.createStartPackagerScript({
      args,
      cwd,
      scriptFileName: "packager.sh",
    });
    this.spawn("open", ["-a", "Terminal", scriptPath]);
  }

  public async createStartPackagerScript({
    cwd,
    args,
    scriptFileName,
  }: {
    cwd: string;
    args: string[];
    scriptFileName: string;
  }): Promise<string> {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;
    const tmpScriptPath = path.join(tmpDir, scriptFileName);
    await fs.writeFile(
      tmpScriptPath,
      `cd ${cwd}
echo "Running npx react-native start ${args.join(" ")}"
npx react-native start ${args.join(" ")}
`,
    );
    fs.chmodSync(tmpScriptPath, "777");
    return tmpScriptPath;
  }
}
