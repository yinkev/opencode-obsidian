import { createServer, AddressInfo } from "net";

export async function findFreePort(
  startPort: number = 14096,
  maxAttempts: number = 100
): Promise<number> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = startPort + attempt;
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
  }
  throw new Error(
    `No free port found in range ${startPort}-${startPort + maxAttempts - 1}`
  );
}

export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();

    server.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once("listening", () => {
      const address = server.address() as AddressInfo;
      server.close(() => {
        resolve(address.port === port);
      });
    });

    server.listen(port, "127.0.0.1");
  });
}
