<script lang="ts">
  import UpgradeToPro from "$lib/components/UpgradeToPro.svelte";
  import ArrowLogo from "lucide-svelte/icons/move-up-right";
  import TableHeader from "$lib/components/Table/TableHeader.svelte";
  import AnalystInfo from "$lib/components/AnalystInfo.svelte";

  import SEO from "$lib/components/SEO.svelte";

  import { onMount } from "svelte";

  export let data;

  let rawData = data?.getTopAnalyst;
  let originalData = [...rawData]; // Unaltered copy of raw data

  let analystList = rawData?.slice(0, 50) ?? [];

  async function handleScroll() {
    const scrollThreshold = document.body.offsetHeight * 0.8; // 80% of the website height
    const isBottom = window.innerHeight + window.scrollY >= scrollThreshold;

    if (isBottom && analystList?.length !== originalData?.length) {
      const nextIndex = analystList?.length;
      const filteredNewResults = originalData?.slice(nextIndex, nextIndex + 50);
      analystList = [...analystList, ...filteredNewResults];
    }
  }

  onMount(async () => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  });

  let columns = [
    { key: "rank", label: "Rank", align: "left" },
    { key: "analystName", label: "Analyst", align: "left" },
    { key: "successRate", label: "Success Rate", align: "right" },
    { key: "avgReturn", label: "Avg. Return", align: "right" },
    { key: "totalRatings", label: "Total Ratings", align: "right" },
    { key: "lastRating", label: "Last Rating", align: "right" },
  ];

  let sortOrders = {
    rank: { order: "none", type: "number" },
    analystName: { order: "none", type: "string" },
    successRate: { order: "none", type: "number" },
    avgReturn: { order: "none", type: "number" },
    totalRatings: { order: "none", type: "number" },
    lastRating: { order: "none", type: "date" },
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
      originalData = [...rawData]; // Reset originalData to rawData
      analystList = originalData?.slice(0, 50); // Reset displayed data
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
    analystList = originalData?.slice(0, 50); // Update the displayed data
  };
</script>

<SEO
  title="Top Wall Street Stock Analysts - Best Performing Equity Research"
  description="Discover the top Wall Street stock analysts ranked by success rate and average returns. Track analyst ratings, price targets, and performance metrics from leading investment banks and research firms."
  keywords="top wall street analysts, best stock analysts, analyst ratings, equity research analysts, analyst success rate, stock recommendations, analyst price targets, investment bank analysts, sell side research"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Top Wall Street Stock Analysts",
    "description": "Comprehensive ranking of Wall Street equity research analysts by performance metrics",
    "url": "https://stocknear.com/analysts",
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
          "name": "Top Wall Street Analysts",
          "item": "https://stocknear.com/analysts"
        }
      ]
    },
    "mainEntity": {
      "@type": "ItemList",
      "name": "Wall Street Analyst Rankings",
      "description": "List of equity research analysts ranked by success rate and average returns",
      "numberOfItems": rawData?.length || 0
    }
  }}
/>

<section
  class="w-full max-w-3xl sm:max-w-[1400px] overflow-hidden min-h-screen pt-5 px-4 lg:px-3 mb-20"
>
  <div class="text-sm sm:text-[1rem] breadcrumbs">
    <ul>
      <li><a href="/" class="text-muted dark:text-gray-300">Home</a></li>
      <li class="text-muted dark:text-gray-300">Top Wall Street Analysts</li>
    </ul>
  </div>

  <div class="w-full overflow-hidden m-auto mt-5 mb-20">
    <div class="sm:p-0 flex justify-center w-full m-auto overflow-hidden">
      <div
        class="relative flex flex-col lg:flex-row justify-center items-start overflow-hidden w-full"
      >
        <main class="w-full lg:w-3/4 lg:pr-10">
          <div class="mb-6 border-[#2C6288] dark:border-white border-b-[2px]">
            <h1 class="mb-1 text-2xl sm:text-3xl font-bold">
              Top Wall Street Analysts
            </h1>
            <p class="mb-3 px-1 font-semibold sm:px-0">
              A list of Wall Street Analysts, ranked by their performance
            </p>
          </div>

          <div class="w-full m-auto mt-10">
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
                  {#each analystList as item, index}
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
                        <div class="flex flex-col items-start">
                          <a
                            href={"/analysts/" + item?.analystId}
                            class="font-semibold dark:font-normal text-blue-800 sm:hover:text-muted dark:sm:hover:text-white dark:text-blue-400"
                            >{item?.analystName}
                          </a>
                          <!--<span class="">{item?.companyName} </span>-->
                          <div class="flex flex-row items-center mt-1">
                            {#each Array.from({ length: 5 }) as _, i}
                              {#if i < Math.floor(item?.analystScore)}
                                <svg
                                  class="w-3.5 h-3.5 text-[#FFA500]"
                                  aria-hidden="true"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="currentColor"
                                  viewBox="0 0 22 20"
                                >
                                  <path
                                    d="M20.924 7.625a1.523 1.523 0 0 0-1.238-1.044l-5.051-.734-2.259-4.577a1.534 1.534 0 0 0-2.752 0L7.365 5.847l-5.051.734A1.535 1.535 0 0 0 1.463 9.2l3.656 3.563-.863 5.031a1.532 1.532 0 0 0 2.226 1.616L11 17.033l4.518 2.375a1.534 1.534 0 0 0 2.226-1.617l-.863-5.03L20.537 9.2a1.523 1.523 0 0 0 .387-1.575Z"
                                  />
                                </svg>
                              {:else}
                                <svg
                                  class="w-3.5 h-3.5 text-gray-500"
                                  aria-hidden="true"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="currentColor"
                                  viewBox="0 0 22 20"
                                >
                                  <path
                                    d="M20.924 7.625a1.523 1.523 0 0 0-1.238-1.044l-5.051-.734-2.259-4.577a1.534 1.534 0 0 0-2.752 0L7.365 5.847l-5.051.734A1.535 1.535 0 0 0 1.463 9.2l3.656 3.563-.863 5.031a1.532 1.532 0 0 0 2.226 1.616L11 17.033l4.518 2.375a1.534 1.534 0 0 0 2.226-1.617l-.863-5.03L20.537 9.2a1.523 1.523 0 0 0 .387-1.575Z"
                                  />
                                </svg>
                              {/if}
                            {/each}

                            <span class="ml-1 dark:text-gray-400">
                              ({item?.analystScore !== null
                                ? item?.analystScore
                                : 0})
                            </span>
                          </div>
                        </div>
                      </td>

                      <td
                        class="text-end text-sm sm:text-[1rem] whitespace-nowrap"
                      >
                        {#if Number(item?.successRate) >= 0}
                          <span
                            class="font-semibold dark:font-normal text-green-800 dark:text-[#00FC50]"
                            >+{Number(item?.successRate)?.toFixed(2)}%</span
                          >
                        {/if}
                      </td>

                      <td
                        class="text-end text-sm sm:text-[1rem] whitespace-nowrap"
                      >
                        {#if Number(item?.avgReturn) >= 0}
                          <span
                            class="font-semibold dark:font-normal text-green-800 dark:text-[#00FC50]"
                            >+{Number(item?.avgReturn)?.toFixed(2)}%</span
                          >
                        {:else}
                          <span
                            class="font-semibold dark:font-normal text-[#B84242]"
                            >{Number(item?.avgReturn)?.toFixed(2)}%</span
                          >
                        {/if}
                      </td>

                      <td
                        class="text-end text-sm sm:text-[1rem] whitespace-nowrap"
                      >
                        {item?.totalRatings}
                      </td>

                      <!--
                            <td class=" text-sm sm:text-[1rem] whitespace-nowrap  text-end">
                              {item?.mainSectors?.at(0)}
                            </td>
                            -->

                      <td
                        class="text-end text-sm sm:text-[1rem] whitespace-nowrap"
                      >
                        {item?.lastRating !== null
                          ? new Date(item?.lastRating)?.toLocaleString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                daySuffix: "2-digit",
                              },
                            )
                          : "n/a"}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>

          <UpgradeToPro {data} />

          <AnalystInfo />
        </main>
        <aside class="inline-block relative w-full lg:w-1/4 mt-3">
          {#if !["Pro", "Plus"]?.includes(data?.user?.tier) || data?.user?.freeTrial}
            <div
              class="w-full border border-gray-300 dark:border-gray-600 rounded h-fit pb-4 mt-4 cursor-pointer sm:hover:shadow-lg dark:sm:hover:bg-secondary transition ease-out duration-100"
            >
              <a
                href="/pricing"
                class="w-auto lg:w-full p-1 flex flex-col m-auto px-2 sm:px-0"
              >
                <div class="w-full flex justify-between items-center p-3 mt-3">
                  <h2 class="text-start text-xl font-semibold sm:ml-3">
                    Pro Subscription
                  </h2>
                </div>
                <span class=" p-3 sm:ml-3 sm:mr-3 -mt-4">
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
              href={"/analysts/top-stocks"}
              class="w-auto lg:w-full p-1 flex flex-col m-auto px-2 sm:px-0"
            >
              <div class="w-full flex justify-between items-center p-3 mt-3">
                <h2 class="text-start text-xl font-bold ml-3">
                  Top Stocks Picks
                </h2>
                <ArrowLogo class="w-8 h-8 mr-3 shrink-0 " />
              </div>
              <span class="p-3 ml-3 mr-3">
                Get the latest top Wall Street analyst ratings.
              </span>
            </a>
          </div>

          <div
            class="w-full border border-gray-300 dark:border-gray-600 rounded h-fit pb-4 mt-4 cursor-pointer sm:hover:shadow-lg dark:sm:hover:bg-secondary transition ease-out duration-100"
          >
            <a
              href="/market-mover/gainers"
              class="w-auto lg:w-full p-1 flex flex-col m-auto px-2 sm:px-0"
            >
              <div class="w-full flex justify-between items-center p-3 mt-3">
                <h2 class="text-start text-xl font-bold ml-3">Market Movers</h2>
                <ArrowLogo class="w-8 h-8 mr-3 shrink-0 " />
              </div>
              <span class="p-3 ml-3 mr-3">
                Today's Top Stock Gainers, Losers and most Active
              </span>
            </a>
          </div>
        </aside>
      </div>
    </div>
  </div>
</section>
