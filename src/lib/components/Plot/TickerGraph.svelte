<script lang="ts">
  import { abbreviateNumber } from "$lib/utils";
  import { mode } from "mode-watcher";
  import * as DropdownMenu from "$lib/components/shadcn/dropdown-menu/index.js";
  import { Button } from "$lib/components/shadcn/button/index.js";
  import { screenWidth, getCache, setCache } from "$lib/store";
  import highcharts from "$lib/highcharts.ts";
  import { onMount } from "svelte";

  export let tickerList = [];

  let downloadWorker: Worker | undefined;

  let selectedPlotPeriod = "1D";
  let config = null;
  let isLoaded = false;
  let rawGraphData = {};
  let stockQuotes = {};
  let priceData = {};
  let historicalData = {};

  async function fetchStockQuote(ticker) {
    try {
      const response = await fetch("/api/stock-quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticker }),
      });
      return await response.json();
    } catch (error) {
      console.error(`Error fetching quote for ${ticker}:`, error);
      return null;
    }
  }

  async function fetchOneDayPrice(ticker) {
    const cachedData = getCache(ticker, "oneDayPrice");
    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await fetch("/api/one-day-price", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticker }),
      });
      const data = await response.json();
      setCache(ticker, "oneDayPrice", data);
      return data;
    } catch (error) {
      console.error(`Error fetching one day price for ${ticker}:`, error);
      return [];
    }
  }

  async function fetchHistoricalPrice(ticker, timePeriod) {
    const cacheKey = `historicalPrice-${timePeriod}`;
    const cachedData = getCache(ticker, cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await fetch("/api/historical-price", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticker, timePeriod }),
      });
      const data = await response.json();
      setCache(ticker, cacheKey, data);
      return data;
    } catch (error) {
      console.error(`Error fetching ${timePeriod} price for ${ticker}:`, error);
      return [];
    }
  }

  async function loadInitialData() {
    if (!tickerList || tickerList.length === 0) return;

    isLoaded = false;

    // Fetch stock quotes and one-day prices for all tickers in parallel
    const promises = tickerList.map(async (ticker) => {
      const [quote, oneDayData] = await Promise.all([
        fetchStockQuote(ticker),
        fetchOneDayPrice(ticker),
      ]);

      stockQuotes[ticker] = quote;
      priceData[ticker] = {
        "1D": oneDayData,
        "1W": [],
        "1M": [],
        "6M": [],
        YTD: [],
        "1Y": [],
        "5Y": [],
        MAX: [],
      };
    });

    await Promise.all(promises);

    // Generate initial plot data
    updatePlotData();
    isLoaded = true;
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

  async function changePlotPeriod(timePeriod) {
    isLoaded = false;
    selectedPlotPeriod = timePeriod;

    // Map period to API format
    const periodMapping = {
      "1D": null, // Already loaded
      "5D": "five-days",
      "1M": "one-month",
      "6M": "six-months",
      YTD: "ytd",
      "1Y": "one-year",
      "5Y": "five-years",
      MAX: "max",
    };

    // Fetch historical data if not 1D and not already loaded
    if (timePeriod !== "1D") {
      const apiPeriod = periodMapping[timePeriod];
      if (apiPeriod) {
        const promises = tickerList.map(async (ticker) => {
          if (
            !priceData[ticker][timePeriod] ||
            priceData[ticker][timePeriod].length === 0
          ) {
            const data = await fetchHistoricalPrice(ticker, apiPeriod);
            priceData[ticker][timePeriod] = data;
          }
        });
        await Promise.all(promises);
      }
    }

    updatePlotData();
    isLoaded = true;
  }

  function updatePlotData() {
    // Transform priceData to the format expected by plotData
    rawGraphData = {};

    tickerList.forEach((ticker) => {
      const data = priceData[ticker]?.[selectedPlotPeriod] || [];
      rawGraphData[ticker] = {
        history: data.map((item) => ({
          date: item.time || item.date,
          value: item.close || item.value,
        })),
      };
    });

    config = plotData() || null;
  }

  function filterDataByTimePeriod(history) {
    // Since we're fetching the correct period data from API,
    // we don't need to filter it client-side
    return history;
  }

  onMount(() => {
    loadInitialData();
  });

  $: if (tickerList && tickerList.length > 0) {
    loadInitialData();
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
        shared: true,
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
          // Format the date based on the selected period
          const date = new Date(this?.x);
          let formattedDate;

          if (selectedPlotPeriod === "1D" || selectedPlotPeriod === "5D") {
            formattedDate = date?.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "UTC",
            });
          } else {
            formattedDate = date?.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            });
          }

          let tooltipContent = `<span class="m-auto text-[1rem] font-[501] ">${formattedDate}</span><br>`;

          // If shared, this.points is an array
          if (this.points) {
            this.points.forEach((point) => {
              const formattedValue = `$${point.y?.toFixed(2)}`;

              tooltipContent += `
        <span style="display:inline-block; width:10px; height:10px; background-color:${point.color}; border-radius:5%; margin-right:3px;"></span>
        <span class="font-semibold text-xs">${point.series.name}:</span> 
        <span class="font-normal text-sm">${formattedValue}</span><br>`;
            });
          } else {
            // Non-shared, handle single point
            const formattedValue = `$${this.y?.toFixed(2)}`;

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
            return `$${this.value?.toFixed(2)}`;
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
      {#if tickerList?.length > 0 && Object.keys(stockQuotes).length > 0}
        <div class="mt-6 space-y-4">
          {#each tickerList as ticker, index}
            {@const quote = stockQuotes[ticker]}
            {#if quote}
              <div
                class="bg-gray-100 dark:bg-primary/60 border border-gray-300 dark:border-gray-800 rounded p-4"
              >
                <div class="flex items-center justify-between mb-3">
                  <h3 class="font-semibold text-lg">{ticker}</h3>
                  <div class="flex items-center gap-2">
                    <span class="text-2xl font-bold">
                      ${quote?.price?.toFixed(2) || "--"}
                    </span>
                    <span
                      class="text-sm {quote?.changesPercentage >= 0
                        ? 'text-green-500'
                        : 'text-red-500'}"
                    >
                      {quote?.changesPercentage >= 0
                        ? "+"
                        : ""}{quote?.changesPercentage?.toFixed(2) || 0}%
                    </span>
                  </div>
                </div>

                <div
                  class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm"
                >
                  <div>
                    <div class="text-gray-500 dark:text-gray-400">
                      Prev Close
                    </div>
                    <div class="font-medium text-gray-900 dark:text-white">
                      ${quote?.previousClose?.toFixed(2) || "--"}
                    </div>
                  </div>

                  <div>
                    <div class="text-gray-500 dark:text-gray-400">Open</div>
                    <div class="font-medium text-gray-900 dark:text-white">
                      ${quote?.open?.toFixed(2) || "--"}
                    </div>
                  </div>

                  <div>
                    <div class="text-gray-500 dark:text-gray-400">
                      Day Range
                    </div>
                    <div class="font-medium text-gray-900 dark:text-white">
                      ${quote?.dayLow?.toFixed(2) || "--"} - ${quote?.dayHigh?.toFixed(
                        2,
                      ) || "--"}
                    </div>
                  </div>

                  <div>
                    <div class="text-gray-500 dark:text-gray-400">
                      52W Range
                    </div>
                    <div class="font-medium text-gray-900 dark:text-white">
                      ${quote?.yearLow?.toFixed(2) || "--"} - ${quote?.yearHigh?.toFixed(
                        2,
                      ) || "--"}
                    </div>
                  </div>

                  <div>
                    <div class="text-gray-500 dark:text-gray-400">Volume</div>
                    <div class="font-medium text-gray-900 dark:text-white">
                      {abbreviateNumber(quote?.volume) || "--"}
                    </div>
                  </div>

                  <div>
                    <div class="text-gray-500 dark:text-gray-400">
                      Avg Volume
                    </div>
                    <div class="font-medium text-gray-900 dark:text-white">
                      {abbreviateNumber(quote?.avgVolume) || "--"}
                    </div>
                  </div>

                  <div>
                    <div class="text-gray-500 dark:text-gray-400">
                      P/E Ratio
                    </div>
                    <div class="font-medium text-gray-900 dark:text-white">
                      {quote?.pe?.toFixed(2) || "--"}
                    </div>
                  </div>

                  <div>
                    <div class="text-gray-500 dark:text-gray-400">
                      Market Cap
                    </div>
                    <div class="font-medium text-gray-900 dark:text-white">
                      {abbreviateNumber(quote?.marketCap) || "--"}
                    </div>
                  </div>

                  <div>
                    <div class="text-gray-500 dark:text-gray-400">EPS</div>
                    <div class="font-medium text-gray-900 dark:text-white">
                      ${quote?.eps?.toFixed(2) || "--"}
                    </div>
                  </div>

                  <div>
                    <div class="text-gray-500 dark:text-gray-400">Beta</div>
                    <div class="font-medium text-gray-900 dark:text-white">
                      {quote?.beta?.toFixed(2) || "--"}
                    </div>
                  </div>

                  <div>
                    <div class="text-gray-500 dark:text-gray-400">Exchange</div>
                    <div class="font-medium text-gray-900 dark:text-white">
                      {quote?.exchange || "--"}
                    </div>
                  </div>
                </div>
              </div>
            {/if}
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
