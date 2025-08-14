<script lang="ts">
  import { screenWidth } from "$lib/store";
  import { abbreviateNumber } from "$lib/utils";
  import TableHeader from "$lib/components/Table/TableHeader.svelte";
  import HoverStockChart from "$lib/components/HoverStockChart.svelte";
  import DownloadData from "$lib/components/DownloadData.svelte";
  import Infobox from "$lib/components/Infobox.svelte";
  import SEO from "$lib/components/SEO.svelte";

  export let data;

  let rawData = data?.getETFBitcoinList;
  let displayList = rawData;

  const totalAssets = rawData?.reduce(
    (total, etf) => total + etf?.totalAssets,
    0,
  );
  const avgExpenseRatio =
    rawData?.reduce((total, item) => total + item?.expenseRatio || 0, 0) /
    rawData?.length;

  let columns = [
    { key: "rank", label: "Rank", align: "center" },
    { key: "symbol", label: "Symbol", align: "left" },
    { key: "name", label: "Name", align: "left" },
    { key: "price", label: "Price", align: "right" },
    { key: "changesPercentage", label: "% Change", align: "right" },
    { key: "expenseRatio", label: "Expense Ratio", align: "right" },
    { key: "totalAssets", label: "Assets", align: "right" },
  ];

  let sortOrders = {
    rank: { order: "none", type: "number" },
    symbol: { order: "none", type: "string" },
    name: { order: "none", type: "string" },
    price: { order: "none", type: "number" },
    changesPercentage: { order: "none", type: "number" },
    expenseRatio: { order: "none", type: "number" },
    totalAssets: { order: "none", type: "number" },
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

    let originalData = data?.getETFBitcoinList;

    const currentOrderIndex = orderCycle.indexOf(sortOrders[key].order);
    sortOrders[key].order =
      orderCycle[(currentOrderIndex + 1) % orderCycle.length];
    const sortOrder = sortOrders[key].order;

    // Reset to original data when 'none' and stop further sorting
    if (sortOrder === "none") {
      displayList = [...originalData]; // Reset to original data (spread to avoid mutation)
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
    displayList = [...originalData].sort(compareValues);
  };

  $: charNumber = $screenWidth < 640 ? 15 : 20;
</script>

<SEO
  title="Bitcoin ETFs List - Complete Bitcoin Spot ETF Directory "
  description="Comprehensive list of Bitcoin ETFs trading on US stock exchanges. Compare Bitcoin spot ETFs, expense ratios, assets under management, and real-time performance. Track BITO, BTCO, HODL and more Bitcoin exchange-traded funds."
  keywords="bitcoin ETFs, bitcoin ETF list, spot bitcoin ETF, BITO ETF, bitcoin exchange traded funds, crypto ETFs, bitcoin investment funds, bitcoin ETF comparison, BTCO ETF, HODL ETF"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Bitcoin ETFs List",
    description:
      "Complete directory of Bitcoin exchange-traded funds available on US stock exchanges",
    url: "https://stocknear.com/list/bitcoin-etfs",
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
          name: "Bitcoin ETFs",
          item: "https://stocknear.com/list/bitcoin-etfs",
        },
      ],
    },
    mainEntity: {
      "@type": "ItemList",
      name: "Bitcoin ETF Directory",
      description:
        "List of Bitcoin exchange-traded funds with performance metrics and expense ratios",
      numberOfItems: rawData?.length || 0,
    },
  }}
/>

<section class="w-full overflow-hidden m-auto">
  <Infobox
    text="Comprehensive list of Bitcoin ETFs available for trading on the US stock market, offering investors exposure to the cryptocurrency's price movements."
  />

  <div
    class="shadow-xs mt-6 mb-4 flex flex-col divide-y divide-gray-300 dark:divide-gray-600 rounded border border-gray-300 dark:border-gray-600 sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0"
  >
    <div class="px-4 py-3 sm:px-2 sm:py-5 md:px-3 lg:p-6">
      <div class="flex items-center justify-between sm:block">
        <div class="text-[1rem] font-semibold">Total ETFs</div>
        <div
          class="mt-1 break-words font-semibold leading-8 text-xl sm:text-2xl"
        >
          {new Intl.NumberFormat("en")?.format(rawData?.length)}
        </div>
      </div>
    </div>
    <div class="px-4 py-3 sm:px-2 sm:py-5 md:px-3 lg:p-6">
      <div class="flex items-center justify-between sm:block">
        <div class="text-[1rem] font-semibold">Total Assets</div>
        <div
          class="mt-1 break-words font-semibold leading-8 text-xl sm:text-2xl"
        >
          {abbreviateNumber(totalAssets)}
        </div>
      </div>
    </div>
    <div class="px-4 py-3 sm:px-2 sm:py-5 md:px-3 lg:p-6">
      <div class="flex items-center justify-between sm:block">
        <div class="text-[1rem] font-semibold">Avg. Cost</div>
        <div
          class="mt-1 break-words font-semibold leading-8 text-xl sm:text-2xl"
        >
          {avgExpenseRatio?.toFixed(2)}%
        </div>
      </div>
    </div>
  </div>

  <div class="flex flex-row items-end justify-end w-fit ml-auto mt-5 mb-2">
    <DownloadData
      {data}
      rawData={data?.getETFBitcoinList}
      title="etf_bitcoin_list"
    />
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
                {item?.expenseRatio}%
              </td>

              <td class=" text-end text-sm sm:text-[1rem] whitespace-nowrap">
                {abbreviateNumber(item?.totalAssets)}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</section>
