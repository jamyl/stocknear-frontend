<script lang="ts">
  import { abbreviateNumber, removeCompanyStrings } from "$lib/utils";
  import { mode } from "mode-watcher";
  import * as DropdownMenu from "$lib/components/shadcn/dropdown-menu/index.js";
  import { Button } from "$lib/components/shadcn/button/index.js";
  import { screenWidth, getCache, setCache } from "$lib/store";
  import highcharts from "$lib/highcharts.ts";
  import { onMount } from "svelte";

  export let tickerList = [];

  let selectedPlotPeriod = "1D";
  let config = null;
  let isLoaded = false;
  let rawGraphData = {};
  let stockQuotes = {};
  let priceData = {};
  let historicalData = {};

  async function fetchPlotData(tickerList, timePeriod = "one-day") {
    // Create cache key based on tickers and time period
    const cacheKey = `plotData-${tickerList.join(",")}-${timePeriod}`;

    // Check cache first
    const cachedData = getCache(cacheKey, "tickerGraph");
    if (cachedData) {
      console.log("Using cached plot data for:", tickerList, timePeriod);
      return cachedData;
    }

    try {
      const response = await fetch("/api/chat-plot-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tickerList, timePeriod }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Cache the response for 5 minutes
      setCache(cacheKey, "tickerGraph", data);
      console.log("Cached plot data for:", tickerList, timePeriod);

      return data;
    } catch (error) {
      console.error(`Error fetching plot data:`, error);
      return [];
    }
  }

  async function loadInitialData() {
    if (!tickerList || tickerList.length === 0) return;

    isLoaded = false;

    // Check if we have cached data for all tickers for 1D
    const allTickersCached = tickerList.every((ticker) => {
      const quoteCacheKey = `quote-${ticker}`;
      const priceCacheKey = `plotData-${ticker}-one-day`;
      return (
        getCache(quoteCacheKey, "stockQuote") &&
        getCache(priceCacheKey, "tickerGraph")
      );
    });

    if (allTickersCached) {
      // Use cached data
      tickerList.forEach((ticker) => {
        const quoteCacheKey = `quote-${ticker}`;
        const priceCacheKey = `plotData-${ticker}-one-day`;

        stockQuotes[ticker] = getCache(quoteCacheKey, "stockQuote");

        priceData[ticker] = {
          "1D": getCache(priceCacheKey, "tickerGraph") || [],
          "5D": [],
          "1M": [],
          "6M": [],
          YTD: [],
          "1Y": [],
          "5Y": [],
          MAX: [],
        };
      });

      updatePlotData();
      isLoaded = true;
      return;
    }

    // Fetch all data from the single endpoint
    const results = await fetchPlotData(tickerList, "one-day");

    if (results && results.length > 0) {
      // Process results and populate our data structures
      results.forEach((result) => {
        const { ticker, quote, priceData: prices } = result;

        // Store quote data and cache it individually
        stockQuotes[ticker] = quote;
        setCache(`quote-${ticker}`, "stockQuote", quote);

        // Cache price data individually
        setCache(`plotData-${ticker}-one-day`, "tickerGraph", prices || []);

        // Initialize price data structure
        priceData[ticker] = {
          "1D": prices || [],
          "5D": [],
          "1M": [],
          "6M": [],
          YTD: [],
          "1Y": [],
          "5Y": [],
          MAX: [],
        };
      });

      // Update plot with initial data
      updatePlotData();
    }

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
      "1D": "one-day",
      "5D": "five-days",
      "1M": "one-month",
      "6M": "six-months",
      YTD: "ytd",
      "1Y": "one-year",
      "5Y": "five-years",
      MAX: "max",
    };

    // Check cache first for all tickers for this time period
    const apiPeriod = periodMapping[timePeriod];
    const allTickersCachedForPeriod = tickerList.every((ticker) => {
      const cacheKey = `plotData-${ticker}-${apiPeriod}`;
      return getCache(cacheKey, "tickerGraph");
    });

    if (allTickersCachedForPeriod) {
      // Use cached data
      tickerList.forEach((ticker) => {
        const cacheKey = `plotData-${ticker}-${apiPeriod}`;
        const cachedPriceData = getCache(cacheKey, "tickerGraph");

        if (priceData[ticker]) {
          priceData[ticker][timePeriod] = cachedPriceData || [];
        }
      });

      updatePlotData();
      isLoaded = true;
      return;
    }

    // Check if we need to fetch new data
    const needsFetch = tickerList.some(
      (ticker) =>
        !priceData[ticker] ||
        !priceData[ticker][timePeriod] ||
        priceData[ticker][timePeriod].length === 0,
    );

    if (needsFetch && apiPeriod) {
      const results = await fetchPlotData(tickerList, apiPeriod);

      if (results && results.length > 0) {
        results.forEach((result) => {
          const { ticker, priceData: prices } = result;

          // Cache the price data for this ticker and period
          setCache(
            `plotData-${ticker}-${apiPeriod}`,
            "tickerGraph",
            prices || [],
          );

          if (priceData[ticker]) {
            priceData[ticker][timePeriod] = prices || [];
          }
        });
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

  $: if (tickerList && tickerList.length > 0 && typeof window !== "undefined") {
    loadInitialData();
  }

  function plotData() {
    const parsedData = {};
    const series = [];

    for (const [symbol, data] of Object?.entries(rawGraphData)) {
      const seriesData = Array.isArray(data?.history) ? data?.history : [];

      // Filter & map to [timestamp, value]
      parsedData[symbol] = filterDataByTimePeriod(seriesData)?.map((item) => {
        const d = new Date(item?.date);
        return [
          Date.UTC(
            d.getUTCFullYear(),
            d.getUTCMonth(),
            d.getUTCDate(),
            d.getUTCHours(),
            d.getUTCMinutes(),
            d.getUTCSeconds(),
          ),
          item?.value,
        ];
      });
    }

    Object.entries(parsedData).forEach(([symbol, dataPoints]) => {
      const quote = stockQuotes[symbol];
      if (!dataPoints?.length) return;

      const change = (dataPoints.at(-1)?.[1] / dataPoints.at(0)?.[1] - 1) * 100;

      let minValue = Math.min(...dataPoints.map((d) => d[1]));
      let maxValue = Math.max(...dataPoints.map((d) => d[1]));

      const padding = 0.002;
      const yMin = minValue * (1 - padding);
      const yMax = maxValue * (1 + padding);

      const isNegative = change < 0;

      const lineColor = isNegative
        ? "#CC261A"
        : $mode === "light"
          ? "#137547"
          : "#00FC50";

      const fillColorStart = isNegative
        ? "rgba(204, 38, 26, 0.6)"
        : "rgba(19, 117, 71, 0.6)";

      const fillColorEnd = isNegative
        ? "rgba(204, 38, 26, 0.01)"
        : "rgba(19, 117, 71, 0.01)";

      // Add main series
      series.push({
        name: symbol,
        type: "area",
        data: dataPoints,
        color: lineColor,
        lineWidth: 2,
        marker: { enabled: false },
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, fillColorStart],
            [1, fillColorEnd],
          ],
        },
        zIndex: 2,
      });

      // Previous close line
      if (quote?.previousClose) {
        const firstTime = dataPoints[0][0];
        const lastTime = dataPoints[dataPoints.length - 1][0];
        series.push({
          name: `${symbol} Prev Close`,
          type: "line",
          data: [
            [firstTime, quote.previousClose],
            [lastTime, quote.previousClose],
          ],
          color: $mode === "light" ? "#9CA3AF" : "#6B7280",
          lineWidth: 1,
          dashStyle: "Dot",
          marker: { enabled: false },
          showInLegend: false,
          enableMouseTracking: false,
          zIndex: 1,
        });
      }
    });

    return {
      chart: {
        backgroundColor: $mode === "light" ? "#fff" : "#09090B",
        animation: false,
        height: 200,
      },
      credits: { enabled: false },
      tooltip: {
        shared: true,
        useHTML: true,
        backgroundColor: "rgba(0,0,0,0.8)",
        borderColor: "rgba(255,255,255,0.2)",
        borderWidth: 1,
        style: { color: "white", fontSize: "16px", padding: "10px" },
        borderRadius: 4,
        formatter: function () {
          const date = new Date(this.x);
          const formattedDate =
            selectedPlotPeriod === "1D"
              ? date.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                });

          let content = "";
          this.points?.forEach((point) => {
            content += `<span class="text-white text-[1rem] font-[501]">${point.series.name}: ${point.y}</span><br>`;
          });
          content += `<span class="text-white m-auto text-black text-sm font-normal">${formattedDate}</span><br>`;
          return content;
        },
      },
      xAxis: {
        type: "datetime",
        tickLength: 0,
        labels: {
          style: { color: $mode === "light" ? "black" : "white" },
        },
      },
      yAxis: {
        min: Math.min(...series.flatMap((s) => s.data.map((p) => p[1]))),
        max: Math.max(...series.flatMap((s) => s.data.map((p) => p[1]))),
        startOnTick: false,
        endOnTick: false,
        opposite: true,
        gridLineWidth: 1,
        gridLineColor: $mode === "light" ? "#e5e7eb" : "#111827",
        labels: { style: { color: $mode === "light" ? "black" : "white" } },
      },
      plotOptions: { series: { animation: false, marker: { enabled: false } } },
      legend: { enabled: false },
      series,
    };
  }
</script>

{#if tickerList?.length > 0}
  <div class="w-full mb-5">
    {#if config && isLoaded && Object.keys(stockQuotes).length > 0}
      {#each tickerList as ticker, index}
        {@const quote = stockQuotes[ticker]}
        {#if quote}
          <div class="bg-gray-50 dark:bg-primary/10 rounded p-6 mb-6">
            <!-- Header with company name and price info -->
            <div
              class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6"
            >
              <div class="mb-4 sm:mb-0">
                <div class="flex items-center gap-2 mb-2">
                  <img
                    src={`https://financialmodelingprep.com/image-stock/${ticker}.png`}
                    alt="logo"
                    class="shrink-0 w-5 h-5 rounded-full"
                  />

                  <h1 class="text-lg font-bold">
                    {ticker?.toUpperCase()}
                  </h1>
                </div>
                <div class="flex items-baseline gap-3">
                  <span class="text-3xl">
                    {quote?.price?.toFixed(2) || "n/a"}
                  </span>

                  <span
                    class="text-lg font-medium {(quote?.changesPercentage ||
                      0) >= 0
                      ? 'text-green-500'
                      : 'text-red-500'}"
                  >
                    {(quote?.changesPercentage || 0) >= 0
                      ? "+"
                      : ""}${quote?.change?.toFixed(2) || "0.00"} ({(quote?.changesPercentage ||
                      0) >= 0
                      ? "+"
                      : ""}{quote?.changesPercentage?.toFixed(2) || "0.00"}%)
                  </span>
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  Updated {new Date(quote?.timestamp * 1000).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                      timeZone: "UTC",
                    },
                  )}
                </div>
              </div>
            </div>

            <!-- Time period buttons -->
            <div class="flex w-fit space-x-1 mb-6">
              {#each ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "MAX"] as item}
                <button
                  on:click={() => changePlotPeriod(item)}
                  class="px-3 py-1.5 text-sm font-medium transition-colors duration-200 {selectedPlotPeriod ===
                  item
                    ? ' border-b-2 border-gray-900 dark:border-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}"
                >
                  {item}
                </button>
              {/each}
            </div>

            <!-- Chart -->
            <div class="w-full h-[200px] mb-6" use:highcharts={config}></div>

            <!-- Financial metrics grid -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
              <div>
                <div class="text-gray-500 dark:text-gray-400 mb-1">
                  Prev Close
                </div>
                <div class="font-medium">
                  ${quote?.previousClose?.toFixed(2) || "n/a"}
                </div>
              </div>

              <div>
                <div class="text-gray-500 dark:text-gray-400 mb-1">
                  52W Range
                </div>
                <div class="font-medium">
                  ${quote?.yearLow?.toFixed(2) || "n/a"} - ${quote?.yearHigh?.toFixed(
                    2,
                  ) || "n/a"}
                </div>
              </div>

              <div>
                <div class="text-gray-500 dark:text-gray-400 mb-1">
                  Market Cap
                </div>
                <div class="font-medium">
                  {abbreviateNumber(quote?.marketCap) || "n/a"}
                </div>
              </div>

              <div>
                <div class="text-gray-500 dark:text-gray-400 mb-1">Open</div>
                <div class="font-medium">
                  ${quote?.open?.toFixed(2) || "n/a"}
                </div>
              </div>

              <div>
                <div class="text-gray-500 dark:text-gray-400 mb-1">
                  P/E Ratio
                </div>
                <div class="font-medium">
                  {quote?.pe?.toFixed(2) || "n/a"}
                </div>
              </div>

              <div>
                <div class="text-gray-500 dark:text-gray-400 mb-1">
                  Dividend Yield
                </div>
                <div class="font-medium">
                  {quote?.dividendYield
                    ? (quote.dividendYield * 100).toFixed(3) + "%"
                    : "n/a"}
                </div>
              </div>

              <div>
                <div class="text-gray-500 dark:text-gray-400 mb-1">
                  Day Range
                </div>
                <div class="font-medium">
                  ${quote?.dayLow?.toFixed(2) || "n/a"} - ${quote?.dayHigh?.toFixed(
                    2,
                  ) || "n/a"}
                </div>
              </div>

              <div>
                <div class="text-gray-500 dark:text-gray-400 mb-1">Volume</div>
                <div class="font-medium">
                  {quote?.volume?.toLocaleString("en-US") || "n/a"}
                </div>
              </div>

              <div>
                <div class="text-gray-500 dark:text-gray-400 mb-1">EPS</div>
                <div class="font-medium">
                  {quote?.eps?.toFixed(2) || "n/a"}
                </div>
              </div>
            </div>
          </div>
        {/if}
      {/each}
    {:else}
      <div class="bg-gray-50 dark:bg-gray-900 rounded p-6">
        <div class="flex justify-center items-center h-96">
          <div class="relative">
            <div
              class="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"
            ></div>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}
