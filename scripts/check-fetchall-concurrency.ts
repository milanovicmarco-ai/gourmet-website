/** Check hermético del throttle `forEachLimited` (sin framework de tests).
 *  Correr: `npx tsx scripts/check-fetchall-concurrency.ts`
 *  Falla (exit 1) si la concurrencia supera el límite o no procesa todo. */
import { forEachLimited } from "../src/lib/pim/concurrency";

async function main() {
  const LIMIT = 4;
  const N = 21; // no múltiplo del límite → ejercita el último lote parcial
  let inFlight = 0;
  let maxInFlight = 0;
  const processed: number[] = [];

  await forEachLimited([...Array(N).keys()], LIMIT, async (n) => {
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 5));
    inFlight--;
    processed.push(n);
  });

  const errors: string[] = [];
  if (maxInFlight > LIMIT) errors.push(`concurrencia ${maxInFlight} > límite ${LIMIT}`);
  if (processed.length !== N) errors.push(`procesados ${processed.length} ≠ ${N}`);
  if (errors.length) {
    console.error("FAIL:", errors.join("; "));
    process.exit(1);
  }
  console.log(`OK — maxInFlight=${maxInFlight} (≤${LIMIT}), procesados=${processed.length}/${N}`);
}

main();
