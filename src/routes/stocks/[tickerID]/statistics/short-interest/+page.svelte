<script lang="ts">
  import { displayCompanyName, stockTicker } from "$lib/store";
  import { abbreviateNumber, removeCompanyStrings } from "$lib/utils";
  import SEO from "$lib/components/SEO.svelte";
  import Infobox from "$lib/components/Infobox.svelte";
  import Tutorial from "$lib/components/Tutorial.svelte";
  import { Button } from "$lib/components/shadcn/button/index.js";
  import TableHeader from "$lib/components/Table/TableHeader.svelte";
  import { onMount } from "svelte";
  import DownloadData from "$lib/components/DownloadData.svelte";

  //import * as XLSX from 'xlsx';
  import { goto } from "$app/navigation";
  import highcharts from "$lib/highcharts.ts";
  import { mode } from "mode-watcher";

  export let data;

  let rawData = data?.getData?.history || [];
  let tableList = rawData;
  tableList
    ?.sort((a, b) => new Date(b?.recordDate) - new Date(a?.recordDate))
    ?.slice(0, 20);

  async function handleScroll() {
    const scrollThreshold = document.body.offsetHeight * 0.8; // 80% of the website height
    const isBottom = window.innerHeight + window.scrollY >= scrollThreshold;
    if (isBottom && tableList?.length !== rawData?.history?.length) {
      const nextIndex = tableList?.length;
      const newResults = rawData?.slice(nextIndex, nextIndex + 20);
      tableList = [...tableList, ...newResults];
    }
  }

  let steps = [
    {
      popover: {
        title: "Short Interest",
        description:
          "This dashboard tracks how many shares are sold short and key ratios that traders use to spot bearish sentiment and potential squeezes.",
        side: "center",
        align: "center",
      },
    },
    {
      element: ".short-interest-driver",
      popover: {
        title: "Total Short Interest",
        description: `The total number of shares currently sold short (${abbreviateNumber(data?.getData?.sharesShort)} here). A rising number can indicate growing bearish bets.`,
        side: "left",
        align: "start",
      },
    },
    {
      element: ".shortPriorMonth-driver",
      popover: {
        title: "Last Month’s Shorts",
        description: (() => {
          const priorShorts = abbreviateNumber(
            data?.getData?.sharesShortPriorMonth,
          );
          const change = tableList?.at(0)?.percentChangeMoMo;
          const momentumDirection =
            change >= 0 ? "momentum—up" : "momentum—down";

          let jumpSize = "a small jump";
          const absChange = Math.abs(change);

          if (absChange >= 20) {
            jumpSize = "a big jump";
          } else if (absChange >= 10) {
            jumpSize = "a medium jump";
          }

          return `Compare to last month’s short interest (${priorShorts}) to see ${momentumDirection}. ${Math.abs(change)}% MoM means ${jumpSize} in bearish positioning.`;
        })(),
        side: "bottom",
        align: "start",
      },
    },
    {
      element: ".changeMoM-driver",
      popover: {
        title: "Month‑over‑Month Change",
        description: `"Shows the % change from last month (${tableList?.at(0)?.percentChangeMoMo}%). Large swings can precede volatility or squeeze setups.`,
        side: "bottom",
        align: "start",
      },
    },
    {
      element: ".shortPercentFloat-driver",
      popover: {
        title: "Short % of Float",
        description: `${data?.getData?.shortFloatPercent}% tells you what portion of the freely tradable shares are sold short. The higher it is, the more crowded the short side.`,
        side: "left",
        align: "start",
      },
    },
    {
      element: ".shortPercentOutstanding-driver",
      popover: {
        title: "Short % of Outstanding",
        description: `${data?.getData?.shortOutstandingPercent}% shows shorts relative to all shares out there. Use alongside % float to understand supply dynamics.`,
        side: "left",
        align: "start",
      },
    },
    {
      element: ".daysToCover-driver",
      popover: {
        title: "Days to Cover",
        description: `${data?.getData?.shortRatio} days — how long it’d take shorts to buy back at average daily volume. Low values can fuel quick squeezes.`,
        side: "right",
        align: "start",
      },
    },
    {
      element: ".chart-driver",
      popover: {
        title: "Visualizing Trends",
        description:
          "This chart overlays price, % float, and % outstanding over time so you can spot divergences or spikes.",
        side: "right",
        align: "start",
      },
    },
    {
      element: ".history-driver",
      popover: {
        title: "Detailed History",
        description:
          "Scroll through past filings to see how metrics evolved—handy. You can also download the data for backtesting your entry and exit rules.",
        side: "right",
        align: "start",
      },
    },
    {
      popover: {
        title: "You’re All Set!",
        description:
          "Now you know how to read each short‑interest metric and apply it to your trading strategies. Happy investing!",
        side: "center",
        align: "center",
      },
    },
  ];

  function plotData() {
    if (!rawData || rawData.length === 0) {
      return {};
    }

    // Prepare series data in one pass
    const priceSeries = [];
    const shortFloatSeries = [];
    const shortOutSeries = [];
    rawData.forEach(
      ({ recordDate, price, shortPercentOfFloat, shortPercentOfOut }) => {
        const time = new Date(recordDate).getTime();
        priceSeries.push([time, price]);
        shortFloatSeries.push([time, shortPercentOfFloat]);
        shortOutSeries.push([time, shortPercentOfOut]);
      },
    );

    const fillColorStart = "rgba(70, 129, 244, 0.5)";
    const fillColorEnd = "rgba(70, 129, 244, 0.001)";

    const options = {
      credits: { enabled: false },
      chart: {
        backgroundColor: $mode === "light" ? "#fff" : "#09090B",
        plotBackgroundColor: $mode === "light" ? "#fff" : "#09090B",
        height: 360,
      },
      title: {
        text: `<h3 class=\"mt-3 mb-1\">${removeCompanyStrings($displayCompanyName)} Short Interest</h3>`,
        useHTML: true,
        style: { color: $mode === "light" ? "black" : "white" },
      },
      xAxis: {
        type: "datetime",
        endOnTick: false,
        crosshair: {
          color: $mode === "light" ? "black" : "white",
          width: 1,
          dashStyle: "Solid",
        },
        labels: {
          style: { color: $mode === "light" ? "#545454" : "white" },
          distance: 10,
          formatter() {
            return new Date(this.value).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
              timeZone: "Europe/Berlin",
            });
          },
        },
        tickPositioner() {
          const positions = [];
          const { min, max } = this.getExtremes();
          const tickCount = 5;
          const interval = Math.floor((max - min) / tickCount);
          for (let i = 0; i <= tickCount; i++) {
            positions.push(min + i * interval);
          }
          return positions;
        },
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
        {
          gridLineWidth: 0,
          labels: { enabled: false },
          title: { text: null },
        },
      ],
      tooltip: {
        shared: true,
        useHTML: true,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderColor: "rgba(255, 255, 255, 0.2)",
        borderWidth: 1,
        style: { color: "#fff", fontSize: "16px", padding: "10px" },
        borderRadius: 4,
        formatter() {
          // Display date in Europe/Berlin timezone
          const dateStr = new Date(this.x).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            timeZone: "Europe/Berlin",
          });
          let html = `<span class=\"m-auto text-[1rem] font-[501]\">${dateStr}</span><br/>`;

          // Loop through each point and add colored bullet
          this.points.forEach((point) => {
            html += `
            <span style=\"display:inline-block; width:10px; height:10px; background-color:${point.color}; border-radius:50%; margin-right:5px; vertical-align:middle;\"></span>
            <span class=\"font-semibold text-sm\">${point.series.name}:</span>
            <span class=\"font-normal text-sm\">${abbreviateNumber(point.y)}${point.series.name.includes("%") ? "%" : ""}</span><br/>`;
          });

          return html;
        },
      },
      plotOptions: {
        series: {
          animation: false,
          legendSymbol: "rectangle",
          states: { hover: { enabled: false } },
        },
      },
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
      series: [
        {
          name: "Price",
          type: "area",
          data: priceSeries,
          yAxis: 0,
          color: "#4681f4",
          lineWidth: 1.3,
          marker: { enabled: false },
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, fillColorStart],
              [1, fillColorEnd],
            ],
          },
        },
        {
          name: "Short % Float",
          type: "spline",
          data: shortFloatSeries,
          yAxis: 1,
          color: $mode === "light" ? "#d32f2f" : "#ff6e6e",
          lineWidth: 1.3,
          marker: { enabled: false },
        },
        {
          name: "Short % Outstanding",
          type: "spline",
          data: shortOutSeries,
          yAxis: 2,
          color: $mode === "light" ? "purple" : "#ffc947",
          lineWidth: 1.3,
          marker: { enabled: false },
        },
      ],
    };

    return options;
  }

  let config = null;

  let columns = [
    { key: "recordDate", label: "Date", align: "left" },
    { key: "totalShortInterest", label: "Short Interest", align: "right" },
    { key: "shortPriorMo", label: "Short Prior Month", align: "right" },
    { key: "percentChangeMoMo", label: "% Change", align: "right" },
    { key: "daysToCover", label: "Day to Cover", align: "right" },
    { key: "shortPercentOfFloat", label: "Short % Float", align: "right" },
    { key: "shortPercentOfOut", label: "Short % Out", align: "right" },
  ];

  let sortOrders = {
    recordDate: { order: "none", type: "date" },
    totalShortInterest: { order: "none", type: "number" },
    shortPriorMo: { order: "none", type: "number" },
    percentChangeMoMo: { order: "none", type: "number" },
    daysToCover: { order: "none", type: "number" },
    shortPercentOfFloat: { order: "none", type: "number" },
    shortPercentOfOut: { order: "none", type: "number" },
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

    let originalData = rawData?.sort(
      (a, b) => new Date(b?.date) - new Date(a?.date),
    );

    const currentOrderIndex = orderCycle.indexOf(sortOrders[key].order);
    sortOrders[key].order =
      orderCycle[(currentOrderIndex + 1) % orderCycle.length];
    const sortOrder = sortOrders[key].order;

    // Reset to original data when 'none' and stop further sorting
    if (sortOrder === "none") {
      tableList = [...originalData]?.slice(0, 20); // Reset to original data (spread to avoid mutation)
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
    tableList = [...originalData]?.sort(compareValues)?.slice(0, 20);
  };

  onMount(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  });

  $: {
    if ($mode) {
      config = plotData();
    }
  }
</script>

<SEO
  title={`${$displayCompanyName} (${$stockTicker}) Short Interest – Historical & Latest Data`}
  description={`
    View ${$displayCompanyName}'s short interest trends: 
    historical short interest levels, days to cover, short % of float & outstanding, 
    and month‑over‑month changes. Get the full dataset and insights.
  `}
/>

<section class=" w-full overflow-hidden h-full">
  <div class="w-full flex justify-center w-full sm-auto h-full overflow-hidden">
    <div
      class="w-full relative flex justify-center items-center overflow-hidden"
    >
      <main class="w-full">
        <div class="sm:pl-7 sm:pb-7 sm:pt-7 m-auto mt-2 sm:mt-0">
          <div class="w-full flex flex-col sm:flex-row justify-between">
            <h1 class="text-xl sm:text-2xl font-bold">
              {removeCompanyStrings($displayCompanyName)} Short Interest
            </h1>

            <Tutorial {steps} />
          </div>

          {#if rawData?.length !== 0}
            <div class="grid grid-cols-1 gap-2">
              <Infobox
                text={`${removeCompanyStrings($displayCompanyName)} has a total short interest of ${abbreviateNumber(
                  data?.getData?.sharesShort,
                )}. Its short interest has ${
                  rawData?.at(0)?.percentChangeMoMo > 0
                    ? "increased"
                    : rawData?.at(0)?.percentChangeMoMo < 0
                      ? "decreased"
                      : "unchanged"
                } by ${abbreviateNumber(
                  rawData?.at(0)?.percentChangeMoMo?.toFixed(2),
                )}% to the previous Month.`}
              />

              <div
                class="my-5 grid grid-cols-2 gap-3 xs:mt-6 bp:mt-7 sm:grid-cols-3 sm:gap-6"
              >
                <div class="short-interest-driver">
                  Short Interest
                  <div
                    class="mt-0.5 text-lg bp:text-xl sm:mt-1.5 sm:text-2xl font-semibold"
                  >
                    {abbreviateNumber(data?.getData?.sharesShort)}
                  </div>
                </div>
                <div class="shortPriorMonth-driver">
                  Short Prior Month <div
                    class="mt-0.5 text-lg bp:text-xl sm:mt-1.5 sm:text-2xl font-semibold"
                  >
                    {abbreviateNumber(data?.getData?.sharesShortPriorMonth)}
                  </div>
                </div>
                <div class="changeMoM-driver">
                  % Change MoM <div
                    class="mt-0.5 text-lg {rawData?.at(0)?.percentChangeMoMo > 0
                      ? "before:content-['+'] "
                      : ''} font-semibold bp:text-xl sm:mt-1.5 sm:text-2xl"
                  >
                    {rawData?.at(0)?.percentChangeMoMo
                      ? rawData?.at(0)?.percentChangeMoMo + "%"
                      : "n/a"}
                  </div>
                </div>
                <div class="shortPercentFloat-driver">
                  Short % Floating
                  <div
                    class="mt-0.5 text-lg bp:text-xl sm:mt-1.5 sm:text-2xl font-semibold"
                  >
                    {data?.getData?.shortFloatPercent
                      ? data?.getData?.shortFloatPercent + "%"
                      : "n/a"}
                  </div>
                </div>
                <div class="shortPercentOutstanding-driver">
                  Short % Outstanding
                  <div
                    class="mt-0.5 text-lg bp:text-xl sm:mt-1.5 sm:text-2xl font-semibold"
                  >
                    {data?.getData?.shortOutstandingPercent
                      ? data?.getData?.shortOutstandingPercent + "%"
                      : "n/a"}
                  </div>
                </div>
                <div class="daysToCover-driver">
                  Days to Cover
                  <div
                    class="mt-0.5 text-lg bp:text-xl sm:mt-1.5 sm:text-2xl font-semibold"
                  >
                    {data?.getData?.shortRatio}
                  </div>
                </div>
              </div>

              <div
                class="flex flex-col sm:flex-row items-start sm:items-center w-full"
              >
                <h2 class="text-xl sm:text-2xl font-bold">
                  Short Interest Chart
                </h2>
              </div>

              <div class="chart-driver">
                <div class="grow">
                  <div class="relative">
                    <!-- Apply the blur class to the chart -->
                    <div
                      class="{!['Plus', 'Pro']?.includes(data?.user?.tier)
                        ? 'blur-[3px]'
                        : ''}   border border-gray-300 dark:border-gray-800 rounded"
                      use:highcharts={config}
                    ></div>
                    <!-- Overlay with "Upgrade to Pro" -->
                    {#if !["Plus", "Pro"]?.includes(data?.user?.tier)}
                      <div
                        class="font-bold text-lg sm:text-xl absolute top-0 bottom-0 left-0 right-0 flex items-center justify-center text-muted dark:text-white"
                      >
                        <a
                          href="/pricing"
                          class="sm:hover:text-blue-800 dark:sm:hover:text-white dark:text-white flex flex-row items-center"
                        >
                          <span>Upgrade to Pro</span>
                          <svg
                            class="ml-1 w-5 h-5 sm:w-6 sm:h-6 inline-block"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            ><path
                              fill="currentColor"
                              d="M17 9V7c0-2.8-2.2-5-5-5S7 4.2 7 7v2c-1.7 0-3 1.3-3 3v7c0 1.7 1.3 3 3 3h10c1.7 0 3-1.3 3-3v-7c0-1.7-1.3-3-3-3M9 7c0-1.7 1.3-3 3-3s3 1.3 3 3v2H9z"
                            /></svg
                          >
                        </a>
                      </div>
                    {/if}
                  </div>
                </div>
              </div>

              <div
                class="flex flex-row items-center w-full justify-between mt-3"
              >
                <h3 class=" history-driver text-xl sm:text-2xl font-bold">
                  Short Interest History
                </h3>

                <div class="flex flex-row items-center w-fit w-[50%] ml-auto">
                  <DownloadData
                    {data}
                    {rawData}
                    title={`short_interest_${$stockTicker}`}
                  />
                </div>
              </div>

              <div class="w-full overflow-x-auto">
                <table
                  class="table table-sm table-compact no-scrollbar rounded-none sm:rounded w-full border border-gray-300 dark:border-gray-800 m-auto mt-2"
                >
                  <thead>
                    <TableHeader {columns} {sortOrders} {sortData} />
                  </thead>
                  <tbody>
                    {#each tableList as item}
                      <!-- row -->
                      <tr
                        class="dark:sm:hover:bg-[#245073]/10 odd:bg-[#F6F7F8] dark:odd:bg-odd"
                      >
                        <td class=" text-sm sm:text-[1rem] whitespace-nowrap">
                          {new Date(item?.recordDate)?.toLocaleDateString(
                            "en-US",
                            {
                              day: "2-digit", // Include day number
                              month: "short", // Display short month name
                              year: "numeric", // Include year
                              timeZone: "UTC",
                            },
                          )}
                        </td>

                        <td
                          class=" text-sm sm:text-[1rem] text-right whitespace-nowrap"
                        >
                          {abbreviateNumber(item?.totalShortInterest)}
                        </td>
                        <td
                          class=" text-sm sm:text-[1rem] text-right whitespace-nowrap"
                        >
                          {abbreviateNumber(item?.shortPriorMo)}
                        </td>
                        <td
                          class=" text-sm sm:text-[1rem] whitespace-nowrap text-end"
                        >
                          <span
                            class={item?.percentChangeMoMo &&
                            item?.percentChangeMoMo >= 0
                              ? "before:content-['+'] text-green-800 dark:text-[#00FC50]"
                              : "text-red-800 dark:text-[#FF2F1F]"}
                          >
                            {item?.percentChangeMoMo
                              ? item?.percentChangeMoMo + "%"
                              : "n/a"}
                          </span>
                        </td>
                        <td
                          class=" text-sm sm:text-[1rem] text-right whitespace-nowrap"
                        >
                          {abbreviateNumber(item?.daysToCover)}
                        </td>
                        <td
                          class=" text-sm sm:text-[1rem] text-right whitespace-nowrap"
                        >
                          {item?.shortPercentOfFloat
                            ? item?.shortPercentOfFloat + "%"
                            : "n/a"}
                        </td>
                        <td
                          class=" text-sm sm:text-[1rem] text-right whitespace-nowrap"
                        >
                          {item?.shortPercentOfOut
                            ? item?.shortPercentOfOut + "%"
                            : "n/a"}
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          {:else}
            <Infobox text="No data available" />
          {/if}
        </div>
      </main>
    </div>
  </div>
</section>
