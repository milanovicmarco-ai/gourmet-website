/** Ejecuta `task` sobre cada item con como mucho `limit` en vuelo a la vez.
 *
 *  ponytail: throttle por lotes (chunk + Promise.all por lote), no un pool
 *  rodante. Cap de concurrencia = `limit`. Si algún día importa exprimir el
 *  throughput (que el hueco se rellene en cuanto una tarea acaba, sin esperar
 *  al lote entero), cambiar a un pool rodante. Para limitar la carga contra la
 *  API del backend, los lotes bastan y se leen de un vistazo.
 */
export async function forEachLimited<T>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<void>,
): Promise<void> {
  const size = Math.max(1, Math.floor(limit)); // limit<=0 abriría un bucle infinito
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(task));
  }
}
