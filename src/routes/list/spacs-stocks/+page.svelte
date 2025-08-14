<script lang="ts">
  import Table from "$lib/components/Table/Table.svelte";
  import Infobox from "$lib/components/Infobox.svelte";
  import SEO from "$lib/components/SEO.svelte";

  export let data;

  const excludedRules = new Set([
    "volume",
    "price",
    "changesPercentage",
    "eps",
    "marketCap",
  ]);

  const defaultList = [
    { name: "Market Cap", rule: "marketCap" },
    { name: "Price", rule: "price" },
    { name: "% Change", rule: "changesPercentage" },
  ];
</script>

<SEO
  title="SPAC Stocks List - Special Purpose Acquisition Companies | Stocknear"
  description="Complete list of actively traded SPAC stocks (Special Purpose Acquisition Companies) on US markets. Track blank check companies and shell companies seeking acquisition targets."
  keywords="SPAC stocks, special purpose acquisition companies, blank check companies, shell companies, SPAC investments, acquisition companies, SPAC list"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "SPAC Stocks",
    "description": "List of actively traded Special Purpose Acquisition Companies (SPACs)",
    "url": "https://stocknear.com/list/spacs-stocks",
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
          "name": "SPAC Stocks",
          "item": "https://stocknear.com/list/spacs-stocks"
        }
      ]
    },
    "mainEntity": {
      "@type": "ItemList",
      "name": "SPAC Companies",
      "description": "List of Special Purpose Acquisition Companies (SPACs) trading on US markets",
      "numberOfItems": data?.getData?.length || 0
    }
  }}
/>

<section class="w-full max-w-3xl sm:max-w-[1400px] overflow-hidden min-h-screen pt-5 pb-40 px-3">
  <div class="text-sm sm:text-[1rem] breadcrumbs">
    <ul>
      <li><a href="/" class="text-muted dark:text-gray-300">Home</a></li>
      <li><a href="/list" class="text-muted dark:text-gray-300">Stock Lists</a></li>
      <li class="text-muted dark:text-gray-300">SPAC Stocks</li>
    </ul>
  </div>

  <div class="mb-6 border-[#2C6288] dark:border-white border-b-[2px] mt-5">
    <h1 class="mb-1 text-2xl sm:text-3xl font-bold">
      SPAC Stocks
    </h1>
  </div>

  <Infobox
    text="These are all actively traded SPACs (Special Purpose Acquisition Companies) on the US stock market. SPACs are blank check companies that raise capital through public offerings to acquire private companies and bring them public."
  />

  <!-- Page wrapper -->
  <Table {data} rawData={data?.getData} {excludedRules} {defaultList} />
</section>
