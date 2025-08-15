import { allCards, defaultChats} from "$lib/utils";

/// Constants
const CACHE_DURATION = 60 * 1000; // 60 seconds
const REQUEST_TIMEOUT = 5000;

// LRU Cache implementation
class LRUCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    const { data, timestamp } = entry;
    if (Date.now() - timestamp > CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }
    // Refresh order
    this.cache.delete(key);
    this.cache.set(key, entry);
    return data;
  }

  set(key, data) {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}

const dashboardCache = new LRUCache();

// Fetch with timeout
async function fetchWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(id);
  }
}


function pickRandomCards(cards, userTier, count = 6) {
  // Identify the “Unlimited Access” card
  const unlimitedCard = cards?.find(c => c.label === 'Unlimited Access');
  // Pool excluding unlimited
  const withoutUnlimited = cards?.filter(c => c !== unlimitedCard);

  // If user is Plus or Pro, we never include Unlimited
  if (['Plus', 'Pro']?.includes(userTier)) {
    // just pick from the reduced pool
    const shuffled = [...withoutUnlimited]?.sort(() => 0.5 - Math.random());
    return shuffled?.slice(0, count);
  }

  // Otherwise, we *must* include Unlimited at the end.
  // Pick the other (count - 1) cards at random:
  const shuffled = [...withoutUnlimited]?.sort(() => 0.5 - Math.random());
  const picks = shuffled?.slice(0, count - 1);

  // Append the Unlimited card last
  picks?.push(unlimitedCard);
  return picks;
}



// Load function
export async function load({ locals }) {
  const { apiKey, apiURL, user } = locals;
  const cacheKey = `dashboard:${apiKey}`;

  // Check cache
  let dashboardData = dashboardCache.get(cacheKey);

  if (!dashboardData) {
    try {
      dashboardData = await fetchWithTimeout(
        `${apiURL}/dashboard-info`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': apiKey
          },
        }
      );
      dashboardCache.set(cacheKey, dashboardData);
    } catch (err) {
      console.error('Dashboard fetch error', err);
      dashboardData = {}; // or `throw error(500, 'Dashboard fetch failed')` if you want to fail
    }
  }

  return {
    getDashboard: dashboardData,
    selectedCards: pickRandomCards(allCards, user?.tier),
      randomChats: defaultChats
    ?.sort(() => 0.5 - Math.random())
    ?.slice(0, 4)
  };
}


async function checkDisposableEmail(email) {
  const url = `https://disposable.debounce.io/?email=${encodeURIComponent(email)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const output = (await response.json())?.disposable ?? false;
  return output;
}





