<script lang="ts">
  import { screenWidth, isOpen } from "$lib/store";
  import {
    groupNews,
    groupEarnings,
    compareTimes,
    formatTime,
    abbreviateNumber,
    calculateChange,
    removeCompanyStrings,
  } from "$lib/utils";
  import { toast } from "svelte-sonner";
  import { mode } from "mode-watcher";

  import { onMount, onDestroy, afterUpdate } from "svelte";
  import Input from "$lib/components/Input.svelte";
  import * as DropdownMenu from "$lib/components/shadcn/dropdown-menu/index.js";
  import { Button } from "$lib/components/shadcn/button/index.js";
  import { Combobox } from "bits-ui";
  import HoverStockChart from "$lib/components/HoverStockChart.svelte";
  import { goto } from "$app/navigation";
  import TableHeader from "$lib/components/Table/TableHeader.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import Infobox from "$lib/components/Infobox.svelte";

  export let data;
  let timeoutId;
  let searchBarData = [];
  let searchQuery = "";
  let switchWatchlist = false;
  let editMode = false;
  let numberOfChecked = 0;
  let activeIdx = 0;
  let totalCreditCost = 0;
  let rawTabData = [];

  let deleteTickerList = [];

  let watchList: any[] = [];
  let originalData = [];

  let news = [];
  let earnings = [];
  let groupedNews = [];
  let groupedEarnings = [];
  let displayList = [];
  let checkedItems;
  let socket;

  let bulkData = [
    {
      name: "Stock Price",
      selected: true,
      credit: 1,
    },
    {
      name: "Dividends",
      selected: true,
      credit: 1,
    },
    {
      name: "Options",
      selected: true,
      credit: 3,
    },
    {
      name: "Dark Pool",
      selected: true,
      credit: 2,
    },
  ];
  const tabs = [
    {
      title: "News",
    },
    {
      title: "Earnings",
    },
  ];

  let allRows = [
    { name: "Volume", rule: "volume", type: "decimal" },
    { name: "Avg. Volume", rule: "avgVolume", type: "decimal" },
    { name: "Market Cap", rule: "marketCap", type: "int" },
    { name: "Price", rule: "price", type: "float" },
    { name: "Change", rule: "changesPercentage", type: "percentSign" },
    { name: "EPS", rule: "eps", type: "float" },
    { name: "PE", rule: "pe", type: "float" },
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
    { name: "Price Target Upside", rule: "upside", type: "percentSign" },
    { name: "Country", rule: "country", type: "str" },
    { name: "Gross Profit", rule: "grossProfit", type: "int" },
    { name: "Revenue Growth", rule: "growthRevenue", type: "percentSign" },
    {
      name: "Gross Profit Growth",
      rule: "growthGrossProfit",
      type: "percentSign",
    },
    { name: "Net Income Growth", rule: "growthNetIncome", type: "percentSign" },
    { name: "EBITDA Growth", rule: "growthEBITDA", type: "percentSign" },
    { name: "EPS Growth", rule: "growthEPS", type: "percentSign" },
    { name: "Total Debt", rule: "totalDebt", type: "int" },
    { name: "Return on Assets", rule: "returnOnAssets", type: "int" },
    { name: "Return on Equity", rule: "returnOnEquity", type: "int" },
    { name: "Value-at-Risk", rule: "var", type: "percentSign" },
    { name: "Asset Turnover", rule: "assetTurnover", type: "int" },
    { name: "Earnings Yield", rule: "earningsYield", type: "percent" },
    { name: "Altman-Z-Score Yield", rule: "altmanZScore", type: "float" },
    { name: "Piotroski F-Score", rule: "piotroskiScore", type: "float" },
    { name: "Total Liabilities", rule: "totalLiabilities", type: "int" },
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
  ];

  let ruleOfList = [
    { name: "Volume", rule: "volume", type: "decimal" },
    { name: "Market Cap", rule: "marketCap", type: "int" },
    { name: "Price", rule: "price", type: "float" },
    { name: "Change", rule: "changesPercentage", type: "percentSign" },
  ];

  const defaultRules = ruleOfList?.map((item) => item?.rule);

  const excludedRules = new Set([
    "volume",
    "price",
    "changesPercentage",
    "marketCap",
    "eps",
  ]);
  const proOnlyItems = new Set(
    allRows
      ?.filter((item) => !excludedRules?.has(item?.rule)) // Exclude the items based on the rule
      ?.map((item) => item?.name), // Map the remaining items to their names
  );

  let isLoaded = false;
  let downloadWorker: Worker | undefined;
  let displayWatchList;
  let allList = data?.getAllWatchlist;
  let priceAnimations = {};

  const handleDownloadMessage = (event) => {
    isLoaded = false;
    watchList = event?.data?.watchlistData ?? [];
    originalData = event?.data?.watchlistData ?? [];
    if (watchList?.length > 0) {
      columns = generateColumns(watchList);
      sortOrders = generateSortOrders(watchList);
    }
    isLoaded = true;
  };

  const updateStockScreenerData = async () => {
    downloadWorker.postMessage({
      ruleOfList: ruleOfList,
      tickerList: watchList?.map((item) => item?.symbol),
    });
  };

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
        const tickerList = watchList?.map((item) => item?.symbol) || [];
        sendMessage(tickerList);
      });

      socket.addEventListener("message", (event) => {
        const data = event.data;
        try {
          const newList = JSON?.parse(data);
          if (newList?.length > 0) {
            // Calculate changes and update watchlist
            watchList = calculateChange(watchList, newList);

            // Track which items have price changes for animation
            watchList.forEach((item) => {
              if (
                item.previous !== null &&
                item.previous !== undefined &&
                Math.abs(item.previous - item.price) >= 0.01
              ) {
                // Set animation state to true for this symbol
                priceAnimations[item.symbol] = true;

                // Remove animation state after animation completes
                setTimeout(() => {
                  priceAnimations[item.symbol] = false;
                  priceAnimations = { ...priceAnimations }; // Trigger reactivity
                }, 500); // Match animation duration
              }
            });

            // Force reactivity update
            priceAnimations = { ...priceAnimations };

            // Clear previous values after animation
            setTimeout(() => {
              watchList = watchList?.map((item) => ({
                ...item,
                previous: null,
              }));
            }, 800);
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

  async function getWatchlistData() {
    const postData = {
      watchListId: displayWatchList?.id,
      ruleOfList: ruleOfList?.map((item) => item?.rule),
    };
    const response = await fetch("/api/get-watchlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
    });

    const output = await response?.json();

    watchList = output?.data;
    originalData = output?.data;

    news = output?.news;
    earnings = output?.earnings;

    news = news?.map((item) => {
      const match = watchList?.find((w) => w?.symbol === item?.symbol);
      return match ? { ...item, type: match?.type } : { ...item };
    });

    earnings = earnings?.map((item) => {
      const match = watchList?.find((w) => w?.symbol === item?.symbol);
      return match ? { ...item, name: match?.name } : { ...item };
    });
    if (watchList?.length > 0) {
      columns = generateColumns(watchList);
      sortOrders = generateSortOrders(watchList);
      groupedEarnings = groupEarnings(earnings);

      groupedNews = groupNews(news, watchList);
    } else {
      groupedEarnings = [];
      groupedNews = [];
    }
    changeTab(0);
  }

  async function createWatchList(event) {
    event.preventDefault(); // Prevent the default form submission behavior

    const formData = new FormData(event.target); // Create a FormData object from the form
    const title = formData.get("title");

    // Validate the title input
    if (!title || title.toString().trim().length === 0) {
      toast.error("Title cannot be empty!", {
        style: `border-radius: 5px; background: #fff; color: #000; border-color: ${$mode === "light" ? "#F9FAFB" : "#4B5563"}; font-size: 15px;`,
      });
      return;
    }

    if (title.toString().length > 100) {
      toast.error("Title is too long. Keep it simple and concise bruv!", {
        style: `border-radius: 5px; background: #fff; color: #000; border-color: ${$mode === "light" ? "#F9FAFB" : "#4B5563"}; font-size: 15px;`,
      });
      return;
    }

    // Build the POST data object
    const postData: Record<string, any> = {};
    for (const [key, value] of formData.entries()) {
      postData[key] = value;
    }

    // Create a promise for the POST request
    const promise = fetch("/api/create-watchlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
    }).then(async (response) => {
      const output = await response.json();
      if (!response.ok) {
        // If the server returned an error (e.g. non‑Pro user already has a watchlist),
        // throw an error to be caught by toast.promise.
        throw new Error(
          output.error || "Something went wrong. Please try again!",
        );
      }
      return output;
    });

    // Use toast.promise to display a loading toast, then a success or error message
    toast.promise(promise, {
      loading: "Creating watchlist...",
      success: "Watchlist created successfully!",
      error: (err) => err.message || "Something went wrong. Please try again!",
    });

    try {
      const output = await promise;

      // Save the watchlist ID to localStorage (optional)
      try {
        localStorage.setItem("last-watchlist-id", JSON.stringify(output?.id));
      } catch (e) {
        console.log("Failed saving watchlist id: ", e);
      }

      // Dispatch events to close the modal and navigate to the watchlist page
      const clicked = document.getElementById("addWatchlist");
      clicked?.dispatchEvent(new MouseEvent("click"));

      const anchor = document.createElement("a");
      anchor.href = "/watchlist/stocks";
      anchor.dispatchEvent(new MouseEvent("click"));
    } catch (error) {
      console.error("Error creating watchlist:", error);
      // No additional toast.error is needed here since toast.promise already handles errors.
    }
  }

  function handleDeleteModal(event) {
    event?.preventDefault();
    const clicked = document.getElementById("deleteWatchlist");
    clicked.dispatchEvent(new MouseEvent("click"));
  }

  async function deleteWatchlist(event) {
    event.preventDefault(); // prevent the default form submission behavior

    const postData = {
      watchListId: displayWatchList?.id,
    };

    try {
      const response = await fetch("/api/delete-watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      });

      const output = await response.json();

      if (output === "success") {
        toast.success("Watchlist deleted successfully!", {
          style: `border-radius: 5px; background: #fff; color: #000; border-color: ${$mode === "light" ? "#F9FAFB" : "#4B5563"}; font-size: 15px;`,
        });

        allList = allList?.filter((item) => item?.id !== displayWatchList?.id);
        allList = [...allList];

        displayWatchList = allList[0];
        changeWatchList(displayWatchList);

        const clicked = document.getElementById("deleteWatchlist");
        clicked.dispatchEvent(new MouseEvent("click"));
      } else {
        toast.error("Something went wrong. Please try again!", {
          style: `border-radius: 5px; background: #fff; color: #000; border-color: ${$mode === "light" ? "#F9FAFB" : "#4B5563"}; font-size: 15px;`,
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred. Please try again later.", {
        style: `border-radius: 5px; background: #fff; color: #000; border-color: ${$mode === "light" ? "#F9FAFB" : "#4B5563"}; font-size: 15px;`,
      });
    }
  }

  function handleEditMode() {
    if (editMode === true) {
      deleteTickerList = [];
      numberOfChecked = 0;
    }
    editMode = !editMode;
  }

  async function handleFilter(symbol) {
    const filterSet = new Set(deleteTickerList);

    // Check if the new filter already exists in the list
    if (filterSet?.has(symbol)) {
      // If it exists, remove it from the list
      filterSet?.delete(symbol);
    } else {
      // If it doesn't exist, add it to the list
      filterSet?.add(symbol);
    }
    deleteTickerList = Array?.from(filterSet);
    numberOfChecked = deleteTickerList?.length;
  }

  async function handleDeleteTickers() {
    if (numberOfChecked === 0) {
      toast.error(`You need to select symbols before you can delete them`, {
        style: `border-radius: 5px; background: #fff; color: #000; border-color: ${$mode === "light" ? "#F9FAFB" : "#4B5563"}; font-size: 15px;`,
      });
    } else {
      watchList = watchList?.filter(
        (item) => !deleteTickerList?.includes(item?.symbol),
      );

      originalData = watchList;

      news = news?.filter((item) => !deleteTickerList?.includes(item?.symbol));
      earnings = earnings?.filter(
        (item) => !deleteTickerList?.includes(item?.symbol),
      );

      deleteTickerList = [...deleteTickerList];
      editMode = false;
      const postData = {
        ticker: watchList?.map((item) => item?.symbol),
        watchListId: displayWatchList?.id,
        mode: "delete",
      };

      const response = await fetch("/api/update-watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      });

      deleteTickerList = [];
      numberOfChecked = 0;
      allList = allList?.map((item) => {
        if (item?.id === displayWatchList?.id) {
          return { ...item, ticker: watchList }; // Update ticker with watchlist
        }
        return item; // Return unchanged item if condition doesn't match
      });

      allList = [...allList];
      if (watchList?.length > 0) {
        columns = generateColumns(watchList);
        sortOrders = generateSortOrders(watchList);
        groupedNews = groupNews(news, watchList);
        groupedEarnings = groupEarnings(earnings);
      } else {
        groupedEarnings = [];
        groupedNews = [];
      }
    }
  }

  function changeTab(i) {
    activeIdx = i;
    if (activeIdx === 0) {
      rawTabData = groupedNews;
    } else {
      rawTabData = groupedEarnings;
    }
    displayList = rawTabData?.slice(0, 8);
  }

  async function handleAddTicker(event, ticker) {
    // Check if the ticker is already in the watchlist.
    if (watchList?.some((item) => item?.symbol === ticker)) {
      toast.error("This symbol is already in your watchlist", {
        style: `border-radius: 5px; background: #fff; color: #000; border-color: ${$mode === "light" ? "#F9FAFB" : "#4B5563"}; font-size: 15px;`,
      });
      inputValue = "";
      return;
    }

    // Exit edit mode.
    editMode = false;

    // Prepare the data to send to the API.
    const postData = {
      ticker: ticker,
      watchListId: displayWatchList?.id,
    };

    // Create a promise for the fetch request.
    const promise = fetch("/api/update-watchlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
    }).then(async (response) => {
      const output = await response.json();
      // If the response is not OK, throw an error with the message from the API.
      if (!response.ok) {
        throw new Error(output.error || "Failed to update watchlist");
      }
      return output;
    });

    // Use toast.promise to display notifications based on the promise's state.
    toast?.promise(promise, {
      loading: "Updating watchlist...",
      success: "Watchlist updated successfully!",
      error: (err) => err.message || "Failed to update watchlist",
      style: `border-radius: 5px; background: #fff; color: #000; border-color: ${$mode === "light" ? "#F9FAFB" : "#4B5563"}; font-size: 15px;`,
    });

    try {
      // Await the promise, which returns the updated watchlist data.
      const updatedData = await promise;

      // Update the local allList with the updated watchlist.
      // (Assuming updatedData.ticker contains the new ticker list.)
      allList = allList?.map((item) => {
        if (item?.id === displayWatchList?.id) {
          return { ...item, tickers: updatedData.ticker };
        }
        return item;
      });

      // Refresh displayWatchList from the updated list.
      displayWatchList = allList?.find(
        (item) => item?.id === displayWatchList?.id,
      );

      // Refresh the watchlist data (UI or state refresh).
      await getWatchlistData();

      // Reset the input value.
      inputValue = "";
    } catch (error) {
      console.error("Error updating watchlist:", error);
      // Note: The error toast is already displayed by toast.promise.
    }
  }

  async function handleResetAll() {
    searchQuery = "";
    ruleOfList = [
      { name: "Volume", rule: "volume", type: "int" },
      { name: "Market Cap", rule: "marketCap", type: "int" },
      { name: "Price", rule: "price", type: "float" },
      { name: "Change", rule: "changesPercentage", type: "percentSign" },
    ];
    ruleOfList = [...ruleOfList];
    checkedItems = new Set(ruleOfList.map((item) => item.name));
    allRows = sortIndicatorCheckMarks(allRows);
    await updateStockScreenerData();

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
      toast.error("Only for Plus & Pro Members", {
        style: `border-radius: 5px; background: #fff; color: #000; border-color: ${$mode === "light" ? "#F9FAFB" : "#4B5563"}; font-size: 15px;`,
      });
    }
  }

  function changeWatchList(newWatchList) {
    displayWatchList = newWatchList;
    switchWatchlist = true;
    try {
      // Save the version along with the rules
      localStorage?.setItem(
        "last-watchlist-id",
        JSON?.stringify(displayWatchList?.id),
      );
    } catch (e) {
      console.log("Failed saving indicator rules: ", e);
    }
  }

  function saveRules() {
    try {
      // Save the version along with the rules
      localStorage?.setItem(
        "watchlist-ruleOfList",
        JSON?.stringify(ruleOfList),
      );
    } catch (e) {
      console.log("Failed saving indicator rules: ", e);
    }
  }

  async function handleScroll() {
    const scrollThreshold = document.body.offsetHeight * 0.8; // 80% of the website height
    const isBottom = window.innerHeight + window.scrollY >= scrollThreshold;
    if (isBottom && displayList?.length !== rawTabData?.length) {
      const nextIndex = displayList?.length;
      const filteredItem = rawTabData?.slice(nextIndex, nextIndex + 8);
      displayList = [...displayList, ...filteredItem];
    }
  }

  async function handleScrollStocks() {
    const scrollThreshold = document.body.offsetHeight * 0.8; // 80% of the website height
    const isBottom = window.innerHeight + window.scrollY >= scrollThreshold;
    if (isBottom && displayList?.length !== rawTabData?.length) {
      const nextIndex = displayList?.length;
      const filteredItem = rawTabData?.slice(nextIndex, nextIndex + 8);
      displayList = [...displayList, ...filteredItem];
    }
  }

  // Helper function to safely parse JSON
  function safeParse(value) {
    try {
      return JSON.parse(value);
    } catch (error) {
      // If JSON parsing fails, just return the original value
      return value;
    }
  }

  onMount(async () => {
    try {
      const savedRules = localStorage?.getItem("watchlist-ruleOfList");
      const savedLastWatchlistId = localStorage?.getItem("last-watchlist-id");

      if (savedRules) {
        const parsedRules = JSON.parse(savedRules);

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
        localStorage?.setItem(
          "watchlist-ruleOfList",
          JSON.stringify(ruleOfList),
        );
      } else {
        // If no saved rules, initialize with the current ruleOfList
        localStorage?.setItem(
          "watchlist-ruleOfList",
          JSON.stringify(ruleOfList),
        );
      }

      // Update checked items and sort the indicators
      checkedItems = new Set(ruleOfList?.map((item) => item.name));
      allRows = sortIndicatorCheckMarks(allRows);

      // Safely parse savedLastWatchlistId using safeParse
      let parsedLastWatchlistId = null;
      if (savedLastWatchlistId && savedLastWatchlistId.length > 0) {
        parsedLastWatchlistId = safeParse(savedLastWatchlistId);
      }

      displayWatchList = allList?.find(
        (item) => item?.id === parsedLastWatchlistId,
      );

      // If no valid watchlist is found, default to the first element of allList
      if (!displayWatchList && allList?.length > 0) {
        displayWatchList = allList.at(0);
      } else if (!displayWatchList) {
        displayWatchList = {};
      }

      await getWatchlistData();

      // Initialize the download worker if not already done
      if (!downloadWorker) {
        const DownloadWorker = await import("./workers/downloadWorker?worker");
        downloadWorker = new DownloadWorker.default();
        downloadWorker.onmessage = handleDownloadMessage;
      }

      isLoaded = true;
    } catch (e) {
      console.error("onMount error:", e);
    }

    if ($isOpen) {
      await websocketRealtimeData();
      console.log("WebSocket restarted");
    }

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("scroll", handleScrollStocks);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", handleScrollStocks);
    };
  });

  let previousList = [];
  let reconnectionTimeout;

  afterUpdate(async () => {
    // Compare only the symbols to detect changes
    const currentSymbols = watchList?.map((item) => item?.symbol).sort();
    const previousSymbols = previousList?.map((item) => item?.symbol).sort();

    // Check if symbols have changed
    if (
      JSON.stringify(currentSymbols) !== JSON.stringify(previousSymbols) &&
      typeof socket !== "undefined"
    ) {
      // Update previous list
      previousList = watchList;

      try {
        // Close existing socket if open
        if (socket && socket.readyState !== WebSocket.CLOSED) {
          socket.close();
        }

        // Wait for socket to close
        await new Promise((resolve) => {
          socket.addEventListener("close", resolve, { once: true });
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

  function handleWatchlistModal() {
    const closePopup = document.getElementById("addWatchlist");
    closePopup?.dispatchEvent(new MouseEvent("click"));
  }

  let testList = [];

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
    return allRows.sort((a, b) => {
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
      return a.name.localeCompare(b.name);
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

  $: charNumber = $screenWidth < 640 ? 15 : 20;

  $: {
    if (switchWatchlist && typeof window !== "undefined") {
      isLoaded = false;
      getWatchlistData();
      isLoaded = true;
      switchWatchlist = false;
    }
  }

  let inputValue = "";
  let touchedInput = false;

  async function search() {
    clearTimeout(timeoutId); // Clear any existing timeout

    if (!inputValue.trim()) {
      // Skip if query is empty or just whitespace
      searchBarData = []; // Clear previous results
      return;
    }

    timeoutId = setTimeout(async () => {
      const response = await fetch(
        `/api/searchbar?query=${encodeURIComponent(inputValue)}&limit=10`,
      );
      searchBarData = await response?.json();
    }, 50); // delay
  }

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
    const ruleToMetadataMap = Object.fromEntries(
      allRows.map((row) => [row.rule, { name: row.name, type: row.type }]),
    );

    // Separate preferred keys and other keys, excluding "type" and "previous"
    const keys = Object?.keys(data?.at(0))?.filter(
      (key) => key !== "type" && key !== "previous",
    );

    // Merge the preferred order with the default list order
    const orderedKeys = [
      ...preferredOrder?.filter((key) => keys?.includes(key)),
      ...ruleOfList
        ?.map((item) => item?.rule)
        ?.filter((key) => keys?.includes(key)),
      ...keys?.filter(
        (key) =>
          !preferredOrder?.includes(key) &&
          !ruleOfList?.some((item) => item?.rule === key),
      ),
    ];

    return orderedKeys?.map((key) => ({
      key,
      label:
        customLabels[key] ||
        ruleToMetadataMap[key]?.name || // Check allRows mapping first
        key?.charAt(0)?.toUpperCase() +
          key?.slice(1)?.replace(/([A-Z])/g, " $1"),
      type: ruleToMetadataMap[key]?.type || "string", // Add type from allRows or default to 'string'
      align: leftAlignKeys?.has(key) ? "left" : "right",
    }));
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
  let columns;
  let sortOrders;

  const sortData = (key, input = false) => {
    // Reset all other keys to 'none' except the current key
    for (const k in sortOrders) {
      if (k !== key) {
        sortOrders[k].order = "none";
      }
    }

    // If input is false, cycle through 'none', 'asc', 'desc' for the clicked key
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
      watchList = [...originalData]; // Reset originalData to rawData
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
    watchList = [...originalData].sort(compareValues)?.slice(0, 50);
  };

  async function handleBulkDownload() {
    const tickers = watchList?.map((item) => item?.symbol); // example tickers

    if (totalCreditCost === 0 || tickers?.length === 0) {
      toast.error(
        `Select at least one ${tickers?.length === 0 ? "symbol" : "bulk data"} to download`,
        {
          style: `border-radius: 5px; background: #fff; color: #000; border-color: ${$mode === "light" ? "#F9FAFB" : "#4B5563"}; font-size: 15px;`,
        },
      );
      return;
    }

    if (data?.user?.credits > totalCreditCost && tickers?.length > 0) {
      toast.promise(
        (async () => {
          data.user.credits = data.user.credits - totalCreditCost;

          const response = await fetch("/api/bulk-download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tickers: tickers, bulkData: bulkData }),
          });

          if (!response.ok) {
            throw new Error("Download request failed");
          }

          const blob = await response.blob();
          const url = URL.createObjectURL(blob);

          const a = document.createElement("a");
          a.href = url;
          a.download = "historical_data.zip";
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        })(),
        {
          loading: "Downloading data...",
          success: "Download complete!",
          error: "Download failed. Try again.",
          style: `border-radius: 5px; background: #fff; color: #000; border-color: ${$mode === "light" ? "#F9FAFB" : "#4B5563"}; font-size: 15px;`,
        },
      );
    } else if (tickers?.length === 0) {
      toast.error("Add tickers first to your watchlist", {
        style: `border-radius: 5px; background: #fff; color: #000; border-color: ${$mode === "light" ? "#F9FAFB" : "#4B5563"}; font-size: 15px;`,
      });
    } else {
      toast.error("Not enough credits", {
        style: `border-radius: 5px; background: #fff; color: #000; border-color: ${$mode === "light" ? "#F9FAFB" : "#4B5563"}; font-size: 15px;`,
      });
    }
  }

  $: {
    if (bulkData) {
      const tickers = watchList?.map((item) => item?.symbol); // example tickers

      totalCreditCost =
        tickers?.length *
        bulkData?.reduce((sum, item) => {
          return item.selected ? sum + item.credit : sum;
        }, 0);
    }
  }
</script>

<SEO
  title="Stock Watchlist - Track Your Portfolio & Monitor Stock Prices "
  description="Create and manage your personal stock watchlist with real-time price tracking. Monitor your favorite stocks, ETFs, and investments with price alerts and performance analytics. Free stock portfolio tracker with advanced features."
  keywords="stock watchlist, portfolio tracker, stock tracker, investment tracker, stock monitoring, price alerts, portfolio management, stock performance, investment watchlist"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Stock Watchlist Tracker",
    description: "Personal stock watchlist and portfolio tracking tool",
    url: "https://stocknear.com/watchlist/stocks",
    applicationCategory: "FinanceApplication",
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
          name: "Watchlist",
          item: "https://stocknear.com/watchlist",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Stocks",
          item: "https://stocknear.com/watchlist/stocks",
        },
      ],
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  }}
/>

<section
  class="w-full max-w-3xl sm:max-w-[1400px] overflow-hidden min-h-screen pt-5 pb-40 text-muted dark:text-white"
>
  <div class="w-full overflow-hidden m-auto">
    <div class="sm:p-0 flex justify-center w-full m-auto overflow-hidden">
      <div
        class="relative flex justify-center items-start overflow-hidden w-full"
      >
        <main class="w-full">
          {#if isLoaded}
            <div
              class="flex w-full sm:w-[50%] md:w-auto mb-5 {!data?.user
                ? 'hidden'
                : 'md:block'}"
            >
              <div
                class="hidden text-sm sm:text-[1rem] font-semibold md:block sm:mb-2"
              >
                My Watchlist
              </div>
              <div
                class="grid grid-cols-2 gap-3 sm:gap-0 sm:flex sm:flex-row sm:items-center"
              >
                <div class="order-0 w-full sm:w-fit">
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild let:builder>
                      <Button
                        builders={[builder]}
                        class=" min-w-[110px] w-full sm:w-fit border-gray-300 bg-black sm:hover:bg-default text-white dark:bg-default dark:border-gray-600 border dark:sm:hover:bg-primary ease-out flex flex-row justify-between items-center px-3 py-1.5 rounded truncate"
                      >
                        <span class="truncate font-medium text-sm"
                          >{displayWatchList?.title !== undefined
                            ? displayWatchList?.title
                            : "Create Watchlist"}</span
                        >
                        <svg
                          class="-mr-1 ml-1 h-5 w-5 xs:ml-2 inline-block"
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
                      align="start"
                      sideOffset={10}
                      alignOffset={0}
                      class="w-56 h-fit max-h-72 overflow-y-auto scroller"
                    >
                      <DropdownMenu.Label>
                        <DropdownMenu.Trigger asChild let:builder>
                          <Button
                            builders={[builder]}
                            class="p-0 -mb-2 -mt-2 text-sm inline-flex cursor-pointer items-center justify-center space-x-1 bg-white dark:bg-default whitespace-nowrap focus:outline-hidden"
                          >
                            <label
                              for="addWatchlist"
                              class="flex flex-row items-center cursor-pointer"
                            >
                              <svg
                                class="h-4 w-4 mr-1"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                style="max-width:40px"
                                aria-hidden="true"
                              >
                                <path
                                  fill-rule="evenodd"
                                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                                  clip-rule="evenodd"
                                ></path>
                              </svg>
                              <div class="text-sm text-start">
                                New Watchlist
                              </div>
                            </label>
                          </Button>
                        </DropdownMenu.Trigger>
                      </DropdownMenu.Label>
                      <DropdownMenu.Separator />
                      <DropdownMenu.Group>
                        {#each allList as item}
                          <DropdownMenu.Item
                            on:click={() => changeWatchList(item)}
                            class="text-sm sm:text-[1rem] {item?.id ===
                            displayWatchList?.id
                              ? 'bg-gray-200 dark:bg-primary'
                              : ''} cursor-pointer sm:hover:bg-gray-200 dark:sm:hover:bg-primary"
                          >
                            {item?.title} ({item?.ticker?.length})
                            <label
                              for="deleteWatchlist"
                              class="ml-auto inline-block cursor-pointer sm:hover:text-red-500"
                              on:click|capture={handleDeleteModal}
                            >
                              <svg
                                class="size-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                stroke-width="2"
                                style="max-width:40px"
                                ><path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                ></path></svg
                              >
                            </label>
                          </DropdownMenu.Item>
                        {/each}
                      </DropdownMenu.Group>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                </div>

                <div
                  class="order-2 sm:order-1 w-full {displayWatchList?.title ===
                  undefined
                    ? 'hidden'
                    : ''}"
                >
                  <Combobox.Root
                    items={searchBarData}
                    bind:inputValue
                    bind:touchedInput
                  >
                    <div class="relative sm:ml-3 w-full">
                      <Combobox.Input
                        on:input={search}
                        class="py-[7px] text-[0.85rem] sm:text-sm border bg-white dark:bg-default shadow-xs focus:outline-hidden border border-gray-300 dark:border-gray-600 rounded placeholder:text-gray-800 dark:placeholder:text-gray-300 px-3 focus:outline-none focus:ring-0 dark:focus:border-gray-600 grow w-full sm:min-w-56"
                        placeholder="Find..."
                        aria-label="Find..."
                      />
                    </div>

                    <Combobox.Content
                      class="w-auto z-10 shadow rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-default px-1 py-1.5  outline-hidden"
                      sideOffset={8}
                    >
                      {#if inputValue?.length > 0}
                        {#each searchBarData as item}
                          <Combobox.Item
                            class="cursor-pointer border-b border-gray-300 dark:border-gray-600 last:border-none flex h-fit w-auto select-none items-center rounded-button py-1.5 pl-5 pr-1.5 text-sm capitalize outline-hidden transition-all duration-75 data-highlighted:bg-gray-200 dark:data-highlighted:bg-primary"
                            value={item?.symbol}
                            label={item?.name}
                            on:click={(e) => handleAddTicker(e, item?.symbol)}
                          >
                            <div class="flex flex-col items-start">
                              <span
                                class="text-sm text-blue-800 dark:text-blue-400"
                                >{item?.symbol}</span
                              >
                              <span
                                class="text-xs sm:text-sm text-muted dark:text-white"
                                >{item?.name}</span
                              >
                            </div>
                          </Combobox.Item>
                          <!--This else is related to for loop-->
                        {:else}
                          <span
                            class="block px-5 py-2 text-sm text-muted dark:text-white"
                          >
                            No results found
                          </span>
                        {/each}
                      {:else}
                        <Combobox.Item
                          class="cursor-pointer border-b border-gray-300 dark:border-gray-600 last:border-none flex h-fit w-auto select-none items-center rounded-button py-1.5 pl-5 pr-1.5 text-sm capitalize outline-hidden"
                        >
                          <span class=" text-sm text-muted dark:text-white">
                            No results found
                          </span>
                        </Combobox.Item>
                      {/if}
                    </Combobox.Content>
                  </Combobox.Root>
                </div>

                <div
                  class="order-4 w-fit flex justify-end sm:ml-3 {displayWatchList?.title ===
                  undefined
                    ? 'hidden'
                    : ''}"
                >
                  <div class="flex flex-row items-center justify-end">
                    {#if editMode}
                      <label
                        on:click={handleDeleteTickers}
                        class="border text-sm border-gray-300 dark:border-gray-600 mr-2 sm:ml-3 sm:mr-0 cursor-pointer inline-flex items-center justify-center space-x-1 whitespace-nowrap rounded py-1.5 pl-3 pr-4 font-semibold dark:bg-default bg-black sm:hover:bg-default text-white dark:sm:hover:bg-default/60 ease-out sm:hover:text-red-500"
                      >
                        <svg
                          class="inline-block w-5 h-5"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          ><path
                            fill="currentColor"
                            d="M10 5h4a2 2 0 1 0-4 0M8.5 5a3.5 3.5 0 1 1 7 0h5.75a.75.75 0 0 1 0 1.5h-1.32l-1.17 12.111A3.75 3.75 0 0 1 15.026 22H8.974a3.75 3.75 0 0 1-3.733-3.389L4.07 6.5H2.75a.75.75 0 0 1 0-1.5zm2 4.75a.75.75 0 0 0-1.5 0v7.5a.75.75 0 0 0 1.5 0zM14.25 9a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-1.5 0v-7.5a.75.75 0 0 1 .75-.75m-7.516 9.467a2.25 2.25 0 0 0 2.24 2.033h6.052a2.25 2.25 0 0 0 2.24-2.033L18.424 6.5H5.576z"
                          /></svg
                        >
                        <span class="ml-1 text-sm">
                          {numberOfChecked}
                        </span>
                      </label>
                    {/if}
                    <label
                      on:click={handleEditMode}
                      class=" border text-sm border-gray-300 dark:border-gray-600 sm:ml-3 cursor-pointer inline-flex items-center justify-center space-x-1 whitespace-nowrap rounded py-1.5 px-3 dark:bg-default bg-black sm:hover:bg-default text-white dark:sm:hover:bg-primary ease-out"
                    >
                      <svg
                        class="inline-block w-5 h-5"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 1024 1024"
                        ><path
                          fill="currentColor"
                          d="M832 512a32 32 0 1 1 64 0v352a32 32 0 0 1-32 32H160a32 32 0 0 1-32-32V160a32 32 0 0 1 32-32h352a32 32 0 0 1 0 64H192v640h640z"
                        /><path
                          fill="currentColor"
                          d="m469.952 554.24l52.8-7.552L847.104 222.4a32 32 0 1 0-45.248-45.248L477.44 501.44l-7.552 52.8zm422.4-422.4a96 96 0 0 1 0 135.808l-331.84 331.84a32 32 0 0 1-18.112 9.088L436.8 623.68a32 32 0 0 1-36.224-36.224l15.104-105.6a32 32 0 0 1 9.024-18.112l331.904-331.84a96 96 0 0 1 135.744 0z"
                        /></svg
                      >
                      {#if !editMode}
                        <span class="ml-1 text-[0.85rem] sm:text-sm">
                          Edit Watchlist
                        </span>
                      {:else}
                        <span class="ml-1 text-[0.85rem] sm:text-sm">
                          Cancel
                        </span>
                      {/if}
                    </label>
                  </div>
                </div>

                <div
                  class="order-0 sm:order-4 w-full sm:mr-3 {displayWatchList?.title ===
                  undefined
                    ? 'hidden'
                    : ''}"
                >
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild let:builder>
                      <Button
                        on:click={() =>
                          (allRows = sortIndicatorCheckMarks(allRows))}
                        builders={[builder]}
                        class=" sm:ml-auto min-w-[110px] w-full sm:w-fit border-gray-300 dark:border-gray-600 border bg-black sm:hover:bg-default text-white dark:sm:hover:bg-primary ease-out flex flex-row justify-between items-center px-3 py-2.5  rounded truncate"
                      >
                        <span class="truncate text-[0.85rem] sm:text-sm"
                          >Indicators</span
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
                      class="w-60 max-h-[400px] overflow-y-auto scroller relative "
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
                            class="text-sm w-full bg-white dark:bg-default border-0 focus:border-gray-200 focus:ring-0 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 pr-8"
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
                                    class="rounded {defaultRules?.includes(
                                      item?.rule,
                                    )
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
                                    class="rounded {defaultRules?.includes(
                                      item?.rule,
                                    )
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

                <div
                  class="order-3 sm:order-last {displayWatchList?.title ===
                  undefined
                    ? 'hidden'
                    : ''}"
                >
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild let:builder>
                      <Button
                        builders={[builder]}
                        class=" min-w-[110px] w-full sm:w-fit border-gray-300 dark:border-gray-600 border bg-black sm:hover:bg-default text-white dark:sm:hover:bg-primary ease-out flex flex-row justify-between items-center px-3 py-2.5  rounded truncate"
                      >
                        <span class="truncate text-[0.85rem] sm:text-sm"
                          >Bulk Download</span
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
                      class="w-auto min-w-64 max-w-80 max-h-[400px] overflow-y-auto scroller relative"
                    >
                      <DropdownMenu.Label
                        class="text-muted dark:text-gray-400 font-semibold dark:font-normal text-xs"
                      >
                        {data?.user?.credits} Credits left
                      </DropdownMenu.Label>
                      <!-- Dropdown items -->
                      <DropdownMenu.Group class="pb-2">
                        {#each bulkData as item}
                          <DropdownMenu.Item
                            class="sm:hover:bg-gray-200 dark:sm:hover:bg-primary"
                          >
                            <label
                              on:click|capture={(event) => {
                                event.preventDefault();
                                item.selected = !item?.selected;
                              }}
                              class="inline-flex justify-between w-full items-center cursor-pointer"
                            >
                              <span class="mr-1 text-sm">{item?.name}</span>
                              <span class="mr-2 text-xs inline-block"
                                >({item?.credit} Credits)</span
                              >
                              <div class="relative ml-auto">
                                <input
                                  type="checkbox"
                                  checked={item?.selected}
                                  class="sr-only peer"
                                />
                                <div
                                  class="w-9 h-5 bg-gray-400 rounded-full peer peer-checked:bg-blue-600
      after:content-[''] after:absolute after:top-0.5 after:left-[2px]
      after:bg-white after:border-gray-300 after:border
      after:rounded-full after:h-4 after:w-4 after:transition-all
      peer-checked:after:translate-x-full"
                                ></div>
                              </div></label
                            >
                          </DropdownMenu.Item>
                        {/each}
                      </DropdownMenu.Group>
                      <div
                        class="sticky -bottom-1 bg-white dark:bg-default z-50 p-2 border-t border-gray-300 dark:border-gray-600 w-full flex justify-between items-center"
                      >
                        <span
                          class="w-full text-muted dark:text-gray-300 bg-white dark:bg-default font-semibold dark:font-normal text-start text-xs select-none"
                        >
                          = Credit Cost {totalCreditCost}
                        </span>
                        <button
                          on:click={handleBulkDownload}
                          class="whitespace-nowrap w-full flex justify-end dark:sm:hover:text-white text-muted dark:text-gray-300 bg-white dark:bg-default text-start text-sm cursor-pointer"
                        >
                          Bulk Download
                        </button>
                      </div>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                </div>
              </div>
            </div>

            {#if allList.length === 0}
              <div class="flex flex-col justify-center items-center m-auto z-0">
                <span class=" font-bold text-xl sm:text-3xl">
                  Empty Watchlist
                </span>

                <span class=" text-sm sm:text-lg m-auto p-4 text-center">
                  Fill it up with your favorite stocks and get realtime data and
                  the latest news in one place!
                </span>
                {#if !data?.user}
                  <a
                    class="w-64 flex mt-10 justify-center items-center m-auto btn text-black bg-[#fff] sm:hover:bg-gray-200 transition duration-150 ease-in-out group"
                    href="/register"
                  >
                    Get Started
                    <span
                      class="tracking-normal group-hover:translate-x-0.5 transition-transform duration-150 ease-in-out"
                    >
                      <svg
                        class="w-4 h-4"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        ><g transform="rotate(90 12 12)"
                          ><g fill="none"
                            ><path
                              d="M24 0v24H0V0h24ZM12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427c-.002-.01-.009-.017-.017-.018Zm.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093c.012.004.023 0 .029-.008l.004-.014l-.034-.614c-.003-.012-.01-.02-.02-.022Zm-.715.002a.023.023 0 0 0-.027.006l-.006.014l-.034.614c0 .012.007.02.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01l-.184-.092Z"
                            /><path
                              fill="black"
                              d="M13.06 3.283a1.5 1.5 0 0 0-2.12 0L5.281 8.939a1.5 1.5 0 0 0 2.122 2.122L10.5 7.965V19.5a1.5 1.5 0 0 0 3 0V7.965l3.096 3.096a1.5 1.5 0 1 0 2.122-2.122L13.06 3.283Z"
                            /></g
                          ></g
                        ></svg
                      >
                    </span>
                  </a>
                {/if}
              </div>
            {:else}
              <!--Start Table of Watchlist-->
              {#if watchList?.length !== 0}
                <div class="w-full">
                  <h2 class="font-semibold text-xl">
                    {watchList?.length} Stocks
                  </h2>

                  <div class="w-full overflow-x-auto">
                    <table
                      class="table table-sm table-compact rounded-none sm:rounded w-full border border-gray-300 dark:border-gray-800 m-auto mt-4"
                    >
                      <!-- head -->
                      <thead>
                        <TableHeader {columns} {sortOrders} {sortData} />
                      </thead>
                      <tbody class="p-0">
                        {#each watchList as item}
                          <tr
                            class="dark:sm:hover:bg-[#245073]/10 odd:bg-[#F6F7F8] dark:odd:bg-odd"
                          >
                            <td
                              on:click={() => handleFilter(item?.symbol)}
                              class="text-blue-800 dark:text-blue-400 text-sm sm:text-[1rem] whitespace-nowrap text-start flex flex-row items-center"
                            >
                              <input
                                type="checkbox"
                                checked={deleteTickerList?.includes(
                                  item?.symbol,
                                ) ?? false}
                                class="{!editMode
                                  ? 'hidden'
                                  : ''}  dark:bg-[#2E3238] h-[18px] w-[18px] rounded-sm ring-offset-0 mr-3"
                              />
                              {#if editMode}
                                <label
                                  class="text-blue-800 dark:text-blue-400 sm:hover:text-muted dark:sm:hover:text-white cursor-pointer"
                                >
                                  {item?.symbol}
                                </label>
                              {:else}
                                <HoverStockChart
                                  symbol={item?.symbol}
                                  assetType={item?.type}
                                />
                              {/if}
                            </td>

                            <td
                              class=" text-sm sm:text-[1rem] whitespace-nowrap"
                            >
                              {item?.name?.length > charNumber
                                ? item?.name?.slice(0, charNumber) + "..."
                                : item?.name}
                            </td>
                            {#each ruleOfList as row}
                              {#if isChecked(row?.name)}
                                <td
                                  id={item?.symbol}
                                  class="whitespace-nowrap text-sm sm:text-[1rem] text-end"
                                >
                                  {#if item?.[row?.rule] !== undefined && item?.[row?.rule] !== null}
                                    {#if row?.type === "int"}
                                      {abbreviateNumber(item[row?.rule])}
                                    {:else if row?.type === "decimal"}
                                      {item[row?.rule]?.toLocaleString("en-US")}
                                    {:else if row?.type === "str"}
                                      {item[row?.rule] !== null
                                        ? item[row?.rule]
                                        : "n/a"}
                                    {:else if row?.type === "float"}
                                      <div
                                        class="relative flex items-center justify-end"
                                      >
                                        {#if item?.previous !== null && item?.previous !== undefined && Math.abs(item?.previous - item[row?.rule]) >= 0.01 && row?.rule === "price"}
                                          <span
                                            class="absolute h-1 w-1 {item[
                                              row?.rule
                                            ] < 10
                                              ? 'right-[35px] sm:right-[40px]'
                                              : item[row?.rule] < 100
                                                ? 'right-[40px] sm:right-[45px]'
                                                : 'right-[45px] sm:right-[55px]'} bottom-0 -top-0.5 sm:-top-1"
                                          >
                                            <span
                                              class="inline-flex rounded-full h-1 w-1 {item?.previous >
                                              item[row?.rule]
                                                ? 'bg-[#FF2F1F]'
                                                : 'bg-[#00FC50]'} pulse-dot"
                                            ></span>
                                          </span>
                                        {/if}

                                        {item[row?.rule] !== null
                                          ? item[row?.rule]?.toFixed(2)
                                          : "n/a"}
                                      </div>
                                    {:else if row?.type === "percent"}
                                      {item[row?.rule] !== null
                                        ? item[row?.rule]?.toFixed(2) + "%"
                                        : "n/a"}
                                    {:else if row?.type === "percentSign"}
                                      {#if item[row?.rule] >= 0}
                                        <span
                                          class="text-green-800 dark:text-[#00FC50]"
                                          >+{item[row?.rule]?.toFixed(2)}%</span
                                        >
                                      {:else}
                                        <span
                                          class="text-red-800 dark:text-[#FF2F1F]"
                                          >{item[row?.rule]?.toFixed(2)}%</span
                                        >
                                      {/if}
                                    {:else if row?.type === "rating"}
                                      {#if ["Strong Buy", "Buy"].includes(item[row?.rule])}
                                        <span
                                          class="text-green-800 dark:text-[#00FC50]"
                                          >{item[row?.rule]}</span
                                        >
                                      {:else if ["Strong Sell", "Sell"].includes(item[row?.rule])}
                                        <span
                                          class="text-red-800 dark:text-[#FF2F1F]"
                                          >{item[row?.rule]}</span
                                        >
                                      {:else if item[row?.rule] === "Hold"}
                                        <span
                                          class="text-orange-700 dark:text-[#FFA838]"
                                          >{item[row?.rule]}</span
                                        >
                                      {/if}
                                    {/if}
                                  {:else}
                                    n/a
                                  {/if}
                                </td>
                              {/if}
                            {/each}
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                  </div>

                  <div
                    class="w-full m-auto border-b border-gray-300 dark:border-gray-600 mt-10 mb-5"
                  ></div>

                  <div class=" ">
                    <div
                      class="inline-flex justify-center w-full rounded sm:w-auto mb-3"
                    >
                      <div
                        class="bg-default text-white dark:bg-secondary w-full min-w-24 sm:w-fit relative flex flex-wrap items-center justify-center rounded p-1 mt-4"
                      >
                        {#each tabs as item, i}
                          {#if !["Pro", "Plus"]?.includes(data?.user?.tier) && i > 0}
                            <button
                              on:click={() => goto("/pricing")}
                              class="cursor-pointer group relative z-1 rounded-full w-1/2 min-w-24 md:w-auto px-5 py-1"
                            >
                              <span
                                class="relative text-sm sm:text-[1rem] block font-semibold"
                              >
                                {item.title}
                                <svg
                                  class="inline-block ml-0.5 -mt-1 w-3.5 h-3.5"
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  ><path
                                    fill="#A3A3A3"
                                    d="M17 9V7c0-2.8-2.2-5-5-5S7 4.2 7 7v2c-1.7 0-3 1.3-3 3v7c0 1.7 1.3 3 3 3h10c1.7 0 3-1.3 3-3v-7c0-1.7-1.3-3-3-3M9 7c0-1.7 1.3-3 3-3s3 1.3 3 3v2H9z"
                                  /></svg
                                >
                              </span>
                            </button>
                          {:else}
                            <button
                              on:click={() => changeTab(i)}
                              class="cursor-pointer group relative z-1 rounded-full w-1/2 min-w-24 md:w-auto px-5 py-1 {activeIdx ===
                              i
                                ? 'z-0'
                                : ''} "
                            >
                              {#if activeIdx === i}
                                <div
                                  class="absolute inset-0 rounded bg-[#fff]"
                                ></div>
                              {/if}
                              <span
                                class="relative text-sm sm:text-[1rem] block font-semibold {activeIdx ===
                                i
                                  ? 'text-black'
                                  : ''}"
                              >
                                {item.title}
                              </span>
                            </button>
                          {/if}
                        {/each}
                      </div>
                    </div>
                    {#if activeIdx === 0}
                      {#if groupedNews?.length > 0}
                        {#each displayList as [date, titleGroups]}
                          <h3 class="mb-1.5 mt-3 font-semibold text-faded">
                            {date}
                          </h3>
                          <div
                            class="border border-gray-300 dark:border-gray-700"
                          >
                            {#each titleGroups as { title, items, symbols }, index}
                              <div
                                class="flex border-gray-300 {index > 0
                                  ? 'border-t'
                                  : ''} dark:border-gray-600 text-small"
                              >
                                <div
                                  class="hidden min-w-[100px] items-center justify-center bg-gray-200 dark:bg-primary p-1 lg:flex"
                                >
                                  {new Date(
                                    items[0].publishedDate,
                                  ).toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  })}
                                </div>
                                <div class="grow px-3 py-2 lg:py-1">
                                  <a
                                    href={items[0].url}
                                    target="_blank"
                                    rel="nofollow noopener noreferrer"
                                    class="sm:hover:text-blue-800 dark:sm:hover:text-blue-400"
                                  >
                                    <h4
                                      class="text-sm font-semibold lg:text-[1rem]"
                                    >
                                      {title}
                                    </h4>
                                  </a>
                                  <div
                                    class="flex flex-wrap gap-x-2 pt-2 text-sm lg:pt-0.5"
                                  >
                                    <div class=" lg:hidden">
                                      {new Date(
                                        items[0].publishedDate,
                                      ).toLocaleTimeString("en-US", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: true,
                                      })}
                                    </div>
                                    <div class="">
                                      {items[0].site}
                                    </div>
                                    &#183;
                                    <div class="flex flex-wrap gap-x-2">
                                      {#each symbols as symbol}
                                        <a
                                          href={`/${items[0].type}/${symbol}`}
                                          class="text-blue-800 sm:hover:text-muted dark:sm:hover:text-white dark:text-blue-400"
                                        >
                                          {symbol}
                                        </a>
                                      {/each}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            {/each}
                          </div>
                        {/each}
                      {:else}
                        <span class="text-sm sm:text-[1rem]">
                          No news yet. Add some stocks to the watchlist to see
                          the latest news.
                        </span>
                      {/if}
                    {:else if groupedEarnings?.length > 0}
                      {#each displayList as [date, titleGroups]}
                        <h3 class="mb-1.5 mt-3 font-semibold text-faded">
                          {date}
                        </h3>
                        <div
                          class="border border-gray-300 dark:border-gray-700"
                        >
                          {#each titleGroups as item, index}
                            <div
                              class="flex border-gray-300 dark:border-gray-600 text-small"
                            >
                              <div
                                class="hidden min-w-[100px] items-center justify-center bg-gray-200 dark:bg-primary p-1 lg:flex"
                              >
                                {formatTime(item?.time)}
                              </div>
                              <div
                                class="grow px-3 py-2 lg:py-1 {index > 0
                                  ? 'border-t'
                                  : ''} border-gray-300 dark:border-gray-700"
                              >
                                <div>
                                  {removeCompanyStrings(item?.name)}
                                  (<HoverStockChart symbol={item?.symbol} />)
                                  will report

                                  {#if item?.time}
                                    {#if compareTimes(item?.time, "16:00") >= 0}
                                      after market closes.
                                    {:else if compareTimes(item?.time, "09:30") <= 0}
                                      before market opens.
                                    {:else}
                                      during market.
                                    {/if}
                                  {/if}
                                  Analysts estimate {abbreviateNumber(
                                    item?.revenueEst,
                                  )} in revenue ({(
                                    (item?.revenueEst / item?.revenuePrior -
                                      1) *
                                    100
                                  )?.toFixed(2)}% YoY) and {item?.epsEst} in earnings
                                  per share {#if item?.epsPrior !== 0}
                                    ({(
                                      (item?.epsEst / item?.epsPrior - 1) *
                                      100
                                    )?.toFixed(2)}% YoY).
                                  {/if}
                                </div>

                                <div
                                  class="flex flex-wrap gap-x-2 pt-2 text-sm lg:pt-0.5"
                                >
                                  <div class=" lg:hidden">
                                    {formatTime(item?.time)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          {/each}
                        </div>
                      {/each}
                    {:else}
                      <br />
                      <div class="mt-3 sm:mt-0">
                        <Infobox
                          text="No earnings data available. Add some stocks to the watchlist to see
                        the latest earnings data."
                        />
                      </div>
                    {/if}
                  </div>
                </div>
              {:else}
                <div
                  class="flex flex-col justify-center items-center m-auto pt-5 z-0"
                >
                  <span class=" font-bold text-xl sm:text-3xl">
                    Empty Watchlist
                  </span>

                  <span class=" text-sm sm:text-lg pt-5 m-auto p-4 text-center">
                    Fill it up with your favorite stocks and get realtime data
                    and the latest news in one place!
                  </span>
                </div>
              {/if}
              <!--End Table of Watchlist-->
            {/if}
          {:else}
            <div class="flex justify-center items-center h-80">
              <div class="relative">
                <label
                  class=" bg-default dark:bg-secondary rounded h-14 w-14 flex justify-center items-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                >
                  <span
                    class="loading loading-spinner loading-md text-white dark:text-white"
                  ></span>
                </label>
              </div>
            </div>
          {/if}
        </main>
      </div>
    </div>
  </div>
</section>

<!--Start Create Watchlist Modal-->

<!-- Desktop modal using dialog component -->
<input type="checkbox" id="addWatchlist" class="modal-toggle" />

<dialog id="addWatchlist" class="modal modal-bottom sm:modal-middle">
  <!-- Modal backdrop for desktop -->
  <label for="addWatchlist" class="cursor-pointer modal-backdrop"></label>

  <!-- Desktop modal content -->
  <div
    class="modal-box w-full bg-white dark:bg-secondary rounded border-gray-300 shadow"
  >
    <div class="mb-5">
      <h3 class="font-bold text-2xl mb-5">New Watchlist</h3>

      <form on:submit={createWatchList} class="space-y-2 w-full m-auto">
        <Input
          id="title"
          type="text"
          label="List Name"
          errors=""
          required={true}
        />

        <input class="hidden" name="user" value={data?.user?.id} />
        <input class="hidden" name="ticker" value={JSON.stringify([])} />

        <button
          type="submit"
          class="cursor-pointer mt-2 py-3 bg-[#3B82F6] dark:bg-[#fff] sm:hover:bg-blue-600 dark:sm:hover:bg-gray-200 btn-md w-full rounded m-auto text-white dark:text-black font-semibold text-md"
        >
          Create Watchlist
        </button>
      </form>
    </div>
  </div>
</dialog>
<!--End Create Watchlist Modal-->

<!--Start Delete Strategy Modal-->

<!--Start Delete Strategy Modal-->
<input type="checkbox" id="deleteWatchlist" class="modal-toggle" />

<dialog id="deleteWatchlist" class="modal modal-middle p-3 sm:p-0">
  <label for="deleteWatchlist" class="cursor-pointer modal-backdrop"></label>

  <div
    class="modal-box w-full p-6 rounded border
        bg-white dark:bg-secondary border border-gray-300 dark:border-gray-600"
  >
    <h3 class="text-lg font-medium mb-2">Delete Watchlist</h3>
    <p class="text-sm mb-6">
      Are you sure you want to delete this watchlist? This action cannot be
      undone.
    </p>
    <div class="flex justify-end space-x-3">
      <label
        for="deleteWatchlist"
        class="cursor-pointer px-4 py-2 rounded text-sm font-medium
            transition-colors duration-100
            bg-gray-600 text-white dark:bg-white dark:text-black"
        tabindex="0">Cancel</label
      ><label
        for="deleteWatchlist"
        on:click={deleteWatchlist}
        class="cursor-pointer px-4 py-2 rounded text-sm font-medium
            transition-colors duration-100 flex items-center
            bg-red-600 text-white
            "
        tabindex="0"
        ><svg
          stroke="currentColor"
          fill="none"
          stroke-width="2"
          viewBox="0 0 24 24"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="w-4 h-4 mr-2"
          height="1em"
          width="1em"
          xmlns="http://www.w3.org/2000/svg"
          ><polyline points="3 6 5 6 21 6"></polyline><path
            d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
          ></path><line x1="10" y1="11" x2="10" y2="17"></line><line
            x1="14"
            y1="11"
            x2="14"
            y2="17"
          ></line></svg
        >Delete Watchlist</label
      >
    </div>
  </div>
</dialog>

<!--End Delete Strategy Modal-->

<!--End Delete Strategy Modal-->

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

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Apply the animation styles to the element */
  .pulse-animation {
    animation: pulse 500ms ease-out forwards; /* 500ms duration */
    animation-iteration-count: 1;
  }

  @keyframes pulse-enter {
    from {
      transform: scale(0);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .pulse-dot {
    animation:
      pulse-enter 150ms ease-out,
      pulse 500ms ease-out 150ms forwards;
  }

  .fade-in-row {
    animation: fadeIn 400ms ease-out forwards;
    animation-fill-mode: both;
  }
</style>
