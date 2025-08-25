<script lang="ts">
  import { abbreviateNumber } from "$lib/utils";
  import { mode } from "mode-watcher";
  import * as DropdownMenu from "$lib/components/shadcn/dropdown-menu/index.js";
  import { Button } from "$lib/components/shadcn/button/index.js";
  import { screenWidth } from "$lib/store";
  import highcharts from "$lib/highcharts.ts";

  export let tickerList = [];

  let downloadWorker: Worker | undefined;

  let selectedPlotPeriod = "1D";
  let config = null;
  let isLoaded = false;
  let rawGraphData = {};

  async function getPlotData(tickerList) {
    const response = await fetch("/api/chat-plot-data", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const output = await response.json();
  }

  const colorPairs = [
    { light: "#1E90FF", dark: "#60A5FA" }, // DodgerBlue → SkyBlue
    { light: "#9400D3", dark: "#7C3AED" }, // DarkViolet → Violet
    { light: "#006400", dark: "#22C55E" }, // DarkGreen → Emerald
    { light: "#DC143C", dark: "#F43F5E" }, // Crimson → Rose
    { light: "#4682B4", dark: "#60A5FA" }, // SteelBlue → SkyBlue
    { light: "#FFFF00", dark: "#FACC15" }, // Yellow → Amber
    { light: "#A9A9A9", dark: "#D1D5DB" }, // DarkGray → Gray-300
    { light: "#000000", dark: "#F9FAFB" }, // Black → Gray-50
    { light: "#FF8C00", dark: "#FDBA74" }, // DarkOrange → Orange-300
    { light: "#20B2AA", dark: "#2DD4BF" }, // LightSeaGreen → Teal-300
  ];

  function changePlotPeriod(timePeriod) {
    isLoaded = false;
    selectedPlotPeriod = timePeriod;

    // Regenerate dummy data for the new period
    rawGraphData = generateDummyData();
    config = plotData() || null;
    isLoaded = true;

    downloadWorker?.postMessage({
      tickerList: tickerList,
      category: selectedPlotCategory,
    });
  }

  function filterDataByTimePeriod(history) {
    const now = new Date();

    let thresholdDate;

    switch (selectedPlotPeriod) {
      case "1D":
        thresholdDate = new Date(now);
        thresholdDate.setDate(now.getDate() - 1);
        break;
      case "5D":
        thresholdDate = new Date(now);
        thresholdDate.setDate(now.getDate() - 5);
        break;
      case "1M":
        thresholdDate = new Date(now);
        thresholdDate.setMonth(now.getMonth() - 1);
        break;
      case "6M":
        thresholdDate = new Date(now);
        thresholdDate.setMonth(now.getMonth() - 6);
        break;
      case "YTD":
        thresholdDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "1Y":
        thresholdDate = new Date(now);
        thresholdDate.setFullYear(now.getFullYear() - 1);
        break;
      case "5Y":
        thresholdDate = new Date(now);
        thresholdDate.setFullYear(now.getFullYear() - 5);
        break;
      default: // "MAX"
        thresholdDate = new Date(0);
    }

    return history?.filter((item) => new Date(item?.date) >= thresholdDate);
  }

  function plotData() {
    // 1) filter & parse each symbol's data into [timestamp, value] pairs
    const parsedData = {};

    for (const [symbol, data] of Object?.entries(rawGraphData)) {
      // Ensure `history` exists and is an array
      const series = Array?.isArray(data?.history) ? data?.history : [];

      // Filter by the desired time period and map to [timestamp, value] pairs
      parsedData[symbol] = filterDataByTimePeriod(series)?.map((item) => {
        const d = new Date(item?.date);
        return [
          Date.UTC(
            d.getUTCFullYear(),
            d.getUTCMonth(),
            d.getUTCDate(),
            d.getUTCHours(),
            d.getUTCMinutes(),
          ),
          item?.value,
        ];
      });
    }

    // 3) build series entries
    const series = Object?.entries(parsedData)?.map(([symbol, data], index) => {
      // wrap around if more symbols than colors
      const pair = colorPairs[index % colorPairs?.length];

      return {
        name: symbol,
        type: "spline", // or "area" if you still want fill
        data,
        color: $mode === "light" ? pair?.light : pair?.dark,
        lineWidth: 1.5,
        marker: { enabled: false },
      };
    });

    return {
      chart: {
        backgroundColor: $mode === "light" ? "#fff" : "#09090B",
        animation: false,
        height: 400,
        events: {
          render: function () {
            const chart = this;

            // 0) Destroy any stray labels when series count shrinks
            if (chart?.customLabels) {
              // if we have more labels than series, kill the extras
              const extra = chart.customLabels.length - chart.series.length;
              if (extra > 0) {
                for (
                  let j = chart.series.length;
                  j < chart.customLabels.length;
                  j++
                ) {
                  chart.customLabels[j].destroy();
                }
                // truncate the array
                chart.customLabels.length = chart.series.length;
              }
            } else {
              chart.customLabels = [];
            }

            // 1) Loop over current series and create/update their labels
            chart.series.forEach((serie, i) => {
              if (!serie.points?.length) return;

              const lastPoint = serie.points[serie.points.length - 1];
              const value = lastPoint.y;
              const xPos = chart.plotWidth + 10;
              const yPos = lastPoint.plotY + chart.plotTop - 15;

              if (!chart.customLabels[i]) {
                // new series → draw a label
                chart.customLabels[i] = chart.renderer
                  .label(value, xPos, yPos, "bubble", 0, 0, true)
                  .attr({ padding: 5, r: 4, fill: serie.color, zIndex: 10 })
                  .css({ color: "#fff", fontSize: "11px" })
                  .add();
              } else {
                // existing series → move & update text
                chart.customLabels[i]
                  .attr({ text: value, x: xPos, y: yPos })
                  .toFront();
              }
            });
          },
        },
      },
      credits: { enabled: false },
      title: {
        text: `<h3 class="mt-3 mb-1"></h3>`,
        useHTML: true,
        style: { color: $mode === "light" ? "black" : "white" },
      },
      tooltip: {
        shared: ["price", "marketCap"]?.includes(selectedPlotCategory?.value),
        useHTML: true,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderColor: "rgba(255, 255, 255, 0.2)",
        borderWidth: 1,
        style: {
          color: "#fff",
          fontSize: "16px",
          padding: "10px",
        },
        borderRadius: 4,
        formatter: function () {
          // Format the x value
          const dateStr = new Date(this?.x)?.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          });

          let tooltipContent = `<span class="m-auto text-[1rem] font-[501] ">${dateStr}</span><br>`;

          // If shared, this.points is an array
          if (this.points) {
            this.points.forEach((point) => {
              const formattedValue = point.y;

              tooltipContent += `
        <span style="display:inline-block; width:10px; height:10px; background-color:${point.color}; border-radius:5%; margin-right:3px;"></span>
        <span class="font-semibold text-xs">${point.series.name}:</span> 
        <span class="font-normal text-sm">${formattedValue}</span><br>`;
            });
          } else {
            // Non-shared, handle single point
            const formattedValue = this.y;

            tooltipContent += `
      <span style="display:inline-block; width:10px; height:10px; background-color:${this.color}; border-radius:5%; margin-right:3px;"></span>
      <span class="font-semibold text-xs">${this.series.name}:</span> 
      <span class="font-normal text-sm">${formattedValue}</span><br>`;
          }

          return tooltipContent;
        },
      },
      xAxis: {
        type: "datetime",
        tickLength: 0,
        crosshair: {
          color: $mode === "light" ? "black" : "white",
          width: 1,
          dashStyle: "Solid",
        },
        labels: {
          style: { color: $mode === "light" ? "black" : "white" },
          distance: 10,
          formatter() {
            const d = new Date(this.value);
            if (selectedPlotPeriod === "1D" || selectedPlotPeriod === "5D") {
              return `<span class="text-xs">${d.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
                timeZone: "UTC",
              })}</span>`;
            }
            return `<span class="text-xs">${d.toLocaleDateString("en-US", {
              year: "2-digit",
              month: "short",
              timeZone: "UTC",
            })}</span>`;
          },
        },
        tickPositioner() {
          const { min, max } = this.getExtremes();
          const ticks = [];
          const count =
            selectedPlotPeriod === "1D" ? 3 : $screenWidth < 640 ? 2 : 5;
          const interval = Math.floor((max - min) / count);
          for (let i = 0; i <= count; i++) {
            ticks.push(min + i * interval);
          }
          return ticks;
        },
      },
      yAxis: {
        startOnTick: true,
        endOnTick: true,
        gridLineWidth: 1,
        gridLineColor: $mode === "light" ? "#e5e7eb" : "#111827",
        title: { text: null },
        labels: {
          style: { color: $mode === "light" ? "black" : "white" },
          formatter: function () {
            return this.value;
          },
        },
        opposite: true,
      },
      plotOptions: {
        series: {
          animation: false,
          marker: { enabled: false },
          states: { hover: { enabled: false } },
          legendSymbol: "rectangle",
        },
      },
      legend: {
        enabled: false,
      },

      series,
    };
  }
</script>

{#if tickerList?.length > 0}
  <div class="w-full mb-5">
    <h2 class="text-lg sm:text-xl font-semibold mb-3 -mt-8">
      {tickerList?.join(", ")} Overview
    </h2>
    {#if config && isLoaded}
      <div
        class="w-full relative mt-2 mb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between z-10"
      >
        <div class="flex w-fit space-x-2">
          {#each ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "MAX"] as item}
            <label
              on:click={() => changePlotPeriod(item)}
              class="px-2 sm:px-3 py-1 {selectedPlotPeriod === item
                ? 'bg-gray-300 dark:bg-white text-muted'
                : 'text-muted dark:text-white bg-gray-100 dark:bg-table text-opacity-[0.6]'} text-xs border border-gray-200 dark:border-gray-700 font-semibold transition ease-out duration-100 sm:hover:bg-white sm:hover:text-black rounded-[2px] cursor-pointer"
            >
              {item}
            </label>
          {/each}
        </div>
      </div>
      <div
        class="shadow-xs border border-gray-300 dark:border-gray-800 rounded w-full h-[300px] sm:h-[400px]"
        use:highcharts={config}
      ></div>

      <!-- Stock Metric Cards -->
      {#if tickerList?.length > 0}
        <div class="mt-6 space-y-4">
          {#each tickerList as ticker, index}
            <div
              class="bg-gray-100 dark:bg-primary/60 border border-gray-300 dark:border-gray-800 rounded p-4"
            >
              <div class="flex items-center justify-start mb-3">
                <div class="text-sm">Updated 15/08/2025</div>
              </div>

              <div
                class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm"
              >
                <div>
                  <div class="text-gray-500 dark:text-gray-400">Prev Close</div>
                  <div class="font-medium text-gray-900 dark:text-white">
                    {#if ticker === "AMD"}$180.95
                    {:else if ticker === "NVDA"}$182.02
                    {:else if ticker === "INTC"}$23.86
                    {:else if ticker === "AAPL"}$232.78
                    {:else}$125.50
                    {/if}
                  </div>
                </div>

                <div>
                  <div class="text-gray-500 dark:text-gray-400">Open</div>
                  <div class="font-medium text-gray-900 dark:text-white">
                    {#if ticker === "AMD"}$180.06
                    {:else if ticker === "NVDA"}$181.88
                    {:else if ticker === "INTC"}$25.00
                    {:else if ticker === "AAPL"}$234.00
                    {:else}$126.25
                    {/if}
                  </div>
                </div>

                <div>
                  <div class="text-gray-500 dark:text-gray-400">Day Range</div>
                  <div class="font-medium text-gray-900 dark:text-white">
                    {#if ticker === "AMD"}$176.25 - $180.14
                    {:else if ticker === "NVDA"}$178.04 - $181.90
                    {:else if ticker === "INTC"}$24.11 - $25.65
                    {:else if ticker === "AAPL"}$229.34 - $234.28
                    {:else}$124.50 - $127.80
                    {/if}
                  </div>
                </div>

                <div>
                  <div class="text-gray-500 dark:text-gray-400">52W Range</div>
                  <div class="font-medium text-gray-900 dark:text-white">
                    {#if ticker === "AMD"}$76.48 - $186.65
                    {:else if ticker === "NVDA"}$86.62 - $184.48
                    {:else if ticker === "INTC"}$17.67 - $27.55
                    {:else if ticker === "AAPL"}$169.21 - $260.10
                    {:else}$85.20 - $155.40
                    {/if}
                  </div>
                </div>

                <div>
                  <div class="text-gray-500 dark:text-gray-400">Volume</div>
                  <div class="font-medium text-gray-900 dark:text-white">
                    {#if ticker === "AMD"}51M
                    {:else if ticker === "NVDA"}150M
                    {:else if ticker === "INTC"}307M
                    {:else if ticker === "AAPL"}55M
                    {:else}25M
                    {/if}
                  </div>
                </div>

                <div>
                  <div class="text-gray-500 dark:text-gray-400">P/E Ratio</div>
                  <div class="font-medium text-gray-900 dark:text-white">
                    {#if ticker === "AMD"}106.93
                    {:else if ticker === "NVDA"}58.40
                    {:else if ticker === "INTC"}-5.15
                    {:else if ticker === "AAPL"}31.90
                    {:else}24.50
                    {/if}
                  </div>
                </div>

                <div>
                  <div class="text-gray-500 dark:text-gray-400">Market Cap</div>
                  <div class="font-medium text-gray-900 dark:text-white">
                    {#if ticker === "AMD"}$288.07B
                    {:else if ticker === "NVDA"}$4.4T
                    {:else if ticker === "INTC"}$107.5B
                    {:else if ticker === "AAPL"}$3.44T
                    {:else}$150.2B
                    {/if}
                  </div>
                </div>

                <div>
                  <div class="text-gray-500 dark:text-gray-400">
                    Dividend Yield
                  </div>
                  <div class="font-medium text-gray-900 dark:text-white">
                    {#if ticker === "AMD"}—
                    {:else if ticker === "NVDA"}0.0222%
                    {:else if ticker === "INTC"}—
                    {:else if ticker === "AAPL"}0.44%
                    {:else}1.25%
                    {/if}
                  </div>
                </div>

                <div>
                  <div class="text-gray-500 dark:text-gray-400">EPS</div>
                  <div class="font-medium text-gray-900 dark:text-white">
                    {#if ticker === "AMD"}$1.66
                    {:else if ticker === "NVDA"}$3.09
                    {:else if ticker === "INTC"}-$4.77
                    {:else if ticker === "AAPL"}$7.26
                    {:else}$5.15
                    {/if}
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {:else}
      <div
        class="mt-2 flex justify-center items-center h-96 border border-gray-300 dark:border-gray-800 rounded"
      >
        <div class="relative">
          <label
            class="shadow-xs bg-default dark:bg-secondary rounded h-14 w-14 flex justify-center items-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          >
            <span
              class="loading loading-spinner loading-md text-white dark:text-white"
            ></span>
          </label>
        </div>
      </div>
    {/if}
  </div>
{/if}
