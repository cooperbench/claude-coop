import { writeFileSync, mkdirSync } from "fs";
import { CONFIG_DIR, CONFIG_FILE, getMachineName } from "../../config.ts";

export function machineShow(): void {
  console.log(getMachineName());
}

export function machineSet(name: string): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify({ machineName: name }, null, 2));
  console.log(`Machine name updated to "${name}"`);
}
