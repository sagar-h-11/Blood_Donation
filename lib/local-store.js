import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const LOCAL_STORE_PATH = process.env.PULSELINK_LOCAL_STORE_PATH || join(process.cwd(), ".data", "pulselink.json");
const EMPTY_STORE = {
  donors: [],
  hospitalInventory: [],
};

let writeQueue = Promise.resolve();

export async function readLocalStore() {
  try {
    const rawStore = await readFile(LOCAL_STORE_PATH, "utf8");
    const parsedStore = JSON.parse(rawStore);

    return {
      donors: Array.isArray(parsedStore.donors) ? parsedStore.donors : [],
      hospitalInventory: Array.isArray(parsedStore.hospitalInventory) ? parsedStore.hospitalInventory : [],
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { ...EMPTY_STORE };
    }

    throw error;
  }
}

export async function updateLocalStore(updater) {
  writeQueue = writeQueue.then(async () => {
    const currentStore = await readLocalStore();
    const nextStore = await updater(currentStore);
    await writeLocalStore(nextStore);
    return nextStore;
  });

  return writeQueue;
}

async function writeLocalStore(store) {
  const nextStore = {
    donors: Array.isArray(store.donors) ? store.donors : [],
    hospitalInventory: Array.isArray(store.hospitalInventory) ? store.hospitalInventory : [],
  };
  const temporaryPath = `${LOCAL_STORE_PATH}.${process.pid}.tmp`;

  await mkdir(dirname(LOCAL_STORE_PATH), { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(nextStore, null, 2)}\n`);
  await rename(temporaryPath, LOCAL_STORE_PATH);
}
