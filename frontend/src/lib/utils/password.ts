// =============================================
// LÍMITE DE CONTRASEÑA (T7)
// bcrypt usa sólo los primeros 72 bytes en UTF-8 y descarta el resto.
// Se mide en bytes, igual que el backend: una tilde, una ñ o un emoji
// ocupan más de uno.
// =============================================

export const PASSWORD_MAX_BYTES = 72;

export function passwordTooLong(pw: string): boolean {
  return new TextEncoder().encode(pw).length > PASSWORD_MAX_BYTES;
}
