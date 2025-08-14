<script lang="ts">
  import Table from "$lib/components/Table/Table.svelte";
  import Infobox from "$lib/components/Infobox.svelte";
  import SEO from "$lib/components/SEO.svelte";

  export let data;

  const defaultList = [
    { name: "Buybacks", rule: "commonStockRepurchased" },
    { name: "Price", rule: "price" },
    { name: "% Change", rule: "changesPercentage" },
    { name: "Market Cap", rule: "marketCap" },
  ];
</script>

<SEO
  title="Most Stock Buybacks List - Companies with Highest Repurchases | Stocknear"
  description="Complete list of US companies with the highest stock buybacks and share repurchases. Track capital allocation strategies and shareholder value creation through stock repurchase programs."
  keywords="stock buybacks, share repurchases, stock buyback list, share repurchase programs, capital allocation, shareholder returns, stock repurchases"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Most Stock Buybacks List",
    "description": "Complete directory of US companies with the highest stock buybacks and share repurchases",
    "url": "https://stocknear.com/list/most-buybacks",
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
          "name": "Most Buybacks",
          "item": "https://stocknear.com/list/most-buybacks"
        }
      ]
    },
    "mainEntity": {
      "@type": "ItemList",
      "name": "Stock Buybacks Directory",
      "description": "List of US companies ranked by highest stock buybacks and share repurchases",
      "numberOfItems": data?.getData?.length || 0
    }
  }}
/>

<section class="w-full max-w-3xl sm:max-w-[1400px] overflow-hidden min-h-screen pt-5 pb-40 px-3">
  <div class="text-sm sm:text-[1rem] breadcrumbs">
    <ul>
      <li><a href="/" class="text-muted dark:text-gray-300">Home</a></li>
      <li><a href="/list" class="text-muted dark:text-gray-300">Stock Lists</a></li>
      <li class="text-muted dark:text-gray-300">Most Buybacks</li>
    </ul>
  </div>

  <div class="mb-6 border-[#2C6288] dark:border-white border-b-[2px] mt-5">
    <h1 class="mb-1 text-2xl sm:text-3xl font-bold">
      Most Stock Buybacks List
    </h1>
  </div>

  <Infobox
    text="Comprehensive list of US companies ranked by the highest stock buybacks and share repurchases. These companies actively return capital to shareholders through stock repurchase programs, demonstrating confidence in their business and commitment to shareholder value."
  />

  <!-- Page wrapper -->
  <Table
    {data}
    rawData={data?.getData}
    {defaultList}
    title={data?.getData?.length + " " + "Stocks"}
  />
</section>
