import { MongoClient } from "mongodb";

const SHOP_DB = "ultra-shaheens-shop";

const globalForShop = globalThis as typeof globalThis & {
  shopClientPromise?: Promise<MongoClient>;
};

function getShopClient(): Promise<MongoClient> {
  if (!globalForShop.shopClientPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set");
    const client = new MongoClient(uri);
    globalForShop.shopClientPromise = client.connect();
  }
  return globalForShop.shopClientPromise;
}

export async function getShopDb() {
  const client = await getShopClient();
  return client.db(SHOP_DB);
}
