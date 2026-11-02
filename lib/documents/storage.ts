import { constants } from "node:fs";
import { mkdir, realpath, open, unlink, link } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { MAX_DOCUMENT_BYTES } from "@/lib/document-files";

export class DocumentStorageError extends Error {}

const keyPattern = /^orders\/[1-9]\d{0,9}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isWithin(parent: string, child: string) {
  const path = relative(parent, child);
  return path === "" || (!path.startsWith(".." + sep) && path !== ".." && !isAbsolute(path));
}

async function rootDirectory() {
  const configured = process.env.DOCUMENTS_DIRECTORY;
  if (!configured || !isAbsolute(configured)) {
    throw new DocumentStorageError("DOCUMENTS_DIRECTORY must be an absolute private directory.");
  }
  const directory = resolve(configured);
  const publicDirectory = resolve(process.cwd(), "public");
  if (isWithin(publicDirectory, directory) || directory.split(sep).includes("public_html")) {
    throw new DocumentStorageError("Documents must be stored outside public website directories.");
  }
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const root = await realpath(directory);
  const publicRoot = await realpath(publicDirectory).catch(() => publicDirectory);
  if (isWithin(publicRoot, root) || root.split(sep).includes("public_html")) {
    throw new DocumentStorageError("The document directory resolves to a public website directory.");
  }
  return root;
}

async function documentPath(key: string, createParent = false) {
  if (!keyPattern.test(key)) throw new DocumentStorageError("Invalid document storage path.");
  const root = await rootDirectory();
  const parent = join(root, ...key.split("/").slice(0, -1));
  if (createParent) await mkdir(parent, { recursive: true, mode: 0o700 });
  // Reject symlinked subdirectories that could escape private storage.
  const actualParent = await realpath(parent);
  if (!isWithin(root, actualParent)) throw new DocumentStorageError("Invalid document directory.");
  return join(actualParent, key.split("/").at(-1)!);
}

export function isMissingDocument(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

// Stream bytes to a private temporary file; publish only a complete upload.
export async function writeDocument(key: string, body: ReadableStream<Uint8Array>, expectedSize: number) {
  if (!Number.isSafeInteger(expectedSize) || expectedSize <= 0 || expectedSize > MAX_DOCUMENT_BYTES) {
    throw new DocumentStorageError("Choose a non-empty file no larger than 300 MB.");
  }
  const destination = await documentPath(key, true);
  const temporary = destination + "." + randomUUID() + ".part";
  let size = 0;
  const limit = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      size += chunk.length;
      if (size > expectedSize || size > MAX_DOCUMENT_BYTES) {
        callback(new DocumentStorageError("The upload exceeds its declared size or the 300 MB limit."));
      } else callback(null, chunk);
    },
  });
  const handle = await open(temporary, "wx", 0o600);
  try {
    await pipeline(
      Readable.fromWeb(body as Parameters<typeof Readable.fromWeb>[0]),
      limit,
      handle.createWriteStream(),
    );
    if (size !== expectedSize) throw new DocumentStorageError("The uploaded file is incomplete.");
    // link() fails rather than overwriting an existing completed document.
    await link(temporary, destination);
    return size;
  } finally {
    await handle.close();
    await unlink(temporary).catch(error => { if (!isMissingDocument(error)) throw error; });
  }
}

export async function openDocument(key: string) {
  const file = await documentPath(key);
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = await handle.stat();
    if (!info.isFile()) throw new DocumentStorageError("Not a document file.");
    return { size: info.size, stream: handle.createReadStream() };
  } catch (error) {
    await handle.close();
    throw error;
  }
}

export async function removeDocumentFile(key: string) {
  try {
    await unlink(await documentPath(key));
  } catch (error) {
    // Makes deletion retryable when the file is gone but metadata still remains.
    if (!isMissingDocument(error)) throw error;
  }
}
