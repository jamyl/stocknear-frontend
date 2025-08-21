<script lang="ts">
  import { screenWidth, isOpen } from "$lib/store";
  import {
    abbreviateNumber,
    calculateChange,
    updateStockList,
  } from "$lib/utils";
  import { onMount, afterUpdate, onDestroy } from "svelte";
  import * as DropdownMenu from "$lib/components/shadcn/dropdown-menu/index.js";
  import { Button } from "$lib/components/shadcn/button/index.js";
  import HoverStockChart from "$lib/components/HoverStockChart.svelte";
  import TableHeader from "$lib/components/Table/TableHeader.svelte";
  import DownloadData from "$lib/components/DownloadData.svelte";
  import { page } from "$app/stores";
  import { toast } from "svelte-sonner";
  import { mode } from "mode-watcher";
  import Infobox from "$lib/components/Infobox.svelte";

  export let data;
  export let rawData;
  export let title = null;
  export let date = null;

  export let excludedRules = new Set([
    "volume",
    "price",
    "changesPercentage",
    "revenue",
    "eps",
    "marketCap",
  ]);
  export let specificRows = [];

  export let defaultList = [
    { name: "Market Cap", rule: "marketCap" },
    { name: "Price", rule: "price" },
    { name: "% Change", rule: "changesPercentage" },
    { name: "Revenue", rule: "revenue" },
  ];

  export let hideLastRow = false;

  let originalData = [...rawData]; // Unaltered copy of raw data
  let ruleOfList = [...defaultList];
  let socket;
  let sortMode = false;
  let inputValue = "";

  const defaultRules = defaultList?.map((item) => item?.rule);

  let syncWorker: Worker | undefined = undefined;

  // Handling messages from the worker
  const handleMessage = async (event) => {
    const filterData = event.data?.output;

    rawData = filterData;
    stockList = [...filterData]?.slice(0, 50);
  };

  let pagePathName = $page?.url?.pathname;
  let testList = [];
  let searchQuery = "";
  let activeSortKey = null;

  let downloadWorker: Worker | undefined;
  let checkedItems;

  let stockList = originalData?.slice(0, 150);
  let scrollPosition = 0;
  //$: stockList = originalData.slice(0, 150);

  let allRows = [
    { name: "Volume", rule: "volume", type: "decimal" },
    { name: "Call Volume", rule: "callVolume", type: "int" },
    { name: "Put Volume", rule: "putVolume", type: "int" },
    { name: "Avg. Volume", rule: "avgVolume", type: "decimal" },
    { name: "Market Cap", rule: "marketCap", type: "int" },
    { name: "Price", rule: "price", type: "float" },
    { name: "% Change", rule: "changesPercentage", type: "percentSign" },
    { name: "EPS", rule: "eps", type: "float" },
    { name: "PE Ratio", rule: "priceToEarningsRatio", type: "float" },
    { name: "PB Ratio", rule: "priceToBookRatio", type: "float" },
    { name: "PS Ratio", rule: "priceToSalesRatio", type: "float" },
    { name: "AI Score", rule: "score", type: "rating" },
    { name: "Revenue", rule: "revenue", type: "int" },
    { name: "EBITDA", rule: "ebitda", type: "int" },
    { name: "Net Income", rule: "netIncome", type: "int" },
    { name: "FCF", rule: "freeCashFlow", type: "int" },
    { name: "Industry", rule: "industry", type: "str" },
    { name: "Sector", rule: "sector", type: "str" },
    { name: "Price Change 1W", rule: "change1W", type: "percentSign" },
    { name: "Price Change 1M", rule: "change1M", type: "percentSign" },
    { name: "Price Change 3M", rule: "change3M", type: "percentSign" },
    { name: "Price Change 6M", rule: "change6M", type: "percentSign" },
    { name: "Price Change 1Y", rule: "change1Y", type: "percentSign" },
    { name: "Enterprise Value", rule: "enterpriseValue", type: "int" },
    { name: "Forward PE", rule: "forwardPE", type: "float" },
    { name: "Forward PS", rule: "forwardPS", type: "float" },
    { name: "Dividend Yield", rule: "dividendYield", type: "percent" },
    { name: "Current Ratio", rule: "currentRatio", type: "float" },
    { name: "Quick Ratio", rule: "quickRatio", type: "float" },
    { name: "Analyst Rating", rule: "analystRating", type: "rating" },
    { name: "Analyst Count", rule: "analystCounter", type: "int" },
    { name: "Price Target", rule: "priceTarget", type: "float" },
    { name: "Upside", rule: "upside", type: "percentSign" },
    { name: "Country", rule: "country", type: "str" },
    { name: "Gross Profit", rule: "grossProfit", type: "int" },
    { name: "Income Tax", rule: "incomeTaxExpense", type: "int" },
    { name: "Revenue Growth", rule: "growthRevenue", type: "percentSign" },
    {
      name: "Gross Profit Growth",
      rule: "growthGrossProfit",
      type: "percentSign",
    },
    {
      name: "Net Income Growth",
      rule: "growthNetIncome",
      type: "percentSign",
    },
    { name: "EBITDA Growth", rule: "growthEBITDA", type: "percentSign" },
    { name: "EPS Growth", rule: "growthEPS", type: "percentSign" },
    { name: "Total Debt", rule: "totalDebt", type: "int" },
    { name: "Return on Assets", rule: "returnOnAssets", type: "int" },
    { name: "Return on Equity", rule: "returnOnEquity", type: "int" },
    { name: "Value-at-Risk", rule: "var", type: "percentSign" },
    { name: "Asset Turnover", rule: "assetTurnover", type: "int" },
    { name: "Earnings Yield", rule: "earningsYield", type: "percent" },
    { name: "Altman-Z-Score", rule: "altmanZScore", type: "float" },
    { name: "Piotroski F-Score", rule: "piotroskiScore", type: "float" },
    { name: "Total Liabilities", rule: "totalLiabilities", type: "int" },
    { name: "RSI", rule: "rsi", type: "float" },
    { name: "Stock Buybacks", rule: "commonStockRepurchased", type: "int" },
    { name: "Short Ratio", rule: "shortRatio", type: "int" },
    { name: "Short Interest", rule: "sharesShort", type: "int" },
    { name: "Short % Float", rule: "shortFloatPercent", type: "percent" },
    {
      name: "Short % Shares",
      rule: "shortOutstandingPercent",
      type: "percent",
    },
    { name: "FCF Yield", rule: "freeCashFlowYield", type: "percent" },
    { name: "Employees", rule: "employees", type: "decimal" },
    { name: "Debt Ratio", rule: "debtRatio", type: "float" },
    { name: "Debt / Equity", rule: "debtToEquityRatio", type: "int" },
    { name: "Profit Margin", rule: "netProfitMargin", type: "percent" },
    { name: "FTD Shares", rule: "failToDeliver", type: "int" },
    { name: "Relative FTD", rule: "relativeFTD", type: "percent" },
    { name: "Interest Income", rule: "interestIncome", type: "int" },
    { name: "Operating Income", rule: "operatingIncome", type: "int" },
    {
      name: "Operating Income Growth",
      rule: "growthOperatingIncome",
      type: "percentSign",
    },
    {
      name: "Research & Development",
      rule: "researchAndDevelopmentExpenses",
      type: "int",
    },
    { name: "Shares Outstanding", rule: "sharesOutStanding", type: "int" },
    { name: "Profit Per Employee", rule: "profitPerEmployee", type: "int" },
    { name: "Revenue Per Employee", rule: "revenuePerEmployee", type: "int" },
    {
      name: "Institutional Ownership",
      rule: "institutionalOwnership",
      type: "percent",
    },
    { name: "Top Analyst Rating", rule: "topAnalystRating", type: "rating" },
    { name: "Top Analyst Count", rule: "topAnalystCounter", type: "int" },
    {
      name: "Top Analyst Price Target",
      rule: "topAnalystPriceTarget",
      type: "float",
    },
    {
      name: "Top Analyst PT Upside",
      rule: "topAnalystUpside",
      type: "percentSign",
    },
    { name: "Change OI", rule: "changeOI", type: "decimalSign" },
    { name: "Total OI", rule: "totalOI", type: "int" },
    { name: "IV Rank", rule: "ivRank", type: "float" },
    { name: "Total Prem", rule: "totalPrem", type: "int" },
  ];

  allRows = [...allRows, ...specificRows];

  const proOnlyItems = new Set(
    allRows
      ?.filter((item) => !excludedRules?.has(item?.rule)) // Exclude the items based on the rule
      ?.map((item) => item?.name), // Map the remaining items to their names
  );

  checkedItems = new Set(ruleOfList?.map((item) => item.name));

  allRows = sortIndicatorCheckMarks(allRows);

  const handleDownloadMessage = (event) => {
    let updateData = event?.data?.rawData ?? [];
    if (!updateData?.length || !rawData?.length) return;

    // Create a map for faster symbol lookup
    const updateDataMap = new Map(
      updateData.map((item) => [item.symbol, item]),
    );

    // Create a new array to ensure reactivity
    const updatedRawData = rawData.map((item) => {
      const updatedItem = updateDataMap.get(item.symbol);
      if (!updatedItem) return item;

      let newData = { ...updatedItem };

      // Merge fields from defaultRules that are missing in updatedItem
      defaultRules.forEach((rule) => {
        if (!(rule in updatedItem) && rule in item) {
          newData[rule] = item[rule];
        }
      });

      ruleOfList?.forEach((rule) => {
        if (!(rule in updatedItem) && rule in item) {
          newData[rule] = item[rule];
        }
      });

      // Preserve original values from rawData if present
      for (let rule of defaultRules) {
        if (rule in item) {
          newData[rule] = item[rule];
        }
      }

      // Ensure 'rank' and 'years' are added if missing
      if (!("rank" in updatedItem) && "rank" in item) {
        newData.rank = item.rank;
      }
      if (!("years" in updatedItem) && "years" in item) {
        newData.years = item.years;
      }

      return newData;
    });

    // Trigger reactivity by creating a new reference
    rawData = [...updatedRawData];
    stockList = rawData?.slice(0, 100);
    columns = generateColumns(rawData);
    sortOrders = generateSortOrders(rawData);
  };

  const updateStockScreenerData = async () => {
    downloadWorker.postMessage({
      ruleOfList: ruleOfList,
      tickerList: rawData?.map((item) => item?.symbol),
    });
  };

  function saveRules() {
    try {
      // Save the version along with the rules
      localStorage?.setItem(pagePathName, JSON?.stringify(ruleOfList));
    } catch (e) {
      console.log("Failed saving indicator rules: ", e);
    }
  }

  async function handleResetAll() {
    searchQuery = "";
    ruleOfList = defaultList;
    ruleOfList = [...ruleOfList];
    checkedItems = new Set(ruleOfList.map((item) => item.name));
    allRows = sortIndicatorCheckMarks(allRows);
    await updateStockScreenerData();

    console.log("Resetting all rules to default");
    saveRules();
  }

  async function handleSelectAll() {
    if (["Pro", "Plus"]?.includes(data?.user?.tier)) {
      searchQuery = "";
      ruleOfList = allRows;
      ruleOfList = [...ruleOfList];
      checkedItems = new Set(ruleOfList?.map((item) => item.name));
      allRows = sortIndicatorCheckMarks(allRows);
      await updateStockScreenerData();

      saveRules();
    } else {
      toast.error("Unlock this feature with Pro Subscription.", {
        style: `border-radius: 5px; background: #fff; color: #000; border-color: ${$mode === "light" ? "#F9FAFB" : "#4B5563"}; font-size: 15px;`,
      });
    }
  }

  function handleInput(event) {
    searchQuery = event.target.value?.toLowerCase() || "";

    setTimeout(() => {
      testList = [];

      if (searchQuery.length > 0) {
        const rawList = allRows;
        testList =
          rawList?.filter((item) => {
            const index = item?.name?.toLowerCase();
            // Check if country starts with searchQuery
            return index?.startsWith(searchQuery);
          }) || [];
      }
    }, 50);
  }

  function isChecked(item) {
    return checkedItems?.has(item);
  }

  function sortIndicatorCheckMarks(allRows) {
    return allRows?.sort((a, b) => {
      const isAChecked = checkedItems.has(a?.name);
      const isBChecked = checkedItems.has(b?.name);

      // Sort checked items first
      if (isAChecked !== isBChecked) return isAChecked ? -1 : 1;

      // Prioritize items based on default rules
      const isADefaultRule = defaultRules?.includes(a?.rule);
      const isBDefaultRule = defaultRules?.includes(b?.rule);
      if (isADefaultRule !== isBDefaultRule) {
        return isADefaultRule ? -1 : 1;
      }

      // Check if the user is not Pro
      if (!["Pro", "Plus"]?.includes(data?.user?.tier)) {
        const isAPriority = proOnlyItems.has(a?.name);
        const isBPriority = proOnlyItems.has(b?.name);

        // If both are priority items or both are not, sort alphabetically
        if (isAPriority === isBPriority) return a.name.localeCompare(b.name);

        // Move priority items to the bottom for non-Pro users
        return isAPriority ? 1 : -1;
      }

      // If the user is Pro, sort alphabetically
      return a?.name?.localeCompare(b.name);
    });
  }

  async function handleChangeValue(value) {
    if (checkedItems.has(value)) {
      checkedItems.delete(value); // Remove the value if it's already in the Set
    } else {
      checkedItems.add(value); // Add the value if it's not in the Set
      // Update ruleOfList based on checked items from indicatorList
    }
    ruleOfList = allRows.filter((item) => checkedItems.has(item.name)); // Assuming each item has a `value` property
    allRows = [...allRows];
    ruleOfList = [...ruleOfList];

    await updateStockScreenerData();
    //allRows = sortIndicatorCheckMarks(allRows);
    saveRules();
  }

  async function handleScroll() {
    const scrollThreshold = document.body.offsetHeight * 0.8;
    const isBottom = window.innerHeight + window.scrollY >= scrollThreshold;

    if (isBottom && stockList.length !== originalData.length) {
      const nextIndex = stockList.length;
      const filteredNewResults = originalData?.slice(
        nextIndex,
        nextIndex + 150,
      );
      stockList = [...stockList, ...filteredNewResults];
    }
  }

  // Save scroll position before data changes
  function saveScrollPosition() {
    scrollPosition = window.scrollY;
  }

  // Restore scroll position after data changes
  function restoreScrollPosition() {
    window.scrollTo(0, scrollPosition);
  }

  function sendMessage(message) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON?.stringify(message));
    } else {
      console.error("WebSocket is not open. Unable to send message.");
    }
  }

  async function websocketRealtimeData() {
    try {
      socket = new WebSocket(data?.wsURL + "/price-data");

      socket.addEventListener("open", () => {
        console.log("WebSocket connection opened");
        // Send only current watchlist symbols
        //Only update 200 tickers because of a bug. The previous price is getting changed for tickers. To-do list.
        const tickerList = rawData?.map((item) => item?.symbol) || [];
        sendMessage(tickerList);
      });

      socket.addEventListener("message", (event) => {
        const data = event.data;
        try {
          const newList = JSON?.parse(data);
          if (newList?.length > 0) {
            if (originalData?.some((item) => "changesPercentage" in item)) {
              originalData = calculateChange(originalData, newList);
              stockList = updateStockList(stockList, originalData);
              setTimeout(() => {
                stockList = stockList?.map((item) => ({
                  ...item,
                  previous: null,
                }));
              }, 800);
              saveScrollPosition();
              sortMode = true;
            }
          }
        } catch (e) {
          console.error("Error parsing WebSocket message:", e);
        }
      });

      socket.addEventListener("close", (event) => {
        console.log("WebSocket connection closed:", event.reason);
      });
    } catch (error) {
      console.error("WebSocket connection error:", error);
    }
  }

  $: stockList = [...stockList];

  $: if ($isOpen) {
    websocketRealtimeData();
    console.log("WebSocket restarted");
  }

  const loadWorker = async () => {
    syncWorker.postMessage({
      rawData: originalData,
      inputValue: inputValue,
    });
  };

  onMount(async () => {
    if (!syncWorker) {
      const SyncWorker = await import("$lib/workers/tableSearchWorker?worker");
      syncWorker = new SyncWorker.default();
      syncWorker.onmessage = handleMessage;
    }

    try {
      const savedRules = localStorage?.getItem(pagePathName);

      if (savedRules) {
        const parsedRules = JSON?.parse(savedRules);

        // Compare and update ruleOfList based on allRows
        ruleOfList = parsedRules.map((rule) => {
          const matchingRow = allRows.find((row) => row.name === rule.name);
          if (matchingRow && matchingRow.type !== rule.type) {
            return { ...rule, type: matchingRow.type };
          }
          return rule;
        });

        // Check for the user's tier and filter out paywalled features
        if (!["Pro", "Plus"]?.includes(data?.user?.tier)) {
          ruleOfList = ruleOfList.filter((item) =>
            excludedRules.has(item?.rule),
          );
        }

        // Save the updated ruleOfList back to localStorage
        localStorage?.setItem(pagePathName, JSON.stringify(ruleOfList));
      } else {
        // If no saved rules, initialize with the current ruleOfList
        localStorage?.setItem(pagePathName, JSON.stringify(ruleOfList));
      }

      // Update checked items and sort the indicators
      checkedItems = new Set(ruleOfList.map((item) => item.name));
      allRows = sortIndicatorCheckMarks(allRows);

      if (!downloadWorker) {
        const DownloadWorker = await import(
          "$lib/workers/downloadWorker?worker"
        );
        downloadWorker = new DownloadWorker.default();
        downloadWorker.onmessage = handleDownloadMessage;
      }
      await updateStockScreenerData();

      window.addEventListener("scroll", handleScroll);
      return () => {
        window.removeEventListener("scroll", handleScroll);
      };
    } catch (e) {
      console.log(e);
    }
  });

  let previousList = [];
  let reconnectionTimeout;

  afterUpdate(async () => {
    // Compare only the symbols to detect changes
    const currentSymbols = rawData?.map((item) => item?.symbol).sort();
    const previousSymbols = previousList?.map((item) => item?.symbol).sort();

    // Check if symbols have changed
    if (
      JSON.stringify(currentSymbols) !== JSON.stringify(previousSymbols) &&
      typeof socket !== "undefined"
    ) {
      // Update previous list
      previousList = rawData;

      try {
        // Close existing socket if open
        if (socket && socket.readyState !== WebSocket.CLOSED) {
          socket?.close();
        }

        // Wait for socket to close
        await new Promise((resolve) => {
          socket?.addEventListener("close", resolve, { once: true });
        });

        // Reconnect with new symbols
        if ($isOpen) {
          await websocketRealtimeData();
          console.log("WebSocket restarted due to watchlist changes");
        }
      } catch (error) {
        console.error("Error restarting WebSocket:", error);
      }
    }
  });

  onDestroy(() => {
    try {
      // Clear any pending reconnection timeout
      if (reconnectionTimeout) {
        clearTimeout(reconnectionTimeout);
      }

      // Close the WebSocket connection
      if (socket) {
        socket.close(1000, "Page unloaded");
      }
    } catch (e) {
      console.log(e);
    }
  });

  // Function to generate columns based on keys in rawData
  function generateColumns(data) {
    const leftAlignKeys = new Set(["rank", "symbol", "name"]);

    // Custom labels for specific keys
    const customLabels = {
      changesPercentage: "% Change",
      score: "AI Score",
      researchAndDevelopmentExpenses: "R&D",
      counter: "Ratings Count",
      // Add more key-label mappings here as needed
    };

    // Define preferred order for columns
    const preferredOrder = ["rank", "symbol", "name"];

    // Create a mapping of rule to name and type from allRows
    const ruleToMetadataMap = Object?.fromEntries(
      allRows?.map((row) => [row.rule, { name: row.name, type: row.type }]),
    );

    // Separate preferred keys and other keys, excluding "type"
    const keys = Object?.keys(data[0])?.filter((key) => key !== "type");

    // Merge the preferred order with the default list order
    const orderedKeys = [
      ...preferredOrder?.filter((key) => keys?.includes(key)),
      ...defaultList
        ?.map((item) => item.rule)
        .filter((key) => keys?.includes(key)),
      ...keys?.filter(
        (key) =>
          !preferredOrder?.includes(key) &&
          !defaultList?.some((item) => item.rule === key),
      ),
    ];

    return orderedKeys?.map((key) => ({
      key,
      label:
        customLabels[key] ||
        ruleToMetadataMap[key]?.name || // Check allRows mapping first
        key?.charAt(0)?.toUpperCase() +
          key?.slice(1).replace(/([A-Z])/g, " $1"),
      type: ruleToMetadataMap[key]?.type || "string", // Add type from allRows or default to 'string'
      align: leftAlignKeys.has(key) ? "left" : "right",
    }));
  }

  async function search() {
    inputValue = inputValue?.toLowerCase();

    setTimeout(async () => {
      if (inputValue?.length > 0) {
        await loadWorker();
      } else {
        // Reset to original data if filter is empty
        rawData = originalData;
        stockList = originalData?.slice(0, 50);
      }
    }, 100);
  }

  // Function to generate sortOrders based on keys in rawData
  function generateSortOrders(data) {
    const stringKeys = new Set([
      "symbol",
      "name",
      "industry",
      "score",
      "sector",
      "analystRating",
      "putCallShare",
    ]);

    return Object.keys(data[0])?.reduce((orders, key) => {
      orders[key] = {
        order: "none",
        type: stringKeys.has(key) ? "string" : "number",
      };
      return orders;
    }, {});
  }

  // Generate columns and sortOrders
  let columns = generateColumns(rawData);
  let sortOrders = generateSortOrders(rawData);

  const sortData = (key, input = false) => {
    // Reset all other keys to 'none' except the current key
    for (const k in sortOrders) {
      if (k !== key) {
        sortOrders[k].order = "none";
      }
    }

    // If input is false, cycle through 'none', 'asc', 'desc' for the clicked key
    if (!input) {
      const orderCycle = ["none", "asc", "desc"];
      const currentOrderIndex = orderCycle.indexOf(
        sortOrders[key]?.order || "none",
      );
      sortOrders[key] = {
        ...(sortOrders[key] || {}),
        order: orderCycle[(currentOrderIndex + 1) % orderCycle.length],
      };
    }

    const sortOrder = sortOrders[key]?.order;

    // Reset to original data when 'none' and stop further sorting
    if (sortOrder === "none") {
      originalData = [...rawData]; // Reset originalData to rawData
      stockList = originalData?.slice(0, 150); // Reset displayed data
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
          valueA = a[key];
          valueB = b[key];
          if (valueA == null && valueB == null) return 0;
          if (valueA == null) return 1;
          if (valueB == null) return -1;
          valueA = valueA?.toUpperCase();
          valueB = valueB?.toUpperCase();
          return sortOrder === "asc"
            ? valueA?.localeCompare(valueB)
            : valueB?.localeCompare(valueA);
        case "number":
        default:
          valueA = parseFloat(a[key]);
          valueB = parseFloat(b[key]);
          break;
      }
      return sortOrder === "asc"
        ? valueA < valueB
          ? -1
          : valueA > valueB
            ? 1
            : 0
        : valueA > valueB
          ? -1
          : valueA < valueB
            ? 1
            : 0;
    };

    // Sort and update the originalData and stockList
    originalData = [...rawData].sort(compareValues);
    if (
      ["changesPercentage", "price"]?.includes(activeSortKey) &&
      input === true
    ) {
      //stockList = originalData?.slice(0, Math.min(stockList?.length, 50)); // Update the displayed data
      originalData = [...rawData].sort(compareValues);
      stockList = originalData;
    } else {
      stockList = originalData?.slice(0, 150); // Update the displayed data
    }
  };

  $: charNumber = $screenWidth < 640 ? 15 : 20;
</script>

<!-- Content area -->

<div
  class="w-full flex flex-col sm:flex-row items-center justify-start sm:justify-between w-full mt-5 text-muted sm:pt-2 sm:pb-2 dark:text-white sm:border-t sm:border-b sm:border-gray-300 sm:dark:border-gray-800"
>
  {#if title}
    <div
      class="flex flex-row items-center justify-between sm:justify-start w-full sm:w-fit whitespace-nowrap -mb-1 sm:mb-0"
    >
      <h2
        class="text-start w-full mb-2 sm:mb-0 text-xl sm:text-2xl font-semibold"
      >
        {title}
      </h2>
      {#if date}
        <span
          class="text-sm sm:text-[0.9rem] text-gray-600 font-semibold dark:text-white ml-5 mt-1"
        >
          {date ? `Updated ${date}` : ""}
        </span>
      {/if}
    </div>
  {/if}
  <div
    class="flex items-center ml-auto border-t border-b border-gray-300 dark:border-gray-800 sm:border-none pt-2 pb-2 sm:pt-0 sm:pb-0 w-full"
  >
    <input
      type="text"
      bind:value={inputValue}
      on:input={search}
      placeholder="Find..."
      class="ml-auto py-[7px] text-[0.85rem] sm:text-sm border bg-white dark:bg-default shadow-xs focus:outline-hidden border border-gray-300 dark:border-gray-600 rounded placeholder:text-gray-800 dark:placeholder:text-gray-300 px-3 focus:outline-none focus:ring-0 dark:focus:border-gray-800 grow w-full sm:min-w-56 sm:max-w-14"
    />

    <div class=" ml-2">
      <DownloadData {data} {rawData} title={data?.getParams ?? "data"} />
    </div>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild let:builder>
        <Button
          builders={[builder]}
          on:click={() => (allRows = sortIndicatorCheckMarks(allRows))}
          class="ml-2 transition-all min-w-fit sm:min-w-[110px]  bg-default text-white shadow-xs dark:border-gray-600 border sm:hover:bg-black dark:sm:hover:bg-primary ease-out flex flex-row justify-between items-center px-3 py-2 rounded truncate"
        >
          <span class="w-fit text-[0.85rem] sm:text-sm">Indicators</span>
          <svg
            class="ml-0.5 mt-1 h-5 w-5 inline-block shrink-0"
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
        class="w-60 max-h-[400px] overflow-y-auto scroller relative"
      >
        <!-- Search Input -->
        <div
          class="sticky fixed -top-1 z-40 bg-white dark:bg-default p-2 border-b border-gray-300 dark:border-gray-600"
        >
          <div class="relative w-full">
            <!-- Input Field -->
            <input
              bind:value={searchQuery}
              on:input={handleInput}
              autocomplete="off"
              autofocus=""
              class="text-sm w-full border-0 bg-white dark:bg-default focus:border-gray-200 focus:ring-0 focus:outline-none placeholder:text-gray-600 dark:placeholder:text-gray-400 dark:text-gray-300 pr-8"
              type="text"
              placeholder="Search indicators..."
            />

            <!-- Clear Button - Shown only when searchQuery has input -->
            {#if searchQuery?.length > 0}
              <button
                on:click={() => (searchQuery = "")}
                aria-label="Clear"
                title="Clear"
                tabindex="0"
                class="absolute right-2 top-1/2 transform -translate-y-1/2"
              >
                <svg
                  class="h-5 w-5 text-icon cursor-pointer"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            {/if}
          </div>
        </div>
        <!-- Dropdown items -->
        <DropdownMenu.Group class="pb-2">
          {#if searchQuery?.length !== 0 && testList?.length === 0}
            <div class="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
              No indicators found
            </div>
          {/if}
          <!-- Added padding to avoid overlapping with Reset button -->
          {#each searchQuery?.length !== 0 ? testList : allRows as item}
            <DropdownMenu.Item
              class="sm:hover:bg-gray-200 dark:sm:hover:bg-primary"
            >
              <div class="flex items-center">
                {#if defaultRules?.includes(item?.rule)}
                  <label
                    on:click|capture={(event) => {
                      event.preventDefault();
                    }}
                    class=""
                  >
                    <input
                      disabled={defaultRules?.includes(item?.rule)
                        ? true
                        : false}
                      type="checkbox"
                      class="rounded {defaultRules?.includes(item?.rule)
                        ? 'checked:bg-gray-700'
                        : 'checked:bg-blue-700'}"
                      checked={isChecked(item?.name)}
                    />
                    <span class="ml-2">{item?.name}</span>
                  </label>
                {:else if ["Pro", "Plus"]?.includes(data?.user?.tier) || excludedRules?.has(item?.rule)}
                  <label
                    on:click|capture={(event) => {
                      event.preventDefault();
                      handleChangeValue(item?.name);
                    }}
                    class="cursor-pointer"
                    for={item?.name}
                  >
                    <input
                      disabled={defaultRules?.includes(item?.rule)
                        ? true
                        : false}
                      type="checkbox"
                      class="rounded {defaultRules?.includes(item?.rule)
                        ? 'checked:bg-gray-800'
                        : 'checked:bg-blue-700'}"
                      checked={isChecked(item?.name)}
                    />
                    <span class="ml-2">{item?.name}</span>
                  </label>
                {:else}
                  <a href="/pricing" class="cursor-pointer">
                    <svg
                      class="h-[18px] w-[18px] inline-block text-icon group-hover:text-dark-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      style="max-width:40px"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clip-rule="evenodd"
                      ></path>
                    </svg>
                    <span class="ml-2">{item?.name}</span>
                  </a>
                {/if}
              </div>
            </DropdownMenu.Item>
          {/each}
        </DropdownMenu.Group>
        <!-- Reset Selection button -->
        <div
          class="sticky -bottom-1 bg-white dark:bg-default z-50 p-2 border-t border-gray-300 dark:border-gray-600 w-full flex justify-between items-center"
        >
          <label
            on:click={handleResetAll}
            class="w-full dark:sm:hover:text-white text-muted dark:text-gray-300 bg-white dark:bg-default text-start text-sm cursor-pointer"
          >
            Reset Selection
          </label>
          <label
            on:click={handleSelectAll}
            class="w-full flex justify-end dark:sm:hover:text-white text-muted dark:text-gray-300 bg-white dark:bg-default text-start text-sm cursor-pointer"
          >
            Select All
          </label>
        </div>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>
</div>

{#if stockList?.length > 0}
  <div class="w-full overflow-x-auto text-muted dark:text-white">
    <table
      class="table table-sm table-compact rounded-none sm:rounded w-full border border-gray-300 dark:border-gray-800 m-auto mt-2"
    >
      <thead>
        <TableHeader {columns} {sortOrders} {sortData} />
      </thead>
      <tbody>
        {#each stockList as item, index}
          <tr
            class="dark:sm:hover:bg-[#245073]/10 odd:bg-[#F6F7F8] dark:odd:bg-odd {index +
              1 ===
              rawData?.length &&
            !['Pro', 'Plus']?.includes(data?.user?.tier) &&
            hideLastRow
              ? 'opacity-[0.1]'
              : ''}"
          >
            {#each columns as column}
              <td
                class="text-sm sm:text-[1rem] whitespace-nowrap"
                class:text-left={column.align === "left"}
                class:text-right={column.align === "right"}
              >
                {#if item[column.key] === null || item[column.key] === undefined}
                  n/a
                {:else if column.key === "symbol"}
                  <HoverStockChart symbol={item[column.key]} />
                {:else if column.key === "name"}
                  {#if item[column.key]?.length > charNumber}
                    {item[column.key]?.slice(0, charNumber) + "..."}
                  {:else}
                    {item[column.key]}
                  {/if}
                {:else if column?.type === "date"}
                  {new Date(item[column.key]).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                {:else if column?.type === "int"}
                  {@html column.key === "marketCap" && item[column.key] === 0
                    ? "n/a"
                    : abbreviateNumber(item[column.key], false, true)}
                {:else if column?.type === "decimal"}
                  {item[column.key]?.toLocaleString("en-US")}
                {:else if column?.type === "decimalSign"}
                  {#if item[column.key] >= 0}
                    <span class="text-green-800 dark:text-[#00FC50]"
                      >+{item[column.key]?.toLocaleString("en-US")}</span
                    >
                  {:else if item[column.key] < 0}
                    <span class="text-red-800 dark:text-[#FF2F1F]"
                      >{item[column.key]?.toLocaleString("en-US")}</span
                    >
                  {/if}
                {:else if column.key === "price"}
                  <div class="relative flex items-center justify-end">
                    {#if item?.previous !== null && item?.previous !== undefined && Math.abs(item?.previous - item[column?.key]) >= 0.01}
                      <span
                        class="absolute h-1 w-1 {item[column?.key] < 10
                          ? 'right-[35px] sm:right-[40px]'
                          : item[column?.key] < 100
                            ? 'right-[40px] sm:right-[45px]'
                            : 'right-[45px] sm:right-[55px]'} bottom-0 -top-0.5 sm:-top-1"
                      >
                        <span
                          class="inline-flex rounded-full h-1 w-1 {item?.previous >
                          item[column?.key]
                            ? 'bg-red-600 dark:bg-[#FF2F1F]'
                            : 'bg-green-600 dark:bg-[#00FC50]'} pulse-animation"
                        ></span>
                      </span>
                    {/if}
                    {item[column.key] !== null
                      ? item[column.key]?.toFixed(2)
                      : "n/a"}
                  </div>
                {:else if column.type === "percent"}
                  {item[column.key] > 0.01
                    ? item[column.key]?.toFixed(2) + "%"
                    : "< 0.01%"}
                {:else if column.type === "percentSign"}
                  {#if item[column.key] > 0}
                    <span class="text-green-800 dark:text-[#00FC50]"
                      >+{abbreviateNumber(item[column.key]?.toFixed(2))}%</span
                    >
                  {:else if item[column.key] < 0}
                    <span class="text-red-800 dark:text-[#FF2F1F]"
                      >{abbreviateNumber(item[column.key]?.toFixed(2))}%</span
                    >
                  {:else}
                    <span>{item[column.key]?.toFixed(2)}%</span>
                  {/if}
                {:else if column?.type === "rating"}
                  {item[column.key]}
                {:else if column.type === "sentiment"}
                  <div
                    class={item[column.key] >= 55
                      ? "text-green-800 dark:text-[#00FC50]"
                      : item[column.key] >= 50
                        ? "text-[#E57C34]"
                        : "text-red-800 dark:text-[#FF2F1F]"}
                  >
                    <div class="flex flex-row items-center justify-end">
                      <div class="">
                        {item[column.key] >= 80
                          ? "Very Bullish"
                          : item[column.key] >= 55
                            ? "Bullish"
                            : item[column.key] > 50
                              ? "Mixed"
                              : "Bearish"}
                      </div>
                      <div
                        class="ml-2 px-1.5 py-1.5 border text-center rounded text-xs font-semibold"
                      >
                        {item[column.key]}
                      </div>
                    </div>
                  </div>
                {:else}
                  {item[column.key]}
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else}
  <div class="w-full flex items-center justify-start text-start">
    <Infobox text={`No results found for "${inputValue}" `} />
  </div>
{/if}

<style>
  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    70% {
      transform: scale(1.1); /* Adjust scale as needed for pulse effect */
      opacity: 0.8;
    }
    100% {
      transform: scale(1); /* End scale */
      opacity: 0;
    }
  }

  /* Apply the animation styles to the element */
  .pulse-animation {
    animation: pulse 500ms ease-out forwards; /* 300ms duration */
  }
</style>
