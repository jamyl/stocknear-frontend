<script lang="ts">
  import Table from "$lib/components/Table/Table.svelte";
  import Infobox from "$lib/components/Infobox.svelte";
  import SEO from "$lib/components/SEO.svelte";

  export let data;

  const defaultList = [
    { name: "Market Cap", rule: "marketCap" },
    { name: "Price", rule: "price" },
    { name: "% Change", rule: "changesPercentage" },
    { name: "Volume", rule: "volume" },
  ];
</script>

<SEO
  title="Penny Stocks List - Actively Traded Stocks Under $5 | Stocknear"
  description="Complete list of actively traded penny stocks under $5 per share with volume over 10K. Find low-priced stocks for speculative trading and investment opportunities with high volume and liquidity."
  keywords="penny stocks, penny stock list, stocks under $5, low price stocks, cheap stocks, small cap stocks, penny stock trading, sub $5 stocks, micro cap stocks"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Penny Stocks List",
    "description": "Complete directory of actively traded penny stocks under $5 per share with high volume",
    "url": "https://stocknear.com/list/penny-stocks",
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://stocknear.com"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Stock Lists",
          "item": "https://stocknear.com/list"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Penny Stocks",
          "item": "https://stocknear.com/list/penny-stocks"
        }
      ]
    },
    "mainEntity": {
      "@type": "ItemList",
      "name": "Penny Stocks Directory",
      "description": "List of actively traded stocks under $5 per share with trading volume over 10,000",
      "numberOfItems": data?.getPennyStocks?.length || 0
    }
  }}
/>

<section class="w-full max-w-3xl sm:max-w-[1400px] overflow-hidden min-h-screen pt-5 pb-40 px-3">
  <div class="text-sm sm:text-[1rem] breadcrumbs">
    <ul>
      <li><a href="/" class="text-muted dark:text-gray-300">Home</a></li>
      <li><a href="/list" class="text-muted dark:text-gray-300">Stock Lists</a></li>
      <li class="text-muted dark:text-gray-300">Penny Stocks</li>
    </ul>
  </div>

  <div class="mb-6 border-[#2C6288] dark:border-white border-b-[2px] mt-5">
    <h1 class="mb-1 text-2xl sm:text-3xl font-bold">
      Penny Stocks List
    </h1>
  </div>

  <Infobox
    text="Comprehensive list of actively traded penny stocks priced below $5 per share with trading volume over 10,000 shares. These low-priced stocks offer speculative investment opportunities but carry higher risk due to volatility and liquidity concerns."
  />

  <!-- Page wrapper -->
  <Table {data} rawData={data?.getPennyStocks} {defaultList} />
</section>
