import _sodium from "libsodium-wrappers";

export async function encryptSecret(
  publicKeyB64: string,
  secretValue: string
): Promise<string> {
  await _sodium.ready;
  const sodium = _sodium;
  const publicKey = sodium.from_base64(
    publicKeyB64,
    sodium.base64_variants.ORIGINAL
  );
  const secretBytes = sodium.from_string(secretValue);

  const encrypted = sodium.crypto_box_seal(secretBytes, publicKey);

  return sodium.to_base64(encrypted, sodium.base64_variants.ORIGINAL);
}
