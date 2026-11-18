// =============================================
// LÍMITE DE INTENTOS (T7)
// Contadores en memoria por ventana fija. Alcanza para un solo proceso
// (el despliegue actual en Railway); con varias réplicas habría que
// llevarlos a una tabla o a un almacén compartido.
//
// El login cuenta los intentos FALLIDOS y los que están EN CURSO, con dos
// claves:
//   - cuenta + IP: 5 por ventana. Se usa la combinación y no sólo el email
//     para que nadie pueda bloquear la cuenta de otro escribiéndola mal
//     a propósito desde su propia IP.
//   - IP: 50 por ventana, contra el barrido de muchas cuentas.
// El cupo se reserva de forma síncrona, antes de la primera espera (consulta
// SQL y bcrypt): así una ráfaga de pedidos simultáneos no puede pasar entera
// el control. Si el acceso es correcto se limpia el contador de la cuenta +
// IP y se devuelve el cupo de la IP; si la base falla se devuelven los dos
// (no fue un intento con contraseña incorrecta).
// =============================================

interface Bucket { count: number; resetAt: number }

export const WINDOW_MS = 15 * 60_000;
export const LIMITS = { account: 5, ip: 50, emailRequest: 3 } as const;

const buckets = new Map<string, Bucket>();

function current(key: string, now: number): Bucket | undefined {
  const b = buckets.get(key);
  if (b && b.resetAt <= now) { buckets.delete(key); return undefined; }
  return b;
}

function increment(key: string, now: number): void {
  const b = current(key, now);
  if (b) b.count += 1;
  else buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
  // Limpieza ocasional para que el mapa no crezca sin límite
  if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
}

/** Segundos que faltan si la clave ya alcanzó su límite; null si puede seguir. */
function retryAfter(key: string, limit: number, now: number): number | null {
  const b = current(key, now);
  return b && b.count >= limit ? Math.max(1, Math.ceil((b.resetAt - now) / 1000)) : null;
}

const accountKey = (email: string, ip: string) => `login:acct:${email}|${ip}`;
const ipKey = (ip: string) => `login:ip:${ip}`;

/** ¿Está bloqueado el login para este email desde esta IP? Devuelve segundos de espera o null. */
export function loginBlockedFor(email: string, ip: string, now = Date.now()): number | null {
  return retryAfter(accountKey(email, ip), LIMITS.account, now) ?? retryAfter(ipKey(ip), LIMITS.ip, now);
}

function decrement(key: string, now: number): void {
  const b = current(key, now);
  if (b) b.count = Math.max(0, b.count - 1);
}

/**
 * Reserva un intento de login. Si la cuenta + IP o la IP ya alcanzaron su
 * límite devuelve los segundos de espera y no reserva nada; si no, cuenta el
 * intento como fallido hasta que se confirme lo contrario y devuelve null.
 * Es síncrona a propósito: no hay ninguna espera entre el control y la reserva.
 */
export function reserveLoginAttempt(email: string, ip: string, now = Date.now()): number | null {
  const wait = loginBlockedFor(email, ip, now);
  if (wait !== null) return wait;
  increment(accountKey(email, ip), now);
  increment(ipKey(ip), now);
  return null;
}

/** Acceso correcto: limpia la cuenta + IP y devuelve el cupo de la IP. */
export function loginSucceeded(email: string, ip: string, now = Date.now()): void {
  buckets.delete(accountKey(email, ip));
  decrement(ipKey(ip), now);
}

/** Error interno (no se llegó a comparar la contraseña): devuelve los dos cupos. */
export function releaseLoginAttempt(email: string, ip: string, now = Date.now()): void {
  decrement(accountKey(email, ip), now);
  decrement(ipKey(ip), now);
}

/**
 * Pedidos que mandan correos (recuperar contraseña, reenviar verificación):
 * 3 por email e IP por ventana, para que no se usen para inundar una casilla.
 * Devuelve segundos de espera si ya se alcanzó el límite; si no, lo cuenta.
 */
export function takeEmailRequest(kind: string, email: string, ip: string, now = Date.now()): number | null {
  const key = `mail:${kind}:${email}|${ip}`;
  const wait = retryAfter(key, LIMITS.emailRequest, now);
  if (wait === null) increment(key, now);
  return wait;
}

/** Sólo para pruebas. */
export function resetRateLimits(): void {
  buckets.clear();
}
