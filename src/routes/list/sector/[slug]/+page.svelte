<script lang="ts">
  import { abbreviateNumber } from "$lib/utils";
  import Table from "$lib/components/Table/Table.svelte";
  import Infobox from "$lib/components/Infobox.svelte";
  import SEO from "$lib/components/SEO.svelte";

  export let data;

  let rawData = data?.getSectorCategory;

  let totalMarketCap = rawData?.reduce(
    (total, stock) => total + stock?.marketCap,
    0,
  );
  let totalRevenue = rawData?.reduce(
    (total, stock) => total + stock?.revenue,
    0,
  );
</script>

<SEO
  title={`${data?.getParams} Stocks List - Sector Analysis | Stocknear`}
  description={`Complete list of ${data?.getParams} sector stocks with ${rawData?.length} companies, combined market cap of ${abbreviateNumber(totalMarketCap)} and total revenue of ${abbreviateNumber(totalRevenue)}. Analyze sector performance, trends, and leading companies.`}
  keywords={`${data?.getParams?.toLowerCase()} stocks, ${data?.getParams?.toLowerCase()} sector, ${data?.getParams?.toLowerCase()} companies, sector analysis, ${data?.getParams?.toLowerCase()} investments`}
  structuredData={{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${data?.getParams} Sector Stocks`,
    "description": `Complete directory of companies in the ${data?.getParams} sector`,
    "url": `https://stocknear.com/list/sector/${data?.getParams?.toLowerCase()?.replace(/\s+/g, '-')}`,
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
          "name": "Sector Stocks",
          "item": "https://stocknear.com/list/sector"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": `${data?.getParams}`,
          "item": `https://stocknear.com/list/sector/${data?.getParams?.toLowerCase()?.replace(/\s+/g, '-')}`
        }
      ]
    },
    "mainEntity": {
      "@type": "ItemList",
      "name": `${data?.getParams} Sector Directory`,
      "description": `List of companies in the ${data?.getParams} sector with market capitalization and financial metrics`,
      "numberOfItems": rawData?.length || 0
    }
  }}
/>

<section class="w-full max-w-3xl sm:max-w-[1400px] overflow-hidden min-h-screen pt-5 pb-40 px-3">
  <div class="text-sm sm:text-[1rem] breadcrumbs">
    <ul>
      <li><a href="/" class="text-muted dark:text-gray-300">Home</a></li>
      <li><a href="/list" class="text-muted dark:text-gray-300">Stock Lists</a></li>
      <li><a href="/list/sector" class="text-muted dark:text-gray-300">Sectors</a></li>
      <li class="text-muted dark:text-gray-300">{data?.getParams}</li>
    </ul>
  </div>

  <div class="mb-6 border-[#2C6288] dark:border-white border-b-[2px] mt-5">
    <h1 class="mb-1 text-2xl sm:text-3xl font-bold">
      {data?.getParams} Stocks
    </h1>
  </div>

  <Infobox
    text={`Comprehensive analysis of the ${data?.getParams} sector with ${rawData?.length} publicly traded companies. Combined market capitalization of ${abbreviateNumber(totalMarketCap)} and total revenue of ${abbreviateNumber(totalRevenue)}. Track sector performance, trends, and leading market players.`}
  />

  <div
    class="shadow-xs mt-6 mb-4 flex flex-col divide-y divide-gray-300 dark:divide-gray-600 rounded border border-gray-300 dark:border-gray-600 sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0"
  >
    <div class="px-4 py-3 sm:px-2 sm:py-5 md:px-3 lg:p-6">
      <div class="flex items-center justify-between sm:block">
        <div class="text-[1rem] font-semibold">Total Stocks</div>
        <div
          class="mt-1 break-words font-semibold leading-8 text-xl sm:text-2xl"
        >
          {new Intl.NumberFormat("en")?.format(rawData?.length)}
        </div>
      </div>
    </div>
    <div class="px-4 py-3 sm:px-2 sm:py-5 md:px-3 lg:p-6">
      <div class="flex items-center justify-between sm:block">
        <div class="text-[1rem] font-semibold">Total Market Cap</div>
        <div
          class="mt-1 break-words font-semibold leading-8 text-xl sm:text-2xl"
        >
          {abbreviateNumber(totalMarketCap)}
        </div>
      </div>
    </div>
    <div class="px-4 py-3 sm:px-2 sm:py-5 md:px-3 lg:p-6">
      <div class="flex items-center justify-between sm:block">
        <div class="text-[1rem] font-semibold">Total Revenue</div>
        <div
          class="mt-1 break-words font-semibold leading-8 text-xl sm:text-2xl"
        >
          {abbreviateNumber(totalRevenue)}
        </div>
      </div>
    </div>
  </div>

  <Table {data} rawData={data?.getSectorCategory} />
</section>
