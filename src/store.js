const { getStore } = require('@netlify/blobs');

const STORE_NAME = 'registry';

function registryStore() {
  return getStore(STORE_NAME);
}

// One entry per source host, keyed by hostname, so re-submitting the same
// manifest simply refreshes it rather than duplicating listings.
async function upsertListing(sourceHost, listing) {
  const store = registryStore();
  await store.setJSON(sourceHost, listing);
}

async function removeListing(sourceHost) {
  const store = registryStore();
  await store.delete(sourceHost);
}

async function allListings() {
  const store = registryStore();
  const { blobs } = await store.list();
  const listings = await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' })));
  return listings.filter(Boolean);
}

async function allResources() {
  const listings = await allListings();
  return listings.flatMap((l) => l.resources.map((r) => ({ ...r, listingHost: l.sourceHost })));
}

module.exports = { upsertListing, removeListing, allListings, allResources };
