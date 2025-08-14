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
  title="Highest Open Interest Change - Biggest Options OI Changes | Stocknear"
  description="List of US stocks ranked by highest open interest changes. Track which companies have the biggest increases in options open interest and emerging options activity."
  keywords="highest open interest change, OI change stocks, options interest increase, biggest OI changes, open interest growth, options activity change"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Highest Open Interest Change",
    "description": "US stocks ranked by highest open interest changes",
    "url": "https://stocknear.com/list/highest-open-interest-change",
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
          "name": "Highest Open Interest Change",
          "item": "https://stocknear.com/list/highest-open-interest-change"
        }
      ]
    },
    "mainEntity": {
      "@type": "ItemList",
      "name": "Stocks by Open Interest Change",
      "description": "List of US stocks ranked by open interest changes in options",
      "numberOfItems": data?.getStocks?.length || 0
    }
  }}
/>

<section class="w-full max-w-3xl sm:max-w-[1400px] overflow-hidden min-h-screen pt-5 pb-40 px-3">
  <div class="text-sm sm:text-[1rem] breadcrumbs">
    <ul>
      <li><a href="/" class="text-muted dark:text-gray-300">Home</a></li>
      <li><a href="/list" class="text-muted dark:text-gray-300">Stock Lists</a></li>
      <li class="text-muted dark:text-gray-300">Highest Open Interest Change</li>
    </ul>
  </div>

  <div class="mb-6 border-[#2C6288] dark:border-white border-b-[2px] mt-5">
    <h1 class="mb-1 text-2xl sm:text-3xl font-bold">
      Highest Open Interest Change
    </h1>
  </div>

  <Infobox
    text="These are US stocks with the highest changes in open interest (OI). Open interest represents outstanding options contracts, and significant changes often indicate shifting investor sentiment or emerging trading opportunities."
  />

  <!-- Page wrapper -->
  <Table {data} rawData={data?.getStocks} {excludedRules} {defaultList} />
</section>
