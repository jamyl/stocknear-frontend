<script lang="ts">
  import Table from "$lib/components/Table/Table.svelte";
  import Infobox from "$lib/components/Infobox.svelte";
  import SEO from "$lib/components/SEO.svelte";

  export let data;

  const defaultList = [
    { name: "Employees", rule: "employees" },
    { name: "Price", rule: "price" },
    { name: "% Change", rule: "changesPercentage" },
    { name: "Market Cap", rule: "marketCap" },
  ];
</script>

<SEO
  title="Largest Employers - Companies with Most Employees in US | Stocknear"
  description="List of the biggest US public companies ranked by total number of employees. Discover which American corporations employ the most workers and staff."
  keywords="largest employers, companies with most employees, biggest employers US, companies by employee count, largest US employers, most employees companies"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Largest Employers",
    "description": "US companies ranked by total number of employees",
    "url": "https://stocknear.com/list/most-employees",
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
          "name": "Most Employees",
          "item": "https://stocknear.com/list/most-employees"
        }
      ]
    },
    "mainEntity": {
      "@type": "ItemList",
      "name": "Companies by Employee Count",
      "description": "List of US public companies ranked by total number of employees",
      "numberOfItems": data?.getData?.length || 0
    }
  }}
/>

<section class="w-full max-w-3xl sm:max-w-[1400px] overflow-hidden min-h-screen pt-5 pb-40 px-3">
  <div class="text-sm sm:text-[1rem] breadcrumbs">
    <ul>
      <li><a href="/" class="text-muted dark:text-gray-300">Home</a></li>
      <li><a href="/list" class="text-muted dark:text-gray-300">Stock Lists</a></li>
      <li class="text-muted dark:text-gray-300">Most Employees</li>
    </ul>
  </div>

  <div class="mb-6 border-[#2C6288] dark:border-white border-b-[2px] mt-5">
    <h1 class="mb-1 text-2xl sm:text-3xl font-bold">
      Largest Employers in the US
    </h1>
  </div>

  <Infobox
    text="These are the biggest US public companies ranked by total number of employees, updated daily. Track which American corporations employ the most workers across all industries."
  />

  <!-- Page wrapper -->
  <Table {data} rawData={data?.getData} {defaultList} />
</section>
