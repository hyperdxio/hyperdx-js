export function resolveAsyncGlobal(name: string): Promise<any> {
  return new Promise((resolve, reject) => {
    let retries = 0;
    const interval = setInterval(() => {
      if (retries > 20) {
        clearInterval(interval);
        reject(new Error(`Global ${name} not found`));
      }
      if ((window as any)[name]) {
        clearInterval(interval);
        resolve((window as any)[name]);
      }
      retries++;
    }, 100);
  });
}
