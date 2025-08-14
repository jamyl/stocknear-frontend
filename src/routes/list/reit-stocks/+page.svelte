<script lang="ts">
  import Table from "$lib/components/Table/Table.svelte";
  import Infobox from "$lib/components/Infobox.svelte";
  import SEO from "$lib/components/SEO.svelte";

  export let data;

  const excludedRules = new Set([
    "volume",
    "price",
    "changesPercentage",
    "dividendYield",
    "eps",
    "marketCap",
  ]);

  const defaultList = [
    { name: "Market Cap", rule: "marketCap" },
    { name: "Price", rule: "price" },
    { name: "% Change", rule: "changesPercentage" },
    { name: "Dividend Yield", rule: "dividendYield" },
  ];
</script>

<SEO
  title="REIT Stocks List - Real Estate Investment Trusts | Stocknear"
  description="Complete list of REIT stocks (Real Estate Investment Trusts) with dividend yields, market cap, and performance metrics. Analyze residential, commercial, industrial, and specialty REITs for income investing."
  keywords="REIT stocks, real estate investment trusts, REIT list, dividend REITs, real estate stocks, income REITs, commercial real estate stocks, residential REITs"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "REIT Stocks List",
    "description": "Complete directory of Real Estate Investment Trusts (REITs) for income and real estate exposure",
    "url": "https://stocknear.com/list/reit-stocks",
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
          "name": "REIT Stocks",
          "item": "https://stocknear.com/list/reit-stocks"
        }
      ]
    },
    "mainEntity": {
      "@type": "ItemList",
      "name": "Real Estate Investment Trusts Directory",
      "description": "List of actively traded REITs on the US stock market with dividend and performance data",
      "numberOfItems": data?.getAllREITS?.length || 0
    }
  }}
/>

<section class="w-full max-w-3xl sm:max-w-[1400px] overflow-hidden min-h-screen pt-5 pb-40 px-3">
  <div class="text-sm sm:text-[1rem] breadcrumbs">
    <ul>
      <li><a href="/" class="text-muted dark:text-gray-300">Home</a></li>
      <li><a href="/list" class="text-muted dark:text-gray-300">Stock Lists</a></li>
      <li class="text-muted dark:text-gray-300">REIT Stocks</li>
    </ul>
  </div>

  <div class="mb-6 border-[#2C6288] dark:border-white border-b-[2px] mt-5">
    <h1 class="mb-1 text-2xl sm:text-3xl font-bold">
      REIT Stocks List
    </h1>
  </div>

  <Infobox
    text="Comprehensive list of actively traded Real Estate Investment Trusts (REITs) on the US stock market. REITs provide exposure to real estate sectors including residential, commercial, industrial, and specialty properties while offering attractive dividend yields for income investors."
  />

  <!-- Page wrapper -->
  <Table {data} rawData={data?.getAllREITS} {excludedRules} {defaultList} />
</section>
