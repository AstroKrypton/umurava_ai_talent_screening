import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type StoredUser = {
  id: string;
  name: string;
  organisation: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

const dataDirectory = path.join(process.cwd(), "data", "auth");
const usersFilePath = path.join(dataDirectory, "users.json");

async function ensureStore() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(usersFilePath, "utf8");
  } catch {
    await writeFile(usersFilePath, "[]", "utf8");
  }
}

async function readUsers() {
  await ensureStore();
  const file = await readFile(usersFilePath, "utf8");
  return JSON.parse(file) as StoredUser[];
}

async function writeUsers(users: StoredUser[]) {
  await ensureStore();
  await writeFile(usersFilePath, JSON.stringify(users, null, 2), "utf8");
}

export async function listUsers() {
  return readUsers();
}

export async function findUserByEmail(email: string) {
  const users = await readUsers();
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function createUser(input: Omit<StoredUser, "id" | "createdAt">) {
  const users = await readUsers();
  const normalizedEmail = input.email.toLowerCase().trim();

  if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
    throw new Error("An account with this email already exists.");
  }

  const user: StoredUser = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
    email: normalizedEmail,
  };

  users.push(user);
  await writeUsers(users);
  return user;
}
