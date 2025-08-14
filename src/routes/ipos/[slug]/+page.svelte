<script lang="ts">
  import { page } from "$app/stores";
  import Infobox from "$lib/components/Infobox.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import Table from "$lib/components/Table/Table.svelte";

  export let data;

  let rawData = data?.getIPOCalendar?.filter(
    (item) => new Date(item?.ipoDate).getFullYear() >= data?.getYear,
  );

  let year = data?.getYear;
  let ipoNews = data?.getNews;

  const excludedRules = new Set([
    "volume",
    "price",
    "ipoPrice",
    "return",
    "eps",
    "ipoDate",
    "marketCap",
  ]);

  const defaultList = [
    { name: "IPO Date", rule: "ipoDate" },
    { name: "IPO Price", rule: "ipoPrice" },
    { name: "Current Price", rule: "currentPrice" },
    { name: "Return Since", rule: "return" },
  ];

  const specificRows = [
    { name: "Return Since", rule: "return", type: "percentSign" },
    { name: "IPO Date", rule: "ipoDate", type: "date" },
    { name: "IPO Price", rule: "ipoPrice", type: "float" },
    { name: "Current Price", rule: "currentPrice", type: "float" },
  ];

  $: {
    if ($page?.url?.pathname) {
      rawData = data?.getIPOCalendar?.filter(
        (item) => new Date(item?.ipoDate).getFullYear() == data?.getYear,
      );
      year = data?.getYear;
    }
  }
</script>

<SEO
  title="{data?.getYear} IPOs List - Complete Initial Public Offering Directory"
  description="Comprehensive list of all {data?.getYear} initial public offerings (IPOs) on the US stock market. Track IPO performance, pricing, returns since listing, and market debuts with detailed company information and historical data."
  keywords="{data?.getYear} IPOs, initial public offerings {data?.getYear}, IPO list {data?.getYear}, {data?.getYear} IPO performance, recent IPOs, IPO calendar {data?.getYear}, new public companies {data?.getYear}"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "{data?.getYear} IPOs Directory",
    "description": "Complete list of initial public offerings in {data?.getYear}",
    "url": "https://stocknear.com/ipos/{data?.getYear}",
    "about": {
      "@type": "Thing",
      "name": "Initial Public Offerings {data?.getYear}"
    },
    "mainEntity": {
      "@type": "ItemList",
      "name": "{data?.getYear} IPO List",
      "description": "List of companies that went public in {data?.getYear}",
      "numberOfItems": rawData?.length || 0
    },
    "temporalCoverage": "{data?.getYear}",
    "spatialCoverage": "United States"
  }}
/>

{#key $page?.url?.pathname}
  <div class="w-full overflow-hidden m-auto mt-5 pb-20">
    <div class="sm:p-0 flex justify-center w-full m-auto overflow-hidden">
      <div
        class="relative flex flex-col lg:flex-row justify-center items-start overflow-hidden w-full"
      >
        <main class="w-full lg:w-3/4 lg:pr-10">
          <div class="flex flex-col justify-center items-center">
            {#if rawData?.length !== 0}
              <h2 class=" text-xl font- text-start mt-5 w-full font-semibold">
                {rawData?.length} IPOs
              </h2>
              <div class="w-full overflow-x-auto">
                <Table
                  {data}
                  {rawData}
                  {excludedRules}
                  {defaultList}
                  {specificRows}
                />
              </div>
            {:else}
              <div class="w-full">
                <Infobox
                  text={`No IPOs found. Please adjust your search timeframe for the latest ${year}
          IPOs.`}
                />
              </div>
            {/if}
          </div>
        </main>
        <aside class="inline-block relative w-full lg:w-1/4 mt-3">
          {#if ipoNews?.length !== 0}
            <div
              class="w-full border border-gray-300 dark:border-gray-600 rounded h-fit pb-4 mt-4 cursor-pointer bg-inherit"
            >
              <div class="p-4 text-sm">
                <h3 class="text-xl font-bold mb-3">IPO News</h3>
                <ul class="">
                  {#each ipoNews?.slice(0, 10) as item}
                    <li class="mb-3 last:mb-1">
                      {item?.timestamp}
                      <a
                        class="text-blue-800 sm:hover:text-muted dark:sm:hover:text-white dark:text-blue-400"
                        href={item?.link}
                        target="_blank"
                        rel="noopener noreferrer nofollow">{item?.title}</a
                      >
                    </li>
                  {/each}
                </ul>
                <a
                  href={`/ipos/news`}
                  class="flex justify-center items-center rounded cursor-pointer w-full py-2 mt-3 text-[1rem] text-center font-semibold text-white dark:text-black m-auto sm:hover:bg-muted dark:sm:hover:bg-gray-300 bg-black dark:bg-[#fff] transition duration-100"
                >
                  More IPO News
                </a>
              </div>
            </div>
          {/if}
        </aside>
      </div>
    </div>
  </div>
{/key}
