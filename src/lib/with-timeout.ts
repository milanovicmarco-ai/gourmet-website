// Helper compartido para envolver promesas con timeout duro.
//
// Caso de uso típico: pages Server Component con Promise.all de varios
// fetches. Sin esto, un fetch que cuelga (sin nunca rechazar) bloquea la
// página entera porque Promise.all espera al más lento. .catch() no salva
// porque solo se dispara con rechazo explícito.
//
// Si pasa `ms` sin resolver, resuelve con `fallback` y loguea en server.

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
  fallback: T,
): Promise<T> {
  return Promise.race<T>([
    promise.catch((err) => {
      console.warn(`[withTimeout] ${label} rechazó:`, (err as Error).message);
      return fallback;
    }),
    new Promise<T>((resolve) =>
      setTimeout(() => {
        console.warn(`[withTimeout] ${label} timeout >${ms}ms — usando fallback`);
        resolve(fallback);
      }, ms),
    ),
  ]);
}
