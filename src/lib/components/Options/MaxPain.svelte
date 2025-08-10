<script lang="ts">
  import { abbreviateNumber, removeCompanyStrings } from "$lib/utils";
  import { displayCompanyName, screenWidth } from "$lib/store";

  import TableHeader from "$lib/components/Table/TableHeader.svelte";
  import * as DropdownMenu from "$lib/components/shadcn/dropdown-menu/index.js";
  import { Button } from "$lib/components/shadcn/button/index.js";
  import { goto } from "$app/navigation";

  import highcharts from "$lib/highcharts.ts";
  import { mode } from "mode-watcher";

  export let data;
  export let ticker = null;

  let isLoaded = false;
  let currentPrice = null;
  let rawData = [];

  let dateList = [];
  let selectedDate;
  let selectedMaxPain;

  let displayList = [];

  let configStrike = null;
  let configExpiry = null;

  // Calculate metrics for insight paragraph
  $: nearTermMaxPain = rawData?.[0]?.maxPain || 0;
  $: nearTermExpiry = rawData?.[0]?.expiration || null;
  $: nearTermDaysLeft = nearTermExpiry ? daysLeft(nearTermExpiry) : 0;

  $: priceVsMaxPain =
    currentPrice && nearTermMaxPain
      ? ((currentPrice - nearTermMaxPain) / nearTermMaxPain) * 100
      : 0;

  // Calculate average max pain across all expirations
  $: averageMaxPain =
    rawData.length > 0
      ? rawData.reduce((sum, item) => sum + (item.maxPain || 0), 0) /
        rawData.length
      : 0;

  // Find the trend in max pain (comparing near-term to longer-term)
  $: maxPainTrend = (() => {
    if (rawData.length < 3) return "stable";
    const nearTerm =
      rawData
        .slice(0, Math.min(3, rawData.length))
        .reduce((sum, item) => sum + item.maxPain, 0) /
      Math.min(3, rawData.length);
    const longerTerm =
      rawData
        .slice(3, Math.min(6, rawData.length))
        .reduce((sum, item) => sum + item.maxPain, 0) /
      Math.min(3, rawData.length - 3);

    if (longerTerm === 0) return "stable";
    const change = ((nearTerm - longerTerm) / longerTerm) * 100;

    if (Math.abs(change) < 2) return "stable";
    return change > 0 ? "rising" : "falling";
  })();

  // Find expirations where max pain is significantly different from current price
  $: significantDeviations = rawData.filter((item) => {
    const deviation = Math.abs(
      ((item.maxPain - currentPrice) / currentPrice) * 100,
    );
    return deviation > 5; // More than 5% away
  }).length;

  // Calculate the range of max pain values
  $: maxPainRange =
    rawData.length > 0
      ? {
          min: Math.min(...rawData.map((item) => item.maxPain)),
          max: Math.max(...rawData.map((item) => item.maxPain)),
        }
      : { min: 0, max: 0 };

  // Identify if there's a clustering of max pain at certain levels
  $: maxPainClusters = (() => {
    if (rawData.length < 3) return [];
    const threshold = 1; // Within 1% considered a cluster
    const clusters = {};

    rawData.forEach((item) => {
      const rounded = Math.round(item.maxPain);
      if (!clusters[rounded]) clusters[rounded] = 0;
      clusters[rounded]++;
    });

    return Object.entries(clusters)
      .filter(([_, count]) => count >= 2)
      .map(([price, count]) => ({ price: parseFloat(price), count }))
      .sort((a, b) => b.count - a.count);
  })();

  function initialize() {
    currentPrice = Number(data?.getStockQuote?.price?.toFixed(2));
    rawData = data?.getData;
    dateList = rawData?.map((item) => item?.expiration);
    selectedDate = dateList?.at(0);
    selectedMaxPain = rawData?.at(0)?.maxPain;
    displayList = rawData?.slice(0, 150) || [];

    configExpiry = plotExpiry() || null;
  }

  function daysLeft(targetDate) {
    // Parse the target date parts:
    const [year, month, day] = targetDate?.split("-")?.map(Number);

    // Build a UTC timestamp for midnight of that date:
    const targetUTCms = Date?.UTC(year, month - 1, day);

    // Now (in ms since epoch, UTC):
    const nowUTCms = Date?.now();

    // Milliseconds in one full day:
    const msPerDay = 24 * 60 * 60 * 1000;

    // Difference, then round up to the next integer day:
    const diff = targetUTCms - nowUTCms;
    const days = Math.ceil(diff / msPerDay);

    return `${days}`;
  }

  function formatDate(dateStr) {
    try {
      let date = new Date(dateStr + "T00:00:00Z");
      let options = {
        timeZone: "UTC",
        month: "short", // Full month name
        day: "numeric", // Day without leading zero
        year: "numeric", // Full year
      };

      let formatter = new Intl.DateTimeFormat("en-US", options);

      return formatter?.format(date);
    } catch (e) {
      return "n/a";
    }
  }

  function plotStrikePrice() {
    const raw = rawData?.find((item) => item?.expiration === selectedDate);
    if (!raw) return {};

    // Destructure strikes and payouts
    let strikes = raw.strikes; // e.g. [95,96,97,...]
    let callData = raw.callPayouts;
    let putData = raw.putPayouts;
    selectedMaxPain = raw.maxPain;

    // Ensure current price and maxPain are in our categories
    const extras = [currentPrice, selectedMaxPain].filter(
      (s) => typeof s === "number",
    );
    const allStrikes = Array.from(new Set([...strikes, ...extras])).sort(
      (a, b) => a - b,
    );

    // Re-map call/put data to align with allStrikes (fill missing with 0)
    const callSeries = allStrikes.map((s) => {
      const idx = strikes.indexOf(s);
      return idx > -1 ? callData[idx] : 0;
    });
    const putSeries = allStrikes.map((s) => {
      const idx = strikes.indexOf(s);
      return idx > -1 ? putData[idx] : 0;
    });

    // Build the Highcharts options
    return {
      credits: { enabled: false },

      chart: {
        backgroundColor: $mode === "light" ? "#fff" : "#09090B",
        plotBackgroundColor: $mode === "light" ? "#fff" : "#09090B",
        height: 360,
        animation: false, // Disable initial animation
      },

      title: {
        text: `<h3 class="mt-3 mb-1 text-[1rem] sm:text-lg"> Max Pain By Strike</h3>`,
        useHTML: true,
        style: { color: $mode === "light" ? "black" : "white" },
      },

      xAxis: {
        categories: allStrikes,
        plotLines: [
          {
            value:
              $screenWidth < 640
                ? null
                : allStrikes.findIndex((s) => s === currentPrice),
            color: $mode === "light" ? "#000" : "#fff",
            dashStyle: "Dash",
            width: 1.5,
            label: {
              text: `Current Price ${currentPrice}`,
              style: { color: $mode === "light" ? "#000" : "#fff" },
            },
            zIndex: 5,
          },
          {
            value: allStrikes.findIndex((s) => s === selectedMaxPain),
            color: $mode === "light" ? "#000" : "#fff",
            dashStyle: "Dash",
            width: 1.5,
            label: {
              text: `Max Pain ${(selectedMaxPain || 0).toFixed(2)}`,
              style: { color: $mode === "light" ? "#000" : "#fff" },
            },
            zIndex: 5,
          },
        ],
        gridLineWidth: 0,
        crosshair: {
          color: $mode === "light" ? "black" : "white",
          width: 1,
          dashStyle: "Solid",
          snap: true, // snap crosshair without animation
        },
        labels: {
          style: { color: $mode === "light" ? "#545454" : "white" },
          formatter() {
            return this.pos % 1 === 0 ? this.value : "";
          },
        },
        tickAmount: 12,
      },

      yAxis: [
        {
          gridLineWidth: 1,
          gridLineColor: $mode === "light" ? "#e5e7eb" : "#111827",
          labels: { style: { color: $mode === "light" ? "#545454" : "white" } },
          title: { text: null },
          opposite: true,
        },
        {
          gridLineWidth: 0,
          labels: { enabled: false },
          title: { text: null },
        },
      ],

      plotOptions: {
        column: { groupPadding: 0.1, pointPadding: 0.1, borderWidth: 0 },
        series: {
          animation: false, // Disable per-series animation
          states: { hover: { enabled: false } }, // Disable hover animation
        },
      },

      tooltip: {
        shared: true,
        useHTML: true,
        animation: false, // Disable tooltip animation
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderColor: "rgba(255, 255, 255, 0.2)",
        borderWidth: 1,
        borderRadius: 4,
        style: { color: "#fff", fontSize: "16px", padding: "10px" },
        formatter() {
          let s = `<span class="text-white font-[501]">Strike ${this.x}</span><br>`;
          this.points.forEach((point) => {
            s +=
              `<span style="display:inline-block;width:10px;height:10px;background-color:${point.color};border-radius:50%;margin-right:5px;"></span>` +
              `<span class="text-white font-semibold text-sm">${point.series.name}:</span>` +
              `<span class="text-white font-normal text-sm">${abbreviateNumber(point.y)}</span><br>`;
          });
          return s;
        },
      },

      series: [
        {
          name: "Call",
          type: "column",
          data: callSeries,
          color: $mode === "light" ? "#08B108" : "#00FC50",
          borderColor: $mode === "light" ? "#08B108" : "#00FC50",
          borderRadius: 0,
          marker: { enabled: false },
          animation: false, // Extra safeguard
        },
        {
          name: "Put",
          type: "column",
          data: putSeries,
          color: "#FF0808",
          borderColor: "#FF0808",
          borderRadius: 0,
          marker: { enabled: false },
          animation: false, // Extra safeguard
        },
      ],

      legend: {
        enabled: true,
        align: "center", // Positions legend at the left edge
        verticalAlign: "top", // Positions legend at the top
        layout: "horizontal", // Align items horizontally (use 'vertical' if preferred)
        itemStyle: {
          color: $mode === "light" ? "black" : "white",
        },
        symbolWidth: 14, // Controls the width of the legend symbol
        symbolRadius: 1, // Creates circular symbols (adjust radius as needed)
        squareSymbol: true, // Ensures symbols are circular, not square
      },
    };
  }

  function plotExpiry() {
    // Destructure strikes and payouts
    let maxPainList = rawData?.map((item) => item?.maxPain);

    // Build the Highcharts options
    return {
      credits: { enabled: false },
      chart: {
        backgroundColor: $mode === "light" ? "#fff" : "#09090B",
        plotBackgroundColor: $mode === "light" ? "#fff" : "#09090B",
        animation: false, // Disable initial animation
        height: 360,
      },

      title: {
        text: `<h3 class="mt-3 mb-1 text-[1rem] sm:text-lg"> Max Pain By Expiry</h3>`,
        useHTML: true,
        style: { color: $mode === "light" ? "black" : "white" },
      },

      xAxis: {
        endOnTick: false,
        categories: dateList,
        crosshair: {
          color: $mode === "light" ? "black" : "white", // Set the color of the crosshair line
          width: 1, // Adjust the line width as needed
          dashStyle: "Solid",
        },

        labels: {
          style: { color: $mode === "light" ? "black" : "white" },
          distance: 10, // Increases space between label and axis
          formatter: function () {
            return new Date(this.value).toLocaleDateString("en-US", {
              day: "2-digit", // Include day number
              month: "short", // Display short month name
              year: "numeric", // Include year
            });
          },
        },
      },
      yAxis: {
        plotLines: [
          {
            value: currentPrice,
            color: $mode === "light" ? "#000" : "#fff",
            dashStyle: "Dash",
            width: 1.5,
            label: {
              text: `Current Price ${currentPrice}`,
              style: { color: $mode === "light" ? "#000" : "#fff" },
            },
            zIndex: 5,
          },
        ],
        gridLineWidth: 1,
        gridLineColor: $mode === "light" ? "#e5e7eb" : "#111827",
        labels: { style: { color: $mode === "light" ? "#545454" : "white" } },
        title: { text: null },
        opposite: true,
      },

      plotOptions: {
        column: { groupPadding: 0.1, pointPadding: 0.1, borderWidth: 0 },
        series: {
          animation: false, // Disable per-series animation
          states: { hover: { enabled: false } }, // Disable hover animation
        },
      },

      tooltip: {
        shared: true,
        useHTML: true,
        backgroundColor: "rgba(0, 0, 0, 0.8)", // Semi-transparent black
        borderColor: "rgba(255, 255, 255, 0.2)", // Slightly visible white border
        borderWidth: 1,
        style: {
          color: "#fff",
          fontSize: "16px",
          padding: "10px",
        },
        borderRadius: 4,
        formatter: function () {
          // Format the x value to display time in a custom format
          let tooltipContent = `<span class="m-auto text-[1rem] font-[501]">Max Pain ${this?.y?.toLocaleString("en-US")}</span><br>`;

          // Loop through each point in the shared tooltip
          this.points.forEach((point) => {
            tooltipContent += `
        <span class="font-normal text-sm mt-1">${formatDate(this?.x)}</span><br>`;
          });

          return tooltipContent;
        },
      },

      series: [
        {
          name: "Max Pain",
          type: "column",
          data: maxPainList,
          color: $mode === "light" ? "#2C6288" : "#fff",
          borderColor: $mode === "light" ? "#2C6288" : "#fff",
          borderRadius: 0,
          marker: { enabled: false },
          animation: false, // Extra safeguard
        },
      ],

      legend: {
        enabled: false,
      },
    };
  }

  $: columns = [
    { key: "expiration", label: "Expiration Date", align: "left" },
    { key: "maxPain", label: "Max Pain", align: "right" },
    {
      key: "changesPercentage",
      label: "Max Pain vs Current Price",
      align: "right",
    },
  ];

  $: sortOrders = {
    expiration: { order: "none", type: "date" },
    maxPain: { order: "none", type: "number" },
    changesPercentage: { order: "none", type: "number" },
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
      displayList = [...originalData]?.slice(0, 150); // Reset originalData to rawData
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
        case "sentiment":
          const sentimentOrder = { BULLISH: 1, NEUTRAL: 2, BEARISH: 3 };
          const sentimentA = sentimentOrder[a?.sentiment?.toUpperCase()] || 4;
          const sentimentB = sentimentOrder[b?.sentiment?.toUpperCase()] || 4;
          return sortOrder === "asc"
            ? sentimentA - sentimentB
            : sentimentB - sentimentA;

        case "number":
        default:
          valueA = parseFloat(a[key]);
          valueB = parseFloat(b[key]);
          break;
      }

      // Default comparison for numbers and fallback case
      if (valueA < valueB) return sortOrder === "asc" ? -1 : 1;
      if (valueA > valueB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    };

    // Sort using the generic comparison function
    displayList = [...originalData].sort(compareValues)?.slice(0, 150);
  };

  $: {
    if ($mode || selectedDate) {
      configStrike = plotStrikePrice() || null;
    }
  }

  initialize();
</script>

<section class="w-full overflow-hidden min-h-screen sm:pb-20">
  <div class="w-full flex h-full overflow-hidden">
    <div
      class="w-full relative flex justify-center items-center overflow-hidden"
    >
      <div class="sm:pl-7 sm:pb-7 sm:pt-7 w-full m-auto mt-2 sm:mt-0">
        <h2
          class=" flex flex-row items-center text-xl sm:text-2xl font-bold w-fit mb-2 sm:mb-0"
        >
          {removeCompanyStrings($displayCompanyName)} Max Pain By Strike
        </h2>

        <!-- Insightful overview paragraph -->
        <div class="w-full mt-4 mb-6">
          <p>
            <strong>{ticker}</strong> trades at
            <strong>${currentPrice}</strong>,
            {Math.abs(priceVsMaxPain) < 2
              ? "pinned near"
              : priceVsMaxPain > 0
                ? `${Math.abs(priceVsMaxPain).toFixed(1)}% above`
                : `${Math.abs(priceVsMaxPain).toFixed(1)}% below`}
            the near-term max pain of <strong>${nearTermMaxPain}</strong>
            expiring {formatDate(nearTermExpiry)} ({nearTermDaysLeft} days).
            {Math.abs(priceVsMaxPain) > 5
              ? priceVsMaxPain > 0
                ? " Expect downward pressure as dealers benefit from price declining toward max pain."
                : " Look for upward drift as max pain acts as a magnet pulling price higher."
              : " Price stability likely with balanced options positioning at this level."}
            Max pain is <strong>{maxPainTrend}</strong> across expirations (${maxPainRange.min}-${maxPainRange.max}),
            {maxPainTrend === "rising"
              ? "reflecting growing call interest at higher strikes"
              : maxPainTrend === "falling"
                ? "signaling increased put positioning or downside protection"
                : "indicating stable market expectations"}.
            {maxPainClusters.length > 0
              ? ` Key magnetic zone at ${maxPainClusters[0].price} where ${maxPainClusters[0].count} expirations converge.`
              : ""}
            {significantDeviations > rawData.length * 0.5
              ? ` High dispersion in max pain levels suggests competing forces and potential volatility.`
              : ""}
          </p>
        </div>

        <div class="mt-4">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild let:builder>
              <Button
                builders={[builder]}
                class=" border border-gray-300 dark:border-gray-700 text-white bg-black sm:hover:bg-default dark:default h-[38px] flex flex-row justify-between items-center min-w-[130px] max-w-[240px] sm:w-auto  px-3  rounded truncate"
              >
                <span class="truncate text-sm"
                  >Date Expiration | {formatDate(selectedDate)}</span
                >
                <svg
                  class="-mr-1 ml-2 h-5 w-5 inline-block"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  style="max-width:40px"
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  ></path>
                </svg>
              </Button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Content
              side="bottom"
              align="end"
              sideOffset={10}
              alignOffset={0}
              class="min-w-56 w-auto max-w-60 max-h-[400px] overflow-y-auto scroller relative"
            >
              <!-- Dropdown items -->
              <DropdownMenu.Group class="pb-2"
                >{#each dateList as item, index}
                  {#if data?.user?.tier === "Pro" || index === 0}
                    <DropdownMenu.Item
                      on:click={() => {
                        selectedDate = item;
                      }}
                      class="{selectedDate === item
                        ? 'bg-gray-200 dark:bg-primary'
                        : ''} sm:hover:bg-gray-200 dark:sm:hover:bg-primary cursor-pointer "
                    >
                      {formatDate(item)}
                    </DropdownMenu.Item>
                  {:else}
                    <DropdownMenu.Item
                      on:click={() => goto("/pricing")}
                      class="cursor-pointer sm:hover:bg-gray-200 dark:sm:hover:bg-primary"
                    >
                      {formatDate(item)}
                      <svg
                        class="ml-1 size-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        style="max-width: 40px;"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                          clip-rule="evenodd"
                        >
                        </path>
                      </svg>
                    </DropdownMenu.Item>
                  {/if}
                {/each}</DropdownMenu.Group
              >
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>

        <div>
          <div class="grow mt-3">
            <div class="relative">
              <!-- Apply the blur class to the chart -->
              <div
                class="mt-5 shadow-xs sm:mt-0 sm:border sm:border-gray-300 dark:border-gray-800 rounded"
                use:highcharts={configStrike}
              ></div>
            </div>
          </div>
        </div>

        <h2
          class="mt-10 flex flex-row items-center text-xl sm:text-2xl font-bold w-fit mb-2 sm:mb-0"
        >
          {removeCompanyStrings($displayCompanyName)} Max Pain By Expiry
        </h2>

        <!-- Insightful overview paragraph for Max Pain By Expiry section -->
        <div class="w-full mt-4 mb-2">
          <p>
            Max pain for <strong>{ticker}</strong> shows
            {maxPainTrend === "rising"
              ? ` an upward trend from ${maxPainRange.min} to ${maxPainRange.max}, suggesting bullish positioning in longer-dated options`
              : maxPainTrend === "falling"
                ? ` a downward trend from ${maxPainRange.max} to ${maxPainRange.min}, indicating bearish sentiment or hedging activity`
                : ` stable levels around ${averageMaxPain.toFixed(2)}, reflecting balanced market expectations`}.
            The {(
              ((maxPainRange.max - maxPainRange.min) / averageMaxPain) *
              100
            ).toFixed(0)}% spread
            {Math.abs(maxPainRange.max - maxPainRange.min) / averageMaxPain >
            0.1
              ? " signals divergent expectations across timeframes"
              : " suggests strong consensus on fair value"}.
            {rawData.filter((item) => item.maxPain < currentPrice).length >
            rawData.length * 0.7
              ? ` Most levels below ${currentPrice} may cap rallies.`
              : rawData.filter((item) => item.maxPain > currentPrice).length >
                  rawData.length * 0.7
                ? ` Most levels above ${currentPrice} could support dips.`
                : ` Levels distributed around ${currentPrice}.`}
            {maxPainClusters.length > 0 && maxPainClusters[0].count >= 3
              ? ` Strong magnetic level at ${maxPainClusters[0].price} (${maxPainClusters[0].count} expirations).`
              : ""}
            Weekly expirations influence price 2-3 days before expiry; monthlies
            throughout their final week.
          </p>
        </div>

        <div>
          <div class="grow mt-3">
            <div class="relative">
              <!-- Apply the blur class to the chart -->
              <div
                class="mt-5 shadow-xs sm:mt-0 sm:border sm:border-gray-300 dark:border-gray-800 rounded"
                use:highcharts={configExpiry}
              ></div>
            </div>
          </div>
        </div>

        {#if displayList?.length > 0}
          <h3 class="text-xl sm:text-2xl font-bold mt-10">Max Pain Table</h3>

          <div class="w-full overflow-x-auto">
            <table
              class="table table-sm table-compact no-scrollbar rounded-none sm:rounded w-full border border-gray-300 dark:border-gray-800 m-auto mt-4"
            >
              <thead class="text-white bg-default">
                <TableHeader {columns} {sortOrders} {sortData} />
              </thead>
              <tbody>
                {#each displayList as item, index}
                  <tr
                    class="dark:sm:hover:bg-[#245073]/10 odd:bg-[#F6F7F8] dark:odd:bg-odd"
                  >
                    <td
                      class=" text-sm sm:text-[1rem] text-start whitespace-nowrap"
                    >
                      {formatDate(item?.expiration)}
                    </td>

                    <td
                      class=" text-sm sm:text-[1rem] text-end whitespace-nowrap"
                    >
                      {item?.maxPain}
                    </td>

                    <td
                      class=" text-sm sm:text-[1rem] text-end whitespace-nowrap"
                    >
                      {item?.change ? item?.change?.toFixed(2) : "n/a"}
                      <span
                        class="ml-2 {item?.changesPercentage >= 0
                          ? "text-green-800 dark:text-[#00FC50] before:content-['+']"
                          : 'text-red-800 dark:text-[#FF2F1F]'}"
                      >
                        ({item?.changesPercentage
                          ? item?.changesPercentage?.toFixed(2) + "%"
                          : "n/a"})</span
                      >
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    </div>
  </div>
</section>
