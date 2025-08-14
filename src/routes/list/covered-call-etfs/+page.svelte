<script lang="ts">
  import { screenWidth } from "$lib/store";
  import { abbreviateNumber } from "$lib/utils";
  import TableHeader from "$lib/components/Table/TableHeader.svelte";
  import HoverStockChart from "$lib/components/HoverStockChart.svelte";
  import DownloadData from "$lib/components/DownloadData.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import Infobox from "$lib/components/Infobox.svelte";

  import { onMount } from "svelte";

  export let data;

  let rawData = data?.getData;
  let displayList = rawData?.slice(0, 25);

  async function handleScroll() {
    const scrollThreshold = document.body.offsetHeight * 0.8; // 80% of the website height
    const isBottom = window.innerHeight + window.scrollY >= scrollThreshold;
    if (isBottom && displayList?.length !== rawData?.length) {
      const nextIndex = displayList?.length;
      const filteredNewResults = rawData?.slice(nextIndex, nextIndex + 25);
      displayList = [...displayList, ...filteredNewResults];
    }
  }

  onMount(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  });

  let columns = [
    { key: "rank", label: "Rank", align: "center" },
    { key: "symbol", label: "Symbol", align: "left" },
    { key: "name", label: "Name", align: "left" },
    { key: "price", label: "Price", align: "right" },
    { key: "changesPercentage", label: "% Change", align: "right" },
    { key: "dividendYield", label: "Div. Yield", align: "right" },
    { key: "marketCap", label: "Market Cap", align: "right" },
  ];

  let sortOrders = {
    rank: { order: "none", type: "number" },
    symbol: { order: "none", type: "string" },
    name: { order: "none", type: "string" },
    price: { order: "none", type: "number" },
    changesPercentage: { order: "none", type: "number" },
    dividendYield: { order: "none", type: "number" },
    marketCap: { order: "none", type: "number" },
  };

  const sortData = (key) => {
    // Reset all other keys to 'none' except the current key
    for (const k in sortOrders) {
      if (k !== key) {
        sortOrders[k].order = "none";
      }
    }

    // Cycle through 'none', 'asc', 'desc' for the clicked key
    const orderCycle = ["none", "asc", "desc"];

    let originalData = data?.getData;

    const currentOrderIndex = orderCycle.indexOf(sortOrders[key].order);
    sortOrders[key].order =
      orderCycle[(currentOrderIndex + 1) % orderCycle.length];
    const sortOrder = sortOrders[key].order;

    // Reset to original data when 'none' and stop further sorting
    if (sortOrder === "none") {
      displayList = [...originalData]?.slice(0, 25); // Reset to original data (spread to avoid mutation)
      return;
    }

    // Define a generic comparison function
    const compareValues = (a, b) => {
      const { type } = sortOrders[key];
      let valueA, valueB;

      switch (type) {
        case "date":
          valueA = new Date(a[key]);
          valueB = new Date(b[key]);
          break;
        case "string":
          valueA = a[key].toUpperCase();
          valueB = b[key].toUpperCase();
          return sortOrder === "asc"
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
        case "number":
        default:
          valueA = parseFloat(a[key]);
          valueB = parseFloat(b[key]);
          break;
      }

      if (sortOrder === "asc") {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      }
    };

    // Sort using the generic comparison function
    displayList = [...originalData].sort(compareValues)?.slice(0, 25);
  };

  $: charNumber = $screenWidth < 640 ? 15 : 40;
</script>

<SEO
  title="Covered Call ETFs List - Options Income Strategy ETFs "
  description="Complete list of covered call ETFs that generate income through options strategies. Compare yields, expense ratios, and performance of JEPI, QYLD, XYLD and other covered call exchange-traded funds. Enhanced income through call writing strategies."
  keywords="covered call ETFs, covered call ETF list, JEPI ETF, QYLD ETF, XYLD ETF, options income ETFs, covered call strategy, income generating ETFs, high yield ETFs, call writing funds, dividend ETFs with options"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Covered Call ETFs List",
    description:
      "Complete directory of covered call exchange-traded funds that use options strategies to generate enhanced income",
    url: "https://stocknear.com/list/covered-call-etfs",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://stocknear.com",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Stock Lists",
          item: "https://stocknear.com/list",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Covered Call ETFs",
          item: "https://stocknear.com/list/covered-call-etfs",
        },
      ],
    },
    mainEntity: {
      "@type": "ItemList",
      name: "Covered Call ETF Directory",
      description:
        "List of covered call exchange-traded funds with income generation through options strategies",
      numberOfItems: rawData?.length || 0,
    },
  }}
/>

<section class="w-full overflow-hidden m-auto">
  <Infobox
    text="Comprehensive list of covered call ETFs that generate enhanced income through options strategies. These exchange-traded funds write covered call options on their underlying holdings, typically providing higher yields than traditional equity ETFs while potentially limiting upside potential. Popular funds include JEPI, QYLD, and XYLD."
  />

  <div class="flex flex-row items-center justify-between w-full mt-5 mb-2">
    <h2 class="text-xl sm:text-2xl font-semibold sm:font-bold">
      {rawData?.length} ETFs
    </h2>
    <div class="w-fit ml-auto">
      <DownloadData
        {data}
        rawData={data?.getData}
        title="etf_monthly_dividend_list"
      />
    </div>
  </div>

  <!-- Page wrapper -->
  <div class="flex justify-center w-full m-auto h-full overflow-hidden">
    <!-- Content area -->
    <div class="w-full overflow-x-auto">
      <table
        class="table table-sm table-compact no-scrollbar rounded-none sm:rounded w-full border border-gray-300 dark:border-gray-800 m-auto"
      >
        <thead>
          <TableHeader {columns} {sortOrders} {sortData} />
        </thead>
        <tbody>
          {#each displayList as item}
            <!-- row -->
            <tr
              class="dark:sm:hover:bg-[#245073]/10 odd:bg-[#F6F7F8] dark:odd:bg-odd"
            >
              <td
                class=" font-semibold sm:font-normal text-center text-sm sm:text-[1rem]"
              >
                {item?.rank}
              </td>

              <td class="text-[1rem]">
                <HoverStockChart symbol={item?.symbol} assetType="etf" />
              </td>

              <td class=" text-sm sm:text-[1rem] whitespace-nowrap">
                {item?.name?.length > charNumber
                  ? item?.name?.slice(0, charNumber) + "..."
                  : item?.name}
              </td>

              <td class=" text-end text-sm sm:text-[1rem]">
                {item?.price}
              </td>

              <td class=" text-end text-sm sm:text-[1rem]">
                {#if item?.changesPercentage >= 0}
                  <span class="text-green-800 dark:text-[#00FC50]"
                    >+{item.changesPercentage?.toFixed(2)}%</span
                  >
                {:else}
                  <span class="text-red-800 dark:text-[#FF2F1F]"
                    >{item.changesPercentage?.toFixed(2)}%
                  </span>
                {/if}
              </td>

              <td class=" text-end text-sm sm:text-[1rem]">
                {item?.dividendYield}%
              </td>

              <td class=" text-end text-sm sm:text-[1rem] whitespace-nowrap">
                {abbreviateNumber(item?.marketCap)}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</section>
