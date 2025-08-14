<script lang="ts">
  import Table from "$lib/components/Table/Table.svelte";
  import Infobox from "$lib/components/Infobox.svelte";
  import SEO from "$lib/components/SEO.svelte";

  export let data;

  const defaultList = [
    { name: "Total OI", rule: "totalOI" },
    { name: "Change OI", rule: "changeOI" },
    { name: "Price", rule: "price" },
    { name: "% Change", rule: "changesPercentage" },
    { name: "IV Rank", rule: "ivRank" },
    { name: "Total Prem", rule: "totalPrem" },
  ];

  const excludedRules = new Set([
    "volume",
    "price",
    "changesPercentage",
    "revenue",
    "eps",
    "changeOI",
    "totalOI",
    "totalPrem",
    "ivRank",
  ]);
</script>

<SEO
  title="Highest IV Rank Stocks - Top Implied Volatility Rank | Stocknear"
  description="List of US stocks ranked by highest implied volatility (IV) rank. Track which companies have the highest options volatility rankings and premium opportunities."
  keywords="highest IV rank stocks, implied volatility rank, options volatility, IV rank leaders, volatility trading, options premium rank, high volatility stocks"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Highest IV Rank Stocks",
    "description": "US stocks ranked by highest implied volatility rank",
    "url": "https://stocknear.com/list/highest-option-iv-rank",
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
          "name": "Highest IV Rank",
          "item": "https://stocknear.com/list/highest-option-iv-rank"
        }
      ]
    },
    "mainEntity": {
      "@type": "ItemList",
      "name": "Stocks by IV Rank",
      "description": "List of US stocks ranked by implied volatility rank",
      "numberOfItems": data?.getData?.length || 0
    }
  }}
/>

<section class="w-full max-w-3xl sm:max-w-[1400px] overflow-hidden min-h-screen pt-5 pb-40 px-3">
  <div class="text-sm sm:text-[1rem] breadcrumbs">
    <ul>
      <li><a href="/" class="text-muted dark:text-gray-300">Home</a></li>
      <li><a href="/list" class="text-muted dark:text-gray-300">Stock Lists</a></li>
      <li class="text-muted dark:text-gray-300">Highest IV Rank</li>
    </ul>
  </div>

  <div class="mb-6 border-[#2C6288] dark:border-white border-b-[2px] mt-5">
    <h1 class="mb-1 text-2xl sm:text-3xl font-bold">
      Highest IV Rank Stocks
    </h1>
  </div>

  <Infobox
    text="These are US stocks with the highest Implied Volatility (IV) Rank. IV Rank measures a stock's current implied volatility compared to its historical range, helping identify potential options trading opportunities and premium collection strategies."
  />

  <!-- Page wrapper -->
  <Table {data} rawData={data?.getData} {excludedRules} {defaultList} />
</section>
