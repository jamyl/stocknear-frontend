<script lang="ts">
  import TableHeader from "$lib/components/Table/TableHeader.svelte";

  import { abbreviateNumber, formatString } from "$lib/utils";
  import { onMount } from "svelte";
  import SEO from "$lib/components/SEO.svelte";

  export let data;

  let rawData = data?.getAllHedgeFunds;
  let displayList = rawData?.slice(0, 100) ?? [];
  let inputValue = "";

  async function handleScroll() {
    const scrollThreshold = document.body.offsetHeight * 0.8; // 80% of the website height
    const isBottom = window.innerHeight + window.scrollY >= scrollThreshold;
    if (isBottom && displayList?.length !== rawData?.length) {
      const nextIndex = displayList?.length;
      const filteredNewResults = rawData?.slice(nextIndex, nextIndex + 50);
      displayList = [...displayList, ...filteredNewResults];
    }
  }

  onMount(async () => {
    if (!syncWorker) {
      const SyncWorker = await import("./workers/filterQuery?worker");
      syncWorker = new SyncWorker.default();
      syncWorker.onmessage = handleMessage;
    }

    window.addEventListener("scroll", handleScroll);
    //window.addEventListener('keydown', handleKeyDown);

    return () => {
      // Cleanup the event listeners when the component is unmounted
      window.removeEventListener("scroll", handleScroll);
      //window.removeEventListener('keydown', handleKeyDown);
    };
  });

  let syncWorker: Worker | undefined = undefined;

  // Handling messages from the worker
  const handleMessage = async (event) => {
    const filterData = event.data?.output;

    if (filterData?.length !== 0) {
      rawData = filterData;
      displayList = [...filterData]?.slice(0, 50);
    } else {
      // Reset to original data if no matches found
      rawData = data?.getAllHedgeFunds;
      displayList = rawData?.slice(0, 50);
    }
  };

  const loadWorker = async () => {
    syncWorker.postMessage({
      rawData: data?.getAllHedgeFunds,
      inputValue: inputValue,
    });
  };

  async function search() {
    inputValue = inputValue?.toLowerCase();

    setTimeout(async () => {
      if (inputValue?.length !== 0) {
        await loadWorker();
      } else {
        // Reset to original data if filter is empty
        rawData = data?.getAllHedgeFunds;
        displayList = rawData?.slice(0, 50);
      }
    }, 500);
  }

  let columns = [
    { key: "rank", label: "Rank", align: "left" },
    { key: "name", label: "Name", align: "left" },
    { key: "marketValue", label: "AUM", align: "right" },
    { key: "numberOfStocks", label: "Holdings", align: "right" },
    { key: "turnover", label: "Turnover", align: "right" },
    { key: "performancePercentage3Year", label: "3-Year Perf", align: "right" },
    { key: "winRate", label: "Win Rate", align: "right" },
  ];

  let sortOrders = {
    rank: { order: "none", type: "number" },
    name: { order: "none", type: "string" },
    marketValue: { order: "none", type: "number" },
    numberOfStocks: { order: "none", type: "number" },
    turnover: { order: "none", type: "number" },
    performancePercentage3Year: { order: "none", type: "number" },
    winRate: { order: "none", type: "number" },
  };

  const sortData = (key) => {
    // Reset all other keys to 'none' except the current key
    let originalData = [];

    for (const k in sortOrders) {
      if (k !== key) {
        sortOrders[k].order = "none";
      }
    }

    // Cycle through 'none', 'asc', 'desc' for the clicked key
    const orderCycle = ["none", "asc", "desc"];
    const currentOrderIndex = orderCycle.indexOf(
      sortOrders[key]?.order || "none",
    );
    sortOrders[key] = {
      ...(sortOrders[key] || {}),
      order: orderCycle[(currentOrderIndex + 1) % orderCycle.length],
    };
    const sortOrder = sortOrders[key]?.order;

    // Reset to original data when 'none' and stop further sorting
    if (sortOrder === "none") {
      let originalData = [...rawData]; // Reset originalData to rawData
      displayList = originalData?.slice(0, 50); // Reset displayed data
      return;
    }

    // Generic comparison function
    const compareValues = (a, b) => {
      const { type } = sortOrders[key];
      let valueA, valueB;

      switch (type) {
        case "date":
          valueA = new Date(a[key]);
          valueB = new Date(b[key]);
          break;
        case "rating":
        case "string":
          // Retrieve values
          valueA = a[key];
          valueB = b[key];

          // Handle null or undefined values, always placing them at the bottom
          if (valueA == null && valueB == null) {
            return 0; // Both are null/undefined, no need to change the order
          } else if (valueA == null) {
            return 1; // null goes to the bottom
          } else if (valueB == null) {
            return -1; // null goes to the bottom
          }

          // Convert the values to uppercase for case-insensitive comparison
          valueA = valueA?.toUpperCase();
          valueB = valueB?.toUpperCase();

          // Perform the sorting based on ascending or descending order
          return sortOrder === "asc"
            ? valueA?.localeCompare(valueB)
            : valueB?.localeCompare(valueA);
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

    // Sort and update the originalData and analystList
    originalData = [...rawData].sort(compareValues);
    displayList = originalData?.slice(0, 50); // Update the displayed data
  };
</script>

<SEO
  title="Hedge Fund Tracker - Top Hedge Fund Holdings & 13F Filings "
  description="Track top hedge fund holdings, 13F filings, and institutional investor portfolios. Monitor what hedge funds are buying and selling with detailed position analysis. Free hedge fund tracking tool."
  keywords="hedge fund tracker, hedge fund holdings, 13F filings, institutional investors, hedge fund positions, top hedge funds, institutional holdings, hedge fund portfolios, berkshire hathaway holdings"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Hedge Fund Tracker",
    description:
      "Comprehensive tracking of hedge fund holdings and institutional investments",
    url: "https://stocknear.com/hedge-funds",
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
          name: "Hedge Funds",
          item: "https://stocknear.com/hedge-funds",
        },
      ],
    },
    mainEntity: {
      "@type": "ItemList",
      name: "Hedge Fund List",
      description:
        "List of hedge funds and institutional investors with their holdings",
      numberOfItems: rawData?.length || 0,
    },
  }}
/>

<section
  class="w-full max-w-3xl sm:max-w-[1400px] overflow-hidden min-h-screen pt-5 pb-40 px-3"
>
  <body class="w-full overflow-hidden m-auto">
    <div class="text-sm sm:text-[1rem] breadcrumbs">
      <ul>
        <li><a href="/" class="text-muted dark:text-gray-300">Home</a></li>
        <li class="text-muted dark:text-gray-300">Hedge Funds</li>
      </ul>
    </div>

    <section class="w-full overflow-hidden m-auto sm:mt-10 px-0 mt-10">
      <div class=" flex justify-center w-full m-auto overflow-hidden">
        <div
          class="relative flex justify-center items-center overflow-hidden w-full"
        >
          <main class="w-full">
            <div class="mb-6 border-[#2C6288] dark:border-white border-b-[2px]">
              <h1 class="mb-1 text-2xl sm:text-3xl font-bold">
                Top Hedge Funds in US
              </h1>
            </div>
            <div class="w-full pt-2">
              <div class="w-full flex flex-row items-center">
                <div class="relative w-fit">
                  <div
                    class="absolute inset-y-0 left-3 flex items-center pointer-events-none"
                  >
                    <svg
                      class="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      ></path>
                    </svg>
                  </div>
                  <input
                    bind:value={inputValue}
                    on:input={search}
                    type="text"
                    placeholder="Search Hedge Fund"
                    class="w-fit py-[5.5px] pl-10 border bg-gray-100 dark:bg-default shadow-sm focus:shadow focus:bg-white focus:outline-hidden border border-gray-300 dark:border-gray-600 rounded placeholder:text-gray-800 dark:placeholder:text-gray-300 px-3 focus:outline-none focus:ring-0 dark:focus:border-gray-600 grow w-full sm:min-w-56 sm:max-w-xs"
                  />
                </div>
              </div>
            </div>

            <div class="w-full m-auto mt-5">
              <div
                class="w-full m-auto rounded-none sm:rounded mb-4 overflow-x-auto sm:overflow-hidden"
              >
                <table
                  class="table table-sm table-compact no-scrollbar rounded-none sm:rounded w-full border border-gray-300 dark:border-gray-800 m-auto"
                >
                  <thead>
                    <TableHeader {columns} {sortOrders} {sortData} />
                  </thead>
                  <tbody>
                    {#each displayList as item, index}
                      <tr
                        class="dark:sm:hover:bg-[#245073]/10 odd:bg-[#F6F7F8] dark:odd:bg-odd{index +
                          1 ===
                          rawData?.length &&
                        !['Pro', 'Plus']?.includes(data?.user?.tier)
                          ? 'opacity-[0.1]'
                          : ''}"
                      >
                        <td class=" text-sm sm:text-[1rem] text-center">
                          {item?.rank}
                        </td>

                        <td
                          class="text-start text-sm sm:text-[1rem] whitespace-nowrap"
                        >
                          <a
                            href={"/hedge-funds/" + item?.cik}
                            class="text-blue-800 sm:hover:text-muted dark:sm:hover:text-white dark:text-blue-400"
                            >{formatString(item?.name)}
                          </a>
                        </td>

                        <td
                          class="text-end text-sm sm:text-[1rem] whitespace-nowrap"
                        >
                          {abbreviateNumber(item?.marketValue)}
                        </td>

                        <td
                          class="text-end text-sm sm:text-[1rem] whitespace-nowrap"
                        >
                          {new Intl.NumberFormat("en", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(item?.numberOfStocks)}
                        </td>

                        <td
                          class="text-end text-sm sm:text-[1rem] whitespace-nowrap"
                        >
                          {item?.turnover?.toFixed(2)}
                        </td>

                        <!--
                            <td class=" text-sm sm:text-[1rem] whitespace-nowrap  text-end">
                              {item?.mainSectors?.at(0)}
                            </td>
                            -->

                        <td
                          class="text-end text-sm sm:text-[1rem] whitespace-nowrap"
                        >
                          {#if item?.performancePercentage3Year >= 0}
                            <span class="text-green-800 dark:text-[#00FC50]"
                              >+{abbreviateNumber(
                                item?.performancePercentage3Year?.toFixed(2),
                              )}%</span
                            >
                          {:else}
                            <span class="text-red-800 dark:text-[#FF2F1F]"
                              >{abbreviateNumber(
                                item?.performancePercentage3Year?.toFixed(2),
                              )}%
                            </span>
                          {/if}
                        </td>

                        <td
                          class="text-end text-sm sm:text-[1rem] whitespace-nowrap"
                        >
                          {#if item?.winRate >= 0}
                            <span class="text-green-800 dark:text-[#00FC50]"
                              >+{abbreviateNumber(
                                item?.winRate?.toFixed(2),
                              )}%</span
                            >
                          {:else}
                            <span class="text-red-800 dark:text-[#FF2F1F]"
                              >{abbreviateNumber(item?.winRate?.toFixed(2))}%
                            </span>
                          {/if}
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>
      </div>
    </section>
  </body>
</section>
