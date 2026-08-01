import { generateIv, generateVaultKey, wrapVaultKey, unwrapVaultKey, encryptPayload } from "./aes-gcm";
import { base64UrlToBytes, bytesToBase64Url } from "./utils";
import { DecryptedDocumentMetadata } from "../types/document";

export async function encryptFile(
  file: File,
  vaultKey: CryptoKey,
  description?: string
): Promise<{
  ciphertextBuffer: ArrayBuffer;
  metadataCiphertext: string;
  metadataIv: string;
  ciphertextSha256: string;
  ciphertextSize: number;
}> {
  const fileBytes = await file.arrayBuffer();

  const fileKey = await generateVaultKey();
  const fileIv = generateIv(12);

  const encryptedFileBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: fileIv as BufferSource },
    fileKey,
    fileBytes
  );

  const { wrappedKey: wrappedFileKey, iv: fileKeyIv } = await wrapVaultKey(fileKey, vaultKey);

  const metadata: DecryptedDocumentMetadata = {
    originalName: file.name,
    mimeType: file.type || "application/octet-stream",
    plaintextSize: file.size,
    description: description?.trim() || undefined,
    wrappedFileKey,
    fileKeyIv,
    fileIv: bytesToBase64Url(fileIv),
  };

  const metadataEncrypted = await encryptPayload(metadata, vaultKey);

  const hashBuffer = await crypto.subtle.digest("SHA-256", encryptedFileBuffer);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return {
    ciphertextBuffer: encryptedFileBuffer,
    metadataCiphertext: metadataEncrypted.ciphertext,
    metadataIv: metadataEncrypted.iv,
    ciphertextSha256: hashHex,
    ciphertextSize: encryptedFileBuffer.byteLength,
  };
}

export async function decryptFile(
  ciphertextBuffer: ArrayBuffer,
  metadata: DecryptedDocumentMetadata,
  vaultKey: CryptoKey
): Promise<Blob> {
  const fileKey = await unwrapVaultKey(
    metadata.wrappedFileKey,
    metadata.fileKeyIv,
    vaultKey
  );

  const fileIvBytes = base64UrlToBytes(metadata.fileIv);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fileIvBytes as BufferSource },
    fileKey,
    ciphertextBuffer
  );

  return new Blob([decryptedBuffer], { type: metadata.mimeType });
}
