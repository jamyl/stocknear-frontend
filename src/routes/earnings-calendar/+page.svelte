<script lang="ts">
  import {
    format,
    startOfWeek,
    addDays,
    addWeeks,
    subWeeks,
    differenceInWeeks,
  } from "date-fns";
  import { screenWidth } from "$lib/store";
  import { abbreviateNumber } from "$lib/utils";
  import TableHeader from "$lib/components/Table/TableHeader.svelte";
  import HoverStockChart from "$lib/components/HoverStockChart.svelte";
  import Infobox from "$lib/components/Infobox.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import { mode } from "mode-watcher";

  export let data;

  let currentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  let earningsCalendar = data?.getEarningsCalendar;
  const maxWeeksChange = 4; // Maximum allowed week change
  let previousMax = false;
  let nextMax = false;
  const today = new Date();

  let formattedMonday = startOfWeek(currentWeek, { weekStartsOn: 1 });
  let formattedTuesday = format(addDays(formattedMonday, 1), "EEE, MMM d");
  let formattedWednesday = format(addDays(formattedMonday, 2), "EEE, MMM d");
  let formattedThursday = format(addDays(formattedMonday, 3), "EEE, MMM d");
  let formattedFriday = format(addDays(formattedMonday, 4), "EEE, MMM d");
  formattedMonday = format(formattedMonday, "EEE, MMM d");

  let formattedWeekday = [
    formattedMonday,
    formattedTuesday,
    formattedWednesday,
    formattedThursday,
    formattedFriday,
  ];
  let weekday = [];
  let rawWeekday = [];

  let startDate = startOfWeek(currentWeek, { weekStartsOn: 1 });
  let endDate = addDays(startDate, 4);
  let formattedStartDate = format(startDate, "yyyy-MM-dd");
  let formattedEndDate = format(endDate, "yyyy-MM-dd");
  let daysOfWeek = [
    {
      name: "Monday",
      date: formattedStartDate,
    },
    {
      name: "Tuesday",
      date: format(addDays(startDate, 1), "yyyy-MM-dd"),
    },
    {
      name: "Wednesday",
      date: format(addDays(startDate, 2), "yyyy-MM-dd"),
    },
    {
      name: "Thursday",
      date: format(addDays(startDate, 3), "yyyy-MM-dd"),
    },
    {
      name: "Friday",
      date: formattedEndDate,
    },
  ];

  let currentDate = new Date();
  let currentWeekday = Math.min((currentDate.getDay() + 6) % 7, 4);
  let selectedWeekday = currentWeekday;

  function toggleDate(index) {
    if ($screenWidth > 640) {
      selectedWeekday = index;
    }
  }

  function clickWeekday(state, index) {
    if (state === "next" && selectedWeekday + 1 <= 4) {
      selectedWeekday = selectedWeekday + 1;
    } else if (state === "previous" && selectedWeekday - 1 >= 0) {
      selectedWeekday--;
    } else if (
      state === "previous" &&
      index === 0 &&
      differenceInWeeks(currentWeek, today) > -maxWeeksChange
    ) {
      changeWeek(state);
      selectedWeekday = 4;
    } else if (
      state === "next" &&
      index === 4 &&
      differenceInWeeks(currentWeek, today) < maxWeeksChange
    ) {
      changeWeek(state);
      selectedWeekday = 0;
    }
  }

  async function changeWeek(state) {
    //Limit the user to go back max 4 weeks and look forward 4 weeks

    if (
      state === "previous" &&
      differenceInWeeks(currentWeek, today) > -maxWeeksChange
    ) {
      currentWeek = subWeeks(currentWeek, 1);
    } else if (
      state === "next" &&
      differenceInWeeks(currentWeek, today) < maxWeeksChange
    ) {
      currentWeek = addWeeks(currentWeek, 1);
    }

    formattedMonday = startOfWeek(currentWeek, { weekStartsOn: 1 });
    formattedTuesday = format(addDays(formattedMonday, 1), "EEE, MMM d");
    formattedWednesday = format(addDays(formattedMonday, 2), "EEE, MMM d");
    formattedThursday = format(addDays(formattedMonday, 3), "EEE, MMM d");
    formattedFriday = format(addDays(formattedMonday, 4), "EEE, MMM d");
    formattedMonday = format(formattedMonday, "EEE, MMM d");

    formattedWeekday = [
      formattedMonday,
      formattedTuesday,
      formattedWednesday,
      formattedThursday,
      formattedFriday,
    ];
    weekday = [];
    rawWeekday = [];

    startDate = startOfWeek(currentWeek, { weekStartsOn: 1 });
    endDate = addDays(startDate, 4);
    formattedStartDate = format(startDate, "yyyy-MM-dd");
    formattedEndDate = format(endDate, "yyyy-MM-dd");
    daysOfWeek = [
      {
        name: "Monday",
        date: formattedStartDate,
      },
      {
        name: "Tuesday",
        date: format(addDays(startDate, 1), "yyyy-MM-dd"),
      },
      {
        name: "Wednesday",
        date: format(addDays(startDate, 2), "yyyy-MM-dd"),
      },
      {
        name: "Thursday",
        date: format(addDays(startDate, 3), "yyyy-MM-dd"),
      },
      {
        name: "Friday",
        date: formattedEndDate,
      },
    ];

    earningsCalendar = daysOfWeek?.map((day) => {
      return {
        name: day.name,
        data: data?.getEarningsCalendar?.filter(
          (item) => item?.date === day?.date,
        ),
      };
    });

    if (earningsCalendar?.length) {
      // Loop through each day of the week
      for (let i = 0; i < earningsCalendar.length; i++) {
        const dayData = earningsCalendar[i].data;

        // Filter out entries with company name "---"

        // Sort and map the filtered data
        rawWeekday[i] = dayData?.sort((a, b) => b?.marketCap - a?.marketCap);
      }
      weekday = rawWeekday;
    }
  }

  $: {
    if (earningsCalendar) {
      earningsCalendar = daysOfWeek?.map((day) => {
        return {
          name: day.name,
          data: data?.getEarningsCalendar?.filter(
            (item) => item?.date === day?.date,
          ),
        };
      });

      if (earningsCalendar?.length) {
        // Loop through each day of the week
        for (let i = 0; i < earningsCalendar.length; i++) {
          const dayData = earningsCalendar[i].data;

          // Filter out entries with company name "---"

          // Sort and map the filtered data
          rawWeekday[i] = dayData?.sort((a, b) => b?.marketCap - a?.marketCap);
        }
        weekday = rawWeekday;
      }
    }
  }

  $: {
    if (currentWeek) {
      if (differenceInWeeks(currentWeek, today) > -maxWeeksChange) {
        previousMax = false;
      } else {
        previousMax = true;
      }
    }
  }

  $: {
    if (currentWeek) {
      if (differenceInWeeks(currentWeek, today) < maxWeeksChange) {
        nextMax = false;
      } else {
        nextMax = true;
      }
    }
  }

  let columns = [
    { key: "symbol", label: "Symbol", align: "left" },
    { key: "name", label: "Name", align: "left" },
    { key: "marketCap", label: "Market Cap", align: "right" },
    { key: "revenueEst", label: "Revenue Estimate", align: "right" },
    { key: "epsEst", label: "EPS Estimate", align: "right" },
    { key: "release", label: "Earnings Time", align: "right" },
  ];

  let sortOrders = {
    symbol: { order: "none", type: "string" },
    name: { order: "none", type: "string" },
    marketCap: { order: "none", type: "number" },
    revenueEst: { order: "none", type: "number" },
    epsEst: { order: "none", type: "number" },
    release: { order: "none", type: "string" },
  };

  $: originalData = rawWeekday[selectedWeekday];

  const sortData = (key) => {
    // Reset all other keys to 'none' except the current key
    for (const k in sortOrders) {
      if (k !== key) {
        sortOrders[k].order = "none";
      }
    }

    // Cycle through 'none', 'asc', 'desc' for the clicked key
    const orderCycle = ["none", "asc", "desc"];

    const currentOrderIndex = orderCycle.indexOf(sortOrders[key].order);
    sortOrders[key].order =
      orderCycle[(currentOrderIndex + 1) % orderCycle.length];
    const sortOrder = sortOrders[key].order;

    // Reset to original data when 'none' and stop further sorting
    if (sortOrder === "none") {
      weekday[selectedWeekday] = [...originalData]; // Reset to original data (spread to avoid mutation)
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
    weekday[selectedWeekday] = [...originalData]?.sort(compareValues);
  };
</script>

<SEO
  title="Earnings Calendar - Corporate Earnings Releases & Financial Results Schedule"
  description="Track upcoming earnings announcements with our comprehensive earnings calendar. Get real-time earnings dates, revenue estimates, EPS forecasts, and financial results for all major US stocks. Monitor pre-market and after-hours earnings releases with detailed analyst expectations and historical performance data."
  keywords="earnings calendar, earnings announcements, corporate earnings, earnings dates, EPS estimates, revenue forecasts, financial results, earnings season, quarterly earnings, earnings schedule, earnings reports, analyst estimates, earnings per share, company financials"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Earnings Calendar",
    description:
      "Comprehensive earnings calendar tracking corporate earnings announcements, financial results, and analyst estimates for US stocks",
    url: "https://stocknear.com/earnings-calendar",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web Browser",
    browserRequirements: "Modern web browser with JavaScript enabled",
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
          name: "Earnings Calendar",
          item: "https://stocknear.com/earnings-calendar",
        },
      ],
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Real-time earnings announcement tracking",
      "Revenue and EPS estimate analysis",
      "Pre-market and after-hours earnings identification",
      "Market capitalization filtering",
      "Weekly earnings calendar navigation",
      "Analyst consensus forecasts",
      "Historical earnings performance",
      "Sortable earnings data tables",
    ],
    creator: {
      "@type": "Organization",
      name: "Stocknear",
      url: "https://stocknear.com",
    },
  }}
/>

<section
  class="w-full max-w-3xl sm:max-w-[1400px] overflow-hidden min-h-screen pt-5 px-4 lg:px-3 mb-20"
>
  <div class="text-sm sm:text-[1rem] breadcrumbs">
    <ul>
      <li><a href="/" class="text-muted dark:text-gray-300">Home</a></li>
      <li class="text-muted dark:text-gray-300">Earnings Calendar</li>
    </ul>
  </div>

  <div class="w-full overflow-hidden m-auto mt-5">
    <div class="sm:p-0 flex justify-center w-full m-auto overflow-hidden">
      <div
        class="relative flex justify-center items-start overflow-hidden w-full"
      >
        <main class="w-full lg:pr-5">
          <div class="mb-6 border-[#2C6288] dark:border-white border-b-[2px]">
            <h1 class="mb-1 text-2xl sm:text-3xl font-bold">
              Earnings Calendar
            </h1>
          </div>
          <!-- Page wrapper -->
          <div class="flex justify-center w-full m-auto h-full overflow-hidden">
            <!-- Content area -->
            <div class="w-full overflow-x-auto">
              <!-- Cards -->
              <div
                class=" w-full flex flex-row justify-center m-auto items-center"
              >
                <!-- Start Columns -->
                <label
                  on:click={() => changeWeek("previous")}
                  class="{previousMax
                    ? 'opacity-80'
                    : ''} hidden sm:flex h-16 w-48 cursor-pointer border m-auto flex bg-default text-white dark:bg-primary border border-gray-300 dark:border-gray-600 mb-3"
                >
                  <svg
                    class="w-6 h-6 m-auto rotate-180"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    ><path
                      fill="currentColor"
                      d="M8.025 22L6.25 20.225L14.475 12L6.25 3.775L8.025 2l10 10l-10 10Z"
                    /></svg
                  >
                </label>
                {#each weekday as day, index}
                  <div
                    class="w-full {index === selectedWeekday
                      ? ''
                      : 'hidden sm:block'}"
                  >
                    <label
                      on:click={() => toggleDate(index)}
                      class=" m-auto w-full cursor-pointer h-16 {index ===
                      selectedWeekday
                        ? 'bg-default text-white dark:bg-white dark:text-black font-semibold'
                        : ''} rounded sm:rounded-none flex dark:bg-default border border-gray-300 dark:border-gray-600 mb-3"
                    >
                      <div
                        class=" flex flex-row justify-center items-center w-full"
                      >
                        <label
                          on:click={() => clickWeekday("previous", index)}
                          class="{previousMax === true && index === 0
                            ? 'opacity-20'
                            : ''} sm:hidden ml-auto"
                        >
                          <svg
                            class="w-8 h-8 inline-block rotate-180"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            ><path
                              fill="black"
                              d="M8.025 22L6.25 20.225L14.475 12L6.25 3.775L8.025 2l10 10l-10 10Z"
                            /></svg
                          >
                        </label>
                        <div
                          class="flex flex-col items-center truncate m-auto p-1"
                        >
                          <span class="text-[1rem]"
                            >{formattedWeekday[index]}</span
                          >
                          <span class="text-[1rem] sm:text-sm m-auto pt-1 pb-1">
                            {day?.length} Earnings</span
                          >
                        </div>
                        <label
                          on:click={() => clickWeekday("next", index)}
                          class="{nextMax === true && index === 4
                            ? 'opacity-20'
                            : ''} sm:hidden mr-auto"
                        >
                          <svg
                            class="w-8 h-8 inline-block"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            ><path
                              fill="black"
                              d="M8.025 22L6.25 20.225L14.475 12L6.25 3.775L8.025 2l10 10l-10 10Z"
                            /></svg
                          >
                        </label>
                      </div>
                    </label>
                  </div>
                {/each}
                <label
                  on:click={() => changeWeek("next")}
                  class="{nextMax
                    ? 'opacity-80'
                    : ''} hidden sm:flex h-16 w-48 cursor-pointer border m-auto flex bg-default text-white dark:bg-primary border border-gray-300 dark:border-gray-600 mb-3"
                >
                  <svg
                    class="w-6 h-6 m-auto"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    ><path
                      fill="currentColor"
                      d="M8.025 22L6.25 20.225L14.475 12L6.25 3.775L8.025 2l10 10l-10 10Z"
                    /></svg
                  >
                </label>
              </div>

              {#each weekday as day, index}
                {#if index === selectedWeekday}
                  {#if day?.length !== 0}
                    <h2 class="font-semibold text-xl mt-5">
                      {formattedWeekday[index]?.split(", ")[1]} · {day?.length} Earnings
                    </h2>

                    <div class="w-full overflow-x-auto no-scrollbar">
                      <table
                        class="table table-sm table-compact no-scrollbar rounded-none sm:rounded w-full border border-gray-300 dark:border-gray-800 m-auto mt-4"
                      >
                        <thead>
                          <TableHeader {columns} {sortOrders} {sortData} />
                        </thead>
                        <tbody>
                          {#each day as item, index}
                            <!-- row -->
                            <tr
                              class="dark:sm:hover:bg-[#245073]/10 odd:bg-[#F6F7F8] dark:odd:bg-odd"
                            >
                              <td
                                class="text-blue-400 text-start text-sm sm:text-[1rem]"
                              >
                                <HoverStockChart symbol={item?.symbol} />
                              </td>

                              <td
                                class=" whitespace-nowrap text-sm sm:text-[1rem]"
                              >
                                {item?.name.length > 20
                                  ? item?.name?.slice(0, 20) + "..."
                                  : item?.name}
                              </td>

                              <td class=" text-end text-sm sm:text-[1rem]">
                                {@html item?.marketCap !== null
                                  ? abbreviateNumber(
                                      item?.marketCap,
                                      false,
                                      true,
                                    )
                                  : "n/a"}
                              </td>

                              <td class=" text-end text-sm sm:text-[1rem]">
                                <div
                                  class="flex flex-row items-center justify-end"
                                >
                                  <span>
                                    {@html item?.revenueEst !== null
                                      ? abbreviateNumber(
                                          item?.revenueEst,
                                          false,
                                          true,
                                        )
                                      : "n/a"}
                                  </span>
                                  {#if item?.revenueEst !== null && item?.revenuePrior !== null && item?.revenuePrior !== 0}
                                    {#if !isFinite((item?.revenueEst / item?.revenuePrior - 1) * 100)}
                                      <span class="ml-1"></span>
                                    {:else if item?.revenueEst / item?.revenuePrior - 1 >= 0}
                                      <span
                                        class="ml-1 text-green-800 dark:text-[#00FC50]"
                                      >
                                        +{(
                                          (item?.revenueEst /
                                            item?.revenuePrior -
                                            1) *
                                          100
                                        )?.toFixed(2)}%
                                      </span>
                                    {:else}
                                      <span
                                        class="ml-1 text-red-800 dark:text-[#FF2F1F]"
                                      >
                                        {(
                                          (item?.revenueEst /
                                            item?.revenuePrior -
                                            1) *
                                          100
                                        )?.toFixed(2)}%
                                      </span>
                                    {/if}
                                  {/if}
                                </div>
                              </td>

                              <td class=" text-end text-sm sm:text-[1rem]">
                                <div
                                  class="flex flex-row items-center justify-end"
                                >
                                  <span>
                                    {item?.epsEst !== null
                                      ? item?.epsEst?.toFixed(2)
                                      : "n/a"}
                                  </span>
                                  {#if item?.epsEst !== null && item?.epsPrior !== null && item?.epsPrior !== 0}
                                    {#if item?.epsEst / item?.epsPrior - 1 >= 0}
                                      <span
                                        class="ml-1 text-green-800 dark:text-[#00FC50]"
                                      >
                                        +{(
                                          (item?.epsEst / item?.epsPrior - 1) *
                                          100
                                        )?.toFixed(2)}%
                                      </span>
                                    {:else}
                                      <span
                                        class="ml-1 text-red-800 dark:text-[#FF2F1F]"
                                      >
                                        {(
                                          (item?.epsEst / item?.epsPrior - 1) *
                                          100
                                        )?.toFixed(2)}%
                                      </span>
                                    {/if}
                                  {/if}
                                </div>
                              </td>

                              <td
                                class=" text-end text-sm sm:text-[1rem] whitespace-nowrap"
                              >
                                {#if item?.release === "amc"}
                                  <svg
                                    class="w-4 h-4 inline-block mr-1"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 256 256"
                                    ><path
                                      fill={$mode === "light"
                                        ? "#397de9"
                                        : "#70A1EF"}
                                      d="M232.13 143.64a6 6 0 0 0-6-1.49a90.07 90.07 0 0 1-112.27-112.3a6 6 0 0 0-7.49-7.48a102.88 102.88 0 0 0-51.89 36.31a102 102 0 0 0 142.84 142.84a102.88 102.88 0 0 0 36.31-51.89a6 6 0 0 0-1.5-5.99m-42 48.29a90 90 0 0 1-126-126a90.9 90.9 0 0 1 35.52-28.27a102.06 102.06 0 0 0 118.69 118.69a90.9 90.9 0 0 1-28.24 35.58Z"
                                    /></svg
                                  >
                                  After Close
                                {:else}
                                  <svg
                                    class="w-4 h-4 inline-block mr-1"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 256 256"
                                    ><g
                                      fill={$mode === "light"
                                        ? "#C39401"
                                        : "#FEC001"}
                                      ><path
                                        d="M184 128a56 56 0 1 1-56-56a56 56 0 0 1 56 56Z"
                                        opacity=".2"
                                      /><path
                                        d="M120 40V16a8 8 0 0 1 16 0v24a8 8 0 0 1-16 0Zm72 88a64 64 0 1 1-64-64a64.07 64.07 0 0 1 64 64Zm-16 0a48 48 0 1 0-48 48a48.05 48.05 0 0 0 48-48ZM58.34 69.66a8 8 0 0 0 11.32-11.32l-16-16a8 8 0 0 0-11.32 11.32Zm0 116.68l-16 16a8 8 0 0 0 11.32 11.32l16-16a8 8 0 0 0-11.32-11.32ZM192 72a8 8 0 0 0 5.66-2.34l16-16a8 8 0 0 0-11.32-11.32l-16 16A8 8 0 0 0 192 72Zm5.66 114.34a8 8 0 0 0-11.32 11.32l16 16a8 8 0 0 0 11.32-11.32ZM48 128a8 8 0 0 0-8-8H16a8 8 0 0 0 0 16h24a8 8 0 0 0 8-8Zm80 80a8 8 0 0 0-8 8v24a8 8 0 0 0 16 0v-24a8 8 0 0 0-8-8Zm112-88h-24a8 8 0 0 0 0 16h24a8 8 0 0 0 0-16Z"
                                      /></g
                                    ></svg
                                  >
                                  Before Open
                                {/if}
                              </td>
                            </tr>
                          {/each}
                        </tbody>
                      </table>
                    </div>
                  {:else}
                    <div class="mt-5 mb-3">
                      <Infobox
                        text=" No Earnings reports available for the day."
                      />
                    </div>
                  {/if}
                {/if}
              {/each}
            </div>
          </div>
        </main>
      </div>
    </div>
  </div>
</section>
