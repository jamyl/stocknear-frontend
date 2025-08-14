<script lang="ts">
  import { screenWidth } from "$lib/store";
  import { abbreviateNumber } from "$lib/utils";
  import TableHeader from "$lib/components/Table/TableHeader.svelte";
  import HoverStockChart from "$lib/components/HoverStockChart.svelte";
  import DownloadData from "$lib/components/DownloadData.svelte";
  import Infobox from "$lib/components/Infobox.svelte";
  import SEO from "$lib/components/SEO.svelte";
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
    displayList = [...originalData]?.sort(compareValues)?.slice(0, 25);
  };

  $: charNumber = $screenWidth < 640 ? 15 : 40;
</script>

<SEO
  title="Crypto ETFs List - Complete Cryptocurrency ETF Directory "
  description="Comprehensive list of cryptocurrency ETFs trading on US stock exchanges. Compare Bitcoin, Ethereum, and blockchain ETFs with expense ratios, assets under management, and real-time performance. Track BITO, ETHE, BLOK and more crypto funds."
  keywords="crypto ETFs, cryptocurrency ETFs, crypto ETF list, bitcoin ETFs, ethereum ETFs, blockchain ETFs, crypto investment funds, cryptocurrency exchange traded funds, BITO ETF, ETHE ETF, BLOK ETF"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Crypto ETFs List",
    description:
      "Complete directory of cryptocurrency exchange-traded funds available on US stock exchanges",
    url: "https://stocknear.com/list/crypto-etfs",
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
          name: "Crypto ETFs",
          item: "https://stocknear.com/list/crypto-etfs",
        },
      ],
    },
    mainEntity: {
      "@type": "ItemList",
      name: "Cryptocurrency ETF Directory",
      description:
        "List of cryptocurrency exchange-traded funds with performance metrics and expense ratios",
      numberOfItems: rawData?.length || 0,
    },
  }}
/>

<section class="w-full overflow-hidden m-auto">
  <Infobox
    text="Comprehensive list of cryptocurrency ETFs that are currently active. These exchange-traded funds provide exposure to Bitcoin, Ethereum, and the crypto industry generally."
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
