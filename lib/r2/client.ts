// Backward-compatible exports for installations that imported the original R2 module.
// New code should use @/lib/storage/object-storage.
export {
  objectKeyForDocument as r2KeyForDocument,
  objectKeyForAvatar as r2KeyForAvatar,
  publicUrlFor,
  presignPutUrl,
  presignGetUrl,
  deleteObject,
} from "@/lib/storage/object-storage";
