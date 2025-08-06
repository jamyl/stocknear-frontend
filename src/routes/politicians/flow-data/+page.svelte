<script lang="ts">
  import { formatString } from "$lib/utils";
  import { screenWidth } from "$lib/store";
  import { onMount } from "svelte";
  import HoverStockChart from "$lib/components/HoverStockChart.svelte";
  //import UpgradeToPro from '$lib/components/UpgradeToPro.svelte';
  import ArrowLogo from "lucide-svelte/icons/move-up-right";
  import TableHeader from "$lib/components/Table/TableHeader.svelte";

  import SEO from "$lib/components/SEO.svelte";

  export let data;

  let rawData = data?.getPoliticianRSS;
  let stockList = rawData?.slice(0, 50) || [];

  async function handleScroll() {
    const scrollThreshold = document.body.offsetHeight * 0.8; // 80% of the website height
    const isBottom = window.innerHeight + window.scrollY >= scrollThreshold;
    if (isBottom && stockList?.length !== rawData?.length) {
      const nextIndex = stockList?.length;
      const filteredNewResults = rawData?.slice(nextIndex, nextIndex + 9);
      stockList = [...stockList, ...filteredNewResults];
    }
  }

  onMount(async () => {
    window.addEventListener("scroll", handleScroll);
    //window.addEventListener('keydown', handleKeyDown);

    return () => {
      // Cleanup the event listeners when the component is unmounted
      window.removeEventListener("scroll", handleScroll);
      //window.removeEventListener('keydown', handleKeyDown);
    };
  });

  function getAbbreviatedName(fullName) {
    if (fullName === null) {
      return "-";
    }

    const names = fullName?.split(" ");
    let firstName = names[0];
    // Remove any title prefix (e.g. Dr., Mr., Mrs., Ms.)
    if (names.length > 1 && /^(Dr|Mr|Mrs|Ms)\.?$/i.test(names[0])) {
      firstName = names[1];
      names?.splice(0, 1);
    }
    const initials = names
      ?.slice(0, -1)
      ?.map((name) => name?.charAt(0))
      ?.join(". ");
    const lastName = names[names?.length - 1];
    return `${firstName?.charAt(0)}. ${lastName}`;
  }

  let columns = [
    { key: "representative", label: "Person", align: "left" },
    { key: "party", label: "Party", align: "right" },
    { key: "ticker", label: "Symbol", align: "right" },
    { key: "assetDescription", label: "Name", align: "right" },
    { key: "disclosureDate", label: "Filing Date", align: "right" },
    { key: "amount", label: "Amount", align: "right" },
    { key: "type", label: "Type", align: "right" },
  ];

  let sortOrders = {
    representative: { order: "none", type: "string" },
    party: { order: "none", type: "string" },
    ticker: { order: "none", type: "string" },
    assetDescription: { order: "none", type: "string" },
    disclosureDate: { order: "none", type: "date" },
    amount: { order: "none", type: "string" },
    type: { order: "none", type: "string" },
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

    let originalData = rawData;

    const currentOrderIndex = orderCycle.indexOf(sortOrders[key].order);
    sortOrders[key].order =
      orderCycle[(currentOrderIndex + 1) % orderCycle.length];
    const sortOrder = sortOrders[key].order;

    // Reset to original data when 'none' and stop further sorting
    if (sortOrder === "none") {
      stockList = [...originalData]?.slice(0, 50); // Reset to original data (spread to avoid mutation)
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
    stockList = [...originalData].sort(compareValues)?.slice(0, 50);
  };

  $: charNumber = $screenWidth < 640 ? 20 : 30;
</script>

<SEO
  title="Latest
    Congressional Trading"
  description="Find the latest congress trading and see what insiders who have access to regulations are investing."
/>

<section
  class="w-full max-w-3xl sm:max-w-[1400px] overflow-hidden min-h-screen pb-20 pt-5 px-4 lg:px-3"
>
  <div class="text-sm sm:text-[1rem] breadcrumbs">
    <ul>
      <li><a href="/" class="text-muted dark:text-gray-300">Home</a></li>
      <li class="text-muted dark:text-gray-300">Congress Flow</li>
    </ul>
  </div>

  <div class="w-full overflow-hidden m-auto mt-5">
    <div class="sm:p-0 flex justify-center w-full m-auto overflow-hidden">
      <div
        class="relative flex justify-center items-start overflow-hidden w-full"
      >
        <main class="w-full lg:w-3/4 lg:pr-5">
          <div class=" border-[#2C6288] dark:border-white border-b-[2px]">
            <h1 class="mb-1 text-2xl sm:text-3xl font-bold">
              Latest Trades of Politicians
            </h1>
          </div>

          <p class="mt-4">
            Overview of the latest congressional trading activity. As of
            <strong
              >{new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}</strong
            >, we are tracking
            <strong>{rawData?.length?.toLocaleString("en-US") || "0"}</strong>
            total transactions from members of Congress. Currently displaying the
            most recent
            <strong>{stockList?.length?.toLocaleString("en-US") || "0"}</strong>
            trades. The buy-sell ratio shows
            <strong
              >{(() => {
                const buys =
                  stockList?.filter((item) => item?.type === "Bought")
                    ?.length || 0;
                const sells =
                  stockList?.filter((item) => item?.type === "Sold")?.length ||
                  0;
                const total = buys + sells;
                return total > 0
                  ? `${((buys / total) * 100).toFixed(1)}% buys`
                  : "n/a";
              })()}</strong
            >
            versus
            <strong
              >{(() => {
                const buys =
                  stockList?.filter((item) => item?.type === "Bought")
                    ?.length || 0;
                const sells =
                  stockList?.filter((item) => item?.type === "Sold")?.length ||
                  0;
                const total = buys + sells;
                return total > 0
                  ? `${((sells / total) * 100).toFixed(1)}% sells`
                  : "n/a";
              })()}</strong
            >
            among recent filings. The most active party is
            <strong
              >{(() => {
                const partyCount = {};
                stockList?.forEach((item) => {
                  if (item?.party) {
                    partyCount[item.party] = (partyCount[item.party] || 0) + 1;
                  }
                });
                const mostActive = Object.entries(partyCount).sort(
                  ([, a], [, b]) => b - a,
                )[0];
                return mostActive ? mostActive[0] : "n/a";
              })()}</strong
            >
            with
            <strong
              >{(() => {
                const partyCount = {};
                stockList?.forEach((item) => {
                  if (item?.party) {
                    partyCount[item.party] = (partyCount[item.party] || 0) + 1;
                  }
                });
                const mostActive = Object.entries(partyCount).sort(
                  ([, a], [, b]) => b - a,
                )[0];
                return mostActive ? mostActive[1] : "0";
              })()}</strong
            >
            transactions, indicating
            <strong
              >{(() => {
                const buys =
                  stockList?.filter((item) => item?.type === "Bought")
                    ?.length || 0;
                const sells =
                  stockList?.filter((item) => item?.type === "Sold")?.length ||
                  0;
                if (buys > sells) return "bullish";
                if (sells > buys) return "bearish";
                return "neutral";
              })()}</strong
            >
            sentiment among congressional members.
          </p>

          <body class="w-full overflow-hidden m-auto">
            <section class="w-full overflow-hidden m-auto mt-5">
              <div class=" flex justify-center w-full m-auto overflow-hidden">
                <div
                  class="relative flex justify-center items-center overflow-hidden w-full"
                >
                  <main class="w-full">
                    <div class="w-full m-auto mt-4">
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
                            {#each stockList as item}
                              <tr
                                class="dark:sm:hover:bg-[#245073]/10 odd:bg-[#F6F7F8] dark:odd:bg-odd"
                              >
                                <td
                                  class="text-start text-sm sm:text-[1rem] whitespace-nowrap"
                                >
                                  <a
                                    href={`/politicians/${item?.id}`}
                                    class="text-blue-800 sm:hover:text-muted dark:sm:hover:text-white dark:text-blue-400"
                                    >{getAbbreviatedName(
                                      item?.representative?.replace("_", " "),
                                    )}</a
                                  >
                                </td>
                                <td
                                  class="text-end text-sm sm:text-[1rem] whitespace-nowrap"
                                >
                                  {item?.party}
                                </td>

                                <td
                                  class="text-end whitespace-nowrap text-sm sm:text-[1rem]"
                                >
                                  <HoverStockChart
                                    symbol={item?.ticker}
                                    assetType={item?.assetType}
                                  />
                                </td>
                                <td
                                  class="text-end whitespace-nowrap text-sm sm:text-[1rem]"
                                >
                                  <span class=""
                                    >{item?.assetDescription.length > charNumber
                                      ? formatString(
                                          item?.assetDescription.slice(
                                            0,
                                            charNumber,
                                          ),
                                        ) + "..."
                                      : formatString(item?.assetDescription)
                                          ?.replace("- Common Stock", "")
                                          ?.replace("Common Stock", "")}</span
                                  >
                                </td>

                                <td
                                  class="text-end text-sm sm:text-[1rem] whitespace-nowrap"
                                >
                                  {new Date(
                                    item?.disclosureDate,
                                  )?.toLocaleString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    daySuffix: "2-digit",
                                  })}
                                </td>

                                <td
                                  class="text-end text-sm sm:text-[1rem] whitespace-nowrap"
                                >
                                  {item?.amount?.replace(
                                    "$1,000,001 - $5,000,000",
                                    "$1Mio - $5Mio",
                                  )}
                                </td>
                                <td class="text-sm sm:text-[1rem] text-end">
                                  {#if item?.type === "Bought"}
                                    <span
                                      class="text-green-800 dark:text-[#00FC50]"
                                      >Bought</span
                                    >
                                  {:else if item?.type === "Sold"}
                                    <span
                                      class="text-red-800 dark:text-[#FF2F1F]"
                                      >Sold</span
                                    >
                                  {/if}
                                </td>
                              </tr>
                            {/each}
                          </tbody>
                        </table>
                      </div>
                      <!--<InfiniteLoading on:infinite={infiniteHandler} />-->

                      <!--<UpgradeToPro data={data} title="Track the latest trades of corrupt US Politicians"/>-->
                    </div>
                  </main>
                </div>
              </div>
            </section>
          </body>
        </main>

        <aside class="hidden lg:block relative fixed w-1/4 ml-4">
          {#if !["Pro", "Plus"]?.includes(data?.user?.tier)}
            <div
              class="w-full border border-gray-300 dark:border-gray-600 rounded h-fit pb-4 mt-4 cursor-pointer sm:hover:shadow-lg dark:sm:hover:bg-secondary transition ease-out duration-100"
            >
              <a
                href={"/pricing"}
                class="w-auto lg:w-full p-1 flex flex-col m-auto px-2 sm:px-0"
              >
                <div class="w-full flex justify-between items-center p-3 mt-3">
                  <h2 class="text-start text-xl font-bold ml-3">
                    Pro Subscription
                  </h2>
                  <ArrowLogo
                    class="w-8 h-8 mr-3 shrink-0 text-gray-400 dark:"
                  />
                </div>
                <span class="p-3 ml-3 mr-3">
                  Upgrade now for unlimited access to all data, tools and no
                  ads.
                </span>
              </a>
            </div>
          {/if}

          <div
            class="w-full border border-gray-300 dark:border-gray-600 rounded h-fit pb-4 mt-4 cursor-pointer sm:hover:shadow-lg dark:sm:hover:bg-secondary transition ease-out duration-100"
          >
            <a
              href={"/politicians"}
              class="w-auto lg:w-full p-1 flex flex-col m-auto px-2 sm:px-0"
            >
              <div class="w-full flex justify-between items-center p-3 mt-3">
                <h2 class="text-start text-xl font-bold ml-3">
                  All Congress Trading
                </h2>
                <ArrowLogo class="w-8 h-8 mr-3 shrink-0 text-gray-400 dark:" />
              </div>
              <span class="p-3 ml-3 mr-3">
                Get detailed reports on latest Congress trading transactions.
              </span>
            </a>
          </div>
        </aside>
      </div>
    </div>
  </div>
</section>
