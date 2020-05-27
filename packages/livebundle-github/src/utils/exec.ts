import cp from "child_process";

export default function exec(cmd: string): void {
  cp.execSync(cmd, {
    stdio: "inherit",
  });
}
