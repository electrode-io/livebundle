import cp from "child_process";
import { ExecCmd } from "./types";

export class ExecCmdImpl implements ExecCmd {
  exec(...cmds: string[]): void {
    for (const cmd of cmds) {
      cp.execSync(cmd, {
        stdio: "inherit",
      });
    }
  }
}
