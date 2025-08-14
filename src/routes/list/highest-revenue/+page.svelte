<script lang="ts">
  import Table from "$lib/components/Table/Table.svelte";
  import Infobox from "$lib/components/Infobox.svelte";
  import SEO from "$lib/components/SEO.svelte";

  export let data;

  const defaultList = [
    { name: "Revenue", rule: "revenue" },
    { name: "Price", rule: "price" },
    { name: "% Change", rule: "changesPercentage" },
    { name: "Market Cap", rule: "marketCap" },
  ];
</script>

<SEO
  title="Highest Revenue Companies - Biggest US Companies by Revenue | Stocknear"
  description="List of the biggest US public companies ranked by total revenue and sales in the past 12 months. Discover which American corporations generate the most annual revenue."
  keywords="highest revenue companies, biggest companies by revenue, largest companies by sales, top revenue companies, US companies by revenue, highest sales companies"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Highest Revenue Companies",
    "description": "US companies ranked by highest total revenue and sales",
    "url": "https://stocknear.com/list/highest-revenue",
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
          "name": "Highest Revenue",
          "item": "https://stocknear.com/list/highest-revenue"
        }
      ]
    },
    "mainEntity": {
      "@type": "ItemList",
      "name": "Companies by Revenue",
      "description": "List of US public companies ranked by total revenue and sales",
      "numberOfItems": data?.getData?.length || 0
    }
  }}
/>

<section class="w-full max-w-3xl sm:max-w-[1400px] overflow-hidden min-h-screen pt-5 pb-40 px-3">
  <div class="text-sm sm:text-[1rem] breadcrumbs">
    <ul>
      <li><a href="/" class="text-muted dark:text-gray-300">Home</a></li>
      <li><a href="/list" class="text-muted dark:text-gray-300">Stock Lists</a></li>
      <li class="text-muted dark:text-gray-300">Highest Revenue</li>
    </ul>
  </div>

  <div class="mb-6 border-[#2C6288] dark:border-white border-b-[2px] mt-5">
    <h1 class="mb-1 text-2xl sm:text-3xl font-bold">
      Highest Revenue Companies
    </h1>
  </div>

  <Infobox
    text="These are the biggest US public companies ranked by total revenue and sales over the past 12 months. Track which American corporations generate the most annual revenue across all sectors."
  />

  <!-- Page wrapper -->
  <Table {data} rawData={data?.getData} {defaultList} />
</section>
