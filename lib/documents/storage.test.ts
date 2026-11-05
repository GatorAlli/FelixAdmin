import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { mkdtemp, mkdir, realpath, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { MAX_DOCUMENT_BYTES } from "../document-files";
import { openDocument, removeDocumentFile, writeDocument } from "./storage";

async function fixture(t: TestContext) {
  const application = await mkdtemp(join(tmpdir(), "felix-documents-"));
  const original = process.cwd();
  process.chdir(application);
  const directory = join(application, ".local", "documents");
  await mkdir(directory, { recursive: true });
  t.after(async () => {
    process.chdir(original);
    await rm(application, { recursive: true, force: true });
  });
  return { directory, key: "orders/1/" + randomUUID() };
}

function body(...chunks: string[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach(chunk => controller.enqueue(Buffer.from(chunk)));
      controller.close();
    },
  });
}

test("streams a complete file, downloads it and supports retrying removal", async t => {
  const { directory, key } = await fixture(t);
  assert.equal(await writeDocument(key, body("hello", " world"), 11), 11);
  const document = await openDocument(key);
  assert.equal(document.size, 11);
  const chunks = [];
  for await (const chunk of document.stream) chunks.push(chunk);
  assert.equal(Buffer.concat(chunks).toString(), "hello world");
  assert.equal((await readFile(join(directory, key))).toString(), "hello world");
  await removeDocumentFile(key);
  await removeDocumentFile(key);
  await assert.rejects(openDocument(key), { code: "ENOENT" });
});

test("rejects incomplete, oversized and aborted uploads without keeping partial files", async t => {
  const { directory, key } = await fixture(t);
  await assert.rejects(writeDocument(key, body("12"), 3), /incomplete/);
  await assert.rejects(writeDocument(key, body("12"), 1), /exceeds/);
  await assert.rejects(writeDocument(key, body("x"), MAX_DOCUMENT_BYTES + 1), /300 MB/);
  const aborted = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(Buffer.from("x")); controller.error(new Error("Disconnected")); },
  });
  await assert.rejects(writeDocument(key, aborted, 2), /Disconnected/);
  assert.deepEqual(await readdir(join(directory, "orders", "1")), []);
});

test("does not overwrite an existing completed file", async t => {
  const { directory, key } = await fixture(t);
  await writeDocument(key, body("original"), 8);
  await assert.rejects(writeDocument(key, body("changed"), 7), { code: "EEXIST" });
  assert.equal((await readFile(join(directory, key))).toString(), "original");
  assert.deepEqual(await readdir(join(directory, "orders", "1")), [key.split("/").at(-1)]);
});

test("rejects traversal and symlink escapes", async t => {
  const { directory, key } = await fixture(t);
  for (const unsafe of ["../secret", "orders/1/../../secret", "orders/0/" + randomUUID(), "/etc/passwd"]) {
    await assert.rejects(writeDocument(unsafe, body("x"), 1), /Invalid document storage path/);
  }
  const outside = await mkdtemp(join(tmpdir(), "felix-outside-"));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await mkdir(join(directory, "orders"));
  await symlink(outside, join(directory, "orders", "1"), "dir");
  await assert.rejects(writeDocument(key, body("x"), 1), /Invalid document directory/);
});

test("uses the fixed project-local storage directory", async t => {
  const { directory, key } = await fixture(t);
  await writeDocument(key, body("portable"), 8);
  assert.equal(await realpath(directory), await realpath(join(process.cwd(), ".local", "documents")));
  assert.equal(await readFile(join(directory, key), "utf8"), "portable");
});

test("rejects a storage directory symlinked into public", async t => {
  const { directory, key } = await fixture(t);
  const publicDocuments = join(process.cwd(), "public", "documents");
  await mkdir(publicDocuments, { recursive: true });
  await rm(directory, { recursive: true });
  await symlink(publicDocuments, directory, "dir");
  await assert.rejects(writeDocument(key, body("x"), 1), /public website/);
});

test("does not follow symlinked document files on download", async t => {
  const { directory, key } = await fixture(t);
  const outside = join(directory, "secret.txt");
  await writeFile(outside, "private");
  await mkdir(join(directory, "orders", "1"), { recursive: true });
  await symlink(outside, join(directory, key));
  await assert.rejects(openDocument(key), { code: "ELOOP" });
});
