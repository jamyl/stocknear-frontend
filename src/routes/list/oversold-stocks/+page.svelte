<script lang="ts">
  import Table from "$lib/components/Table/Table.svelte";
  import Infobox from "$lib/components/Infobox.svelte";
  import SEO from "$lib/components/SEO.svelte";

  export let data;

  const defaultList = [
    { name: "RSI", rule: "rsi" },
    { name: "Price", rule: "price" },
    { name: "% Change", rule: "changesPercentage" },
    { name: "Market Cap", rule: "marketCap" },
  ];

  const excludedRules = new Set([
    "volume",
    "price",
    "changesPercentage",
    "revenue",
    "eps",
    "marketCap",
    "rsi",
  ]);
</script>

<SEO
  title="Oversold Stocks - RSI Under 30 Buying Opportunities | Stocknear"
  description="List of oversold US stocks with RSI under 30 based on technical analysis. Discover potential buying opportunities from stocks in oversold territory with low RSI indicators."
  keywords="oversold stocks, RSI under 30, oversold buying opportunities, technical analysis stocks, RSI indicator, undervalued stocks, oversold conditions"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Oversold Stocks",
    "description": "US stocks that are oversold based on RSI indicator analysis",
    "url": "https://stocknear.com/list/oversold-stocks",
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
          "name": "Oversold Stocks",
          "item": "https://stocknear.com/list/oversold-stocks"
        }
      ]
    },
    "mainEntity": {
      "@type": "ItemList",
      "name": "Oversold Stocks by RSI",
      "description": "List of US stocks that are oversold based on RSI technical indicator",
      "numberOfItems": data?.getOverSoldStocks?.length || 0
    }
  }}
/>

<section class="w-full max-w-3xl sm:max-w-[1400px] overflow-hidden min-h-screen pt-5 pb-40 px-3">
  <div class="text-sm sm:text-[1rem] breadcrumbs">
    <ul>
      <li><a href="/" class="text-muted dark:text-gray-300">Home</a></li>
      <li><a href="/list" class="text-muted dark:text-gray-300">Stock Lists</a></li>
      <li class="text-muted dark:text-gray-300">Oversold Stocks</li>
    </ul>
  </div>

  <div class="mb-6 border-[#2C6288] dark:border-white border-b-[2px] mt-5">
    <h1 class="mb-1 text-2xl sm:text-3xl font-bold">
      Oversold Stocks
    </h1>
  </div>

  <Infobox
    text="These are US stocks that are oversold according to the Relative Strength Index (RSI), a key technical analysis indicator. An RSI under 30 typically indicates oversold conditions and potential buying opportunities as stocks may bounce back."
  />

  <!-- Page wrapper -->
  <Table {data} rawData={data?.getOverSoldStocks} {excludedRules} {defaultList} />
</section>
