import { homedir } from "os";
import * as path from "path";

export function expandTilde(value: string): string {
  if (value === "~") {
    return homedir();
  }
  if (value.startsWith("~/")) {
    return value.replace("~", homedir());
  }
  return value;
}

export function isAbsolutePath(value: string): boolean {
  return path.isAbsolute(value) || /^[A-Za-z]:\\/.test(value);
}
