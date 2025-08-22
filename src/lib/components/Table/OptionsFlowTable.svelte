<script lang="ts">
  import { screenWidth } from "$lib/store";
  import { abbreviateNumber } from "$lib/utils";

  import VirtualList from "svelte-tiny-virtual-list";
  import HoverStockChart from "$lib/components/HoverStockChart.svelte";
  import { toast } from "svelte-sonner";
  import { mode } from "mode-watcher";
  import Spark from "lucide-svelte/icons/sparkles";

  export let data;
  export let optionsWatchlist;
  export let displayedData = [];
  export let filteredData = [];
  export let rawData = [];

  let selectedOptionData = "";
  let optionsInsightContent = "";
  let isStreaming = false;
  //  let animationClass = "";
  //  let animationId = "";

  function formatTime(timeString) {
    // Split the time string into components
    const [hours, minutes, seconds] = timeString?.split(":").map(Number);

    // Determine AM or PM
    const period = hours >= 12 ? "PM" : "AM";

    // Convert hours from 24-hour to 12-hour format
    const formattedHours = hours % 12 || 12; // Converts 0 to 12 for midnight

    // Format the time string
    const formattedTimeString = `${formattedHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${period}`;

    return formattedTimeString;
  }

  function reformatDate(dateString) {
    return (
      dateString.substring(5, 7) +
      "/" +
      dateString.substring(8) +
      "/" +
      dateString.substring(2, 4)
    );
  }
  /*
  async function addToWatchlist(itemId) {
    if (data?.user?.tier === "Pro") {
      try {
        const postData = {
          itemIdList: [itemId],
          id: optionsWatchlist?.id,
        };

        if (optionsWatchlist?.optionsId?.includes(itemId)) {
          // Remove ticker from the watchlist.
          optionsWatchlist.optionsId = optionsWatchlist?.optionsId.filter(
            (item) => item !== itemId,
          );
        } else {
          // Add ticker to the watchlist.
          animationId = itemId;
          animationClass = "heartbeat";
          const removeAnimation = () => {
            animationId = "";
            animationClass = "";
          };
          optionsWatchlist.optionsId = [...optionsWatchlist?.optionsId, itemId];
          const heartbeatElement = document.getElementById(itemId);
          if (heartbeatElement) {
            // Only add listener if it's not already present
            if (!heartbeatElement.classList.contains("animation-added")) {
              heartbeatElement.addEventListener(
                "animationend",
                removeAnimation,
              );
              heartbeatElement.classList.add("animation-added"); // Prevent re-adding listener
            }
          }
        }

        const response = await fetch("/api/update-options-watchlist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(postData),
        });

        optionsWatchlist.id = await response.json();
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
      } catch (error) {
        console.error("An error occurred:", error);
        // Handle the error appropriately (e.g., show an error message to the user)
      }
    } else {
      toast.error("Unlock this feature with Pro Subscription", {
        style: `border-radius: 5px; background: #fff; color: #000; border-color: ${$mode === "light" ? "#F9FAFB" : "#4B5563"}; font-size: 15px;`,
      });
    }
  }
    */

  async function optionsInsight(optionsData) {
    if (data?.user?.tier === "Pro") {
      try {
        selectedOptionData = optionsData;
        optionsInsightContent = ""; // Clear previous content
        isStreaming = true;

        const clicked = document.getElementById("optionsInsightModal");
        clicked?.dispatchEvent(new MouseEvent("click"));

        const postData = {
          optionsData: optionsData,
        };

        const response = await fetch("/api/options-insight", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(postData),
        });

        if (!response.ok || !response.body) {
          const errorText = await response.text();
          console.error("Response error:", errorText);
          optionsInsightContent = "Error loading analysis. Please try again.";
          isStreaming = false;
          return;
        }

        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const json = JSON.parse(line);

              if (json.error) {
                console.error("Stream error:", json.error);
                optionsInsightContent =
                  "Error loading analysis. Please try again.";
                break;
              }

              if (json.content) {
                optionsInsightContent = json.content;
              }
            } catch (e) {
              console.error("Parse error:", e);
            }
          }
        }
        isStreaming = false;
      } catch (error) {
        console.error("An error occurred:", error);
        optionsInsightContent = "Error loading analysis. Please try again.";
        isStreaming = false;
      }
    } else {
      toast.error("Unlock this feature with Pro Subscription", {
        style: `border-radius: 5px; background: #fff; color: #000; border-color: ${$mode === "light" ? "#F9FAFB" : "#4B5563"}; font-size: 15px;`,
      });
    }
  }

  let sortOrders = {
    time: "none",
    ticker: "none",
    expiry: "none",
    dte: "none",
    strike: "none",
    callPut: "none",
    sentiment: "none",
    spot: "none",
    price: "none",
    premium: "none",
    type: "none",
    exec: "none",
    vol: "none",
    oi: "none",
  };

  // Generalized sorting function
  function sortData(key) {
    // Reset all other keys to 'none' except the current key
    for (const k in sortOrders) {
      if (k !== key) {
        sortOrders[k] = "none";
      }
    }

    // Cycle through 'none', 'asc', 'desc' for the clicked key
    const orderCycle = ["none", "asc", "desc"];
    const currentOrderIndex = orderCycle.indexOf(sortOrders[key]);
    sortOrders[key] = orderCycle[(currentOrderIndex + 1) % orderCycle.length];

    const sortOrder = sortOrders[key];
    const originalData =
      filteredData?.length !== 0 ? [...filteredData] : [...rawData];

    // Reset to original data when 'none'
    if (sortOrder === "none") {
      displayedData = originalData;
      return;
    }

    const compareFunctions = {
      time: (a, b) => {
        const timeA = new Date("1970-01-01T" + a.time).getTime();
        const timeB = new Date("1970-01-01T" + b.time).getTime();
        return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
      },
      ticker: (a, b) => {
        const tickerA = a.ticker.toUpperCase();
        const tickerB = b.ticker.toUpperCase();
        return sortOrder === "asc"
          ? tickerA.localeCompare(tickerB)
          : tickerB.localeCompare(tickerA);
      },
      expiry: (a, b) => {
        const timeA = new Date(a.date_expiration);
        const timeB = new Date(b.date_expiration);
        return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
      },
      dte: (a, b) => {
        const timeA = new Date(a.date_expiration);
        const timeB = new Date(b.date_expiration);
        return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
      },
      strike: (a, b) => {
        const strikeA = parseFloat(a.strike_price);
        const strikeB = parseFloat(b.strike_price);
        return sortOrder === "asc" ? strikeA - strikeB : strikeB - strikeA;
      },
      spot: (a, b) => {
        const spotA = parseFloat(a.underlying_price);
        const spotB = parseFloat(b.underlying_price);
        return sortOrder === "asc" ? spotA - spotB : spotB - spotA;
      },
      price: (a, b) => {
        const priceA = parseFloat(a.price);
        const priceB = parseFloat(b.price);
        return sortOrder === "asc" ? priceA - priceB : priceB - priceA;
      },
      premium: (a, b) => {
        const premiumA = parseFloat(a.cost_basis);
        const premiumB = parseFloat(b.cost_basis);
        return sortOrder === "asc" ? premiumA - premiumB : premiumB - premiumA;
      },
      size: (a, b) => {
        const volA = parseFloat(a?.size);
        const volB = parseFloat(b?.size);
        return sortOrder === "asc" ? volA - volB : volB - volA;
      },
      vol: (a, b) => {
        const volA = parseFloat(a.volume);
        const volB = parseFloat(b.volume);
        return sortOrder === "asc" ? volA - volB : volB - volA;
      },
      oi: (a, b) => {
        const oiA = parseFloat(a.open_interest);
        const oiB = parseFloat(b.open_interest);
        return sortOrder === "asc" ? oiA - oiB : oiB - oiA;
      },
      callPut: (a, b) => {
        const callPutA = a.put_call?.toUpperCase();
        const callPutB = b.put_call?.toUpperCase();
        return sortOrder === "asc"
          ? callPutA.localeCompare(callPutB)
          : callPutB.localeCompare(callPutA);
      },
      sentiment: (a, b) => {
        const sentimentOrder = { BULLISH: 1, NEUTRAL: 2, BEARISH: 3 };
        const sentimentA = sentimentOrder[a?.sentiment?.toUpperCase()] || 4;
        const sentimentB = sentimentOrder[b?.sentiment?.toUpperCase()] || 4;
        return sortOrder === "asc"
          ? sentimentA - sentimentB
          : sentimentB - sentimentA;
      },
      type: (a, b) => {
        const typeOrder = { SWEEP: 1, TRADE: 2 };
        const typeA = typeOrder[a.option_activity_type?.toUpperCase()] || 3;
        const typeB = typeOrder[b.option_activity_type?.toUpperCase()] || 3;
        return sortOrder === "asc" ? typeA - typeB : typeB - typeA;
      },
      exec: (a, b) => {
        const tickerA = a?.execution_estimate?.toUpperCase();
        const tickerB = b?.execution_estimate?.toUpperCase();
        return sortOrder === "asc"
          ? tickerA.localeCompare(tickerB)
          : tickerB.localeCompare(tickerA);
      },
    };

    // Sort using the appropriate comparison function
    displayedData = originalData.sort(compareFunctions[key]);
  }
</script>

<div class="w-full overflow-x-auto">
  <!-- Set a min-width on smaller screens so the grid can show all columns -->
  <div class="min-w-[1000px]">
    <!-- Header row using grid -->
    <div
      class="table-driver bg-default text-white grid grid-cols-16 sticky top-0 z-10 border border-gray-300 dark:border-gray-800 font-bold text-xs uppercase"
    >
      <div
        on:click={() => sortData("time")}
        class="cursor-pointer p-2 text-center select-none whitespace-nowrap"
      >
        Time
        <svg
          class="shrink-0 w-4 h-4 -mt-1 {sortOrders['time'] === 'asc'
            ? 'rotate-180 inline-block'
            : sortOrders['time'] === 'desc'
              ? 'inline-block'
              : 'hidden'} "
          viewBox="0 0 20 20"
          fill="currentColor"
          style="max-width:50px"
          ><path
            fill-rule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clip-rule="evenodd"
          ></path></svg
        >
      </div>
      <div
        on:click={() => sortData("ticker")}
        class="cursor-pointer p-2 text-center select-none whitespace-nowrap"
      >
        Symbol
        <svg
          class="shrink-0 w-4 h-4 -mt-1 {sortOrders['ticker'] === 'asc'
            ? 'rotate-180 inline-block'
            : sortOrders['ticker'] === 'desc'
              ? 'inline-block'
              : 'hidden'} "
          viewBox="0 0 20 20"
          fill="currentColor"
          style="max-width:50px"
          ><path
            fill-rule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clip-rule="evenodd"
          ></path></svg
        >
      </div>

      <div class="cursor-pointer p-2 text-center whitespace-nowrap">
        Insight
      </div>

      <div
        on:click={() => sortData("expiry")}
        class="cursor-pointer p-2 text-center whitespace-nowrap"
      >
        Expiry
        <svg
          class="shrink-0 w-4 h-4 -mt-1 {sortOrders['expiry'] === 'asc'
            ? 'rotate-180 inline-block'
            : sortOrders['expiry'] === 'desc'
              ? 'inline-block'
              : 'hidden'} "
          viewBox="0 0 20 20"
          fill="currentColor"
          style="max-width:50px"
          ><path
            fill-rule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clip-rule="evenodd"
          ></path></svg
        >
      </div>

      <div
        on:click={() => sortData("dte")}
        class="cursor-pointer p-2 text-center whitespace-nowrap"
      >
        dte
        <svg
          class="shrink-0 w-4 h-4 -mt-1 {sortOrders['dte'] === 'asc'
            ? 'rotate-180 inline-block'
            : sortOrders['dte'] === 'desc'
              ? 'inline-block'
              : 'hidden'} "
          viewBox="0 0 20 20"
          fill="currentColor"
          style="max-width:50px"
          ><path
            fill-rule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clip-rule="evenodd"
          ></path></svg
        >
      </div>

      <div
        on:click={() => sortData("strike")}
        class="cursor-pointer p-2 text-center whitespace-nowrap"
      >
        strike
        <svg
          class="shrink-0 w-4 h-4 -mt-1 {sortOrders['strike'] === 'asc'
            ? 'rotate-180 inline-block'
            : sortOrders['strike'] === 'desc'
              ? 'inline-block'
              : 'hidden'} "
          viewBox="0 0 20 20"
          fill="currentColor"
          style="max-width:50px"
          ><path
            fill-rule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clip-rule="evenodd"
          ></path></svg
        >
      </div>

      <div
        on:click={() => sortData("callPut")}
        class="cursor-pointer p-2 text-center whitespace-nowrap"
      >
        C/P
        <svg
          class="shrink-0 w-4 h-4 -mt-1 {sortOrders['callPut'] === 'asc'
            ? 'rotate-180 inline-block'
            : sortOrders['callPut'] === 'desc'
              ? 'inline-block'
              : 'hidden'} "
          viewBox="0 0 20 20"
          fill="currentColor"
          style="max-width:50px"
          ><path
            fill-rule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clip-rule="evenodd"
          ></path></svg
        >
      </div>

      <div
        on:click={() => sortData("sentiment")}
        class="cursor-pointer p-2 text-center whitespace-nowrap"
      >
        Sent.
        <svg
          class="shrink-0 w-4 h-4 -mt-1 {sortOrders['sentiment'] === 'asc'
            ? 'rotate-180 inline-block'
            : sortOrders['sentiment'] === 'desc'
              ? 'inline-block'
              : 'hidden'} "
          viewBox="0 0 20 20"
          fill="currentColor"
          style="max-width:50px"
          ><path
            fill-rule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clip-rule="evenodd"
          ></path></svg
        >
      </div>

      <div
        on:click={() => sortData("spot")}
        class="cursor-pointer p-2 text-center whitespace-nowrap"
      >
        Spot
        <svg
          class="shrink-0 w-4 h-4 -mt-1 {sortOrders['spot'] === 'asc'
            ? 'rotate-180 inline-block'
            : sortOrders['spot'] === 'desc'
              ? 'inline-block'
              : 'hidden'} "
          viewBox="0 0 20 20"
          fill="currentColor"
          style="max-width:50px"
          ><path
            fill-rule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clip-rule="evenodd"
          ></path></svg
        >
      </div>

      <div
        on:click={() => sortData("price")}
        class="cursor-pointer p-2 text-center select-none whitespace-nowrap"
      >
        Price
        <svg
          class="shrink-0 w-4 h-4 -mt-1 {sortOrders['price'] === 'asc'
            ? 'rotate-180 inline-block'
            : sortOrders['price'] === 'desc'
              ? 'inline-block'
              : 'hidden'} "
          viewBox="0 0 20 20"
          fill="currentColor"
          style="max-width:50px"
          ><path
            fill-rule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clip-rule="evenodd"
          ></path></svg
        >
      </div>
      <div
        on:click={() => sortData("premium")}
        class="cursor-pointer p-2 text-center select-none whitespace-nowrap"
      >
        Prem
        <svg
          class="shrink-0 w-4 h-4 -mt-1 {sortOrders['premium'] === 'asc'
            ? 'rotate-180 inline-block'
            : sortOrders['premium'] === 'desc'
              ? 'inline-block'
              : 'hidden'} "
          viewBox="0 0 20 20"
          fill="currentColor"
          style="max-width:50px"
          ><path
            fill-rule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clip-rule="evenodd"
          ></path></svg
        >
      </div>

      <div
        on:click={() => sortData("type")}
        class="cursor-pointer p-2 text-center select-none whitespace-nowrap"
      >
        Type
        <svg
          class="shrink-0 w-4 h-4 -mt-1 {sortOrders['type'] === 'asc'
            ? 'rotate-180 inline-block'
            : sortOrders['type'] === 'desc'
              ? 'inline-block'
              : 'hidden'} "
          viewBox="0 0 20 20"
          fill="currentColor"
          style="max-width:50px"
          ><path
            fill-rule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clip-rule="evenodd"
          ></path></svg
        >
      </div>

      <div
        on:click={() => sortData("exec")}
        class="cursor-pointer p-2 text-center select-none whitespace-nowrap"
      >
        Exec
        <svg
          class="shrink-0 w-4 h-4 -mt-1 {sortOrders['exec'] === 'asc'
            ? 'rotate-180 inline-block'
            : sortOrders['exec'] === 'desc'
              ? 'inline-block'
              : 'hidden'} "
          viewBox="0 0 20 20"
          fill="currentColor"
          style="max-width:50px"
          ><path
            fill-rule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clip-rule="evenodd"
          ></path></svg
        >
      </div>

      <div
        on:click={() => sortData("size")}
        class="cursor-pointer p-2 text-center select-none whitespace-nowrap"
      >
        Size
        <svg
          class="shrink-0 w-4 h-4 -mt-1 {sortOrders['size'] === 'asc'
            ? 'rotate-180 inline-block'
            : sortOrders['size'] === 'desc'
              ? 'inline-block'
              : 'hidden'} "
          viewBox="0 0 20 20"
          fill="currentColor"
          style="max-width:50px"
          ><path
            fill-rule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clip-rule="evenodd"
          ></path></svg
        >
      </div>
      <div
        on:click={() => sortData("vol")}
        class="cursor-pointer p-2 text-center select-none whitespace-nowrap"
      >
        Vol
        <svg
          class="shrink-0 w-4 h-4 -mt-1 {sortOrders['vol'] === 'asc'
            ? 'rotate-180 inline-block'
            : sortOrders['vol'] === 'desc'
              ? 'inline-block'
              : 'hidden'} "
          viewBox="0 0 20 20"
          fill="currentColor"
          style="max-width:50px"
          ><path
            fill-rule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clip-rule="evenodd"
          ></path></svg
        >
      </div>

      <div
        on:click={() => sortData("oi")}
        class="cursor-pointer p-2 text-center select-none whitespace-nowrap"
      >
        OI
        <svg
          class="shrink-0 w-4 h-4 -mt-1 {sortOrders['oi'] === 'asc'
            ? 'rotate-180 inline-block'
            : sortOrders['oi'] === 'desc'
              ? 'inline-block'
              : 'hidden'} "
          viewBox="0 0 20 20"
          fill="currentColor"
          style="max-width:50px"
          ><path
            fill-rule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clip-rule="evenodd"
          ></path></svg
        >
      </div>
    </div>

    <VirtualList
      width="100%"
      height={$screenWidth < 640
        ? data?.user?.tier === "Pro"
          ? 550
          : 250
        : data?.user?.tier === "Pro"
          ? 850
          : 250}
      itemCount={displayedData.length}
      itemSize={40}
    >
      <div
        slot="item"
        let:index
        let:style
        {style}
        class="grid grid-cols-16 gap-0"
        class:bg-[#fff]={index % 2 === 0 && $mode === "light"}
        class:bg-[#09090B]={index % 2 === 0 && $mode !== "light"}
        class:bg-[#121217]={index % 2 !== 0 && $mode !== "light"}
        class:bg-[#F6F7F8]={index % 2 !== 0 && $mode == "light"}
        class:opacity-30={index + 1 === rawData?.length &&
          data?.user?.tier !== "Pro"}
      >
        <div class="p-2 text-end text-xs sm:text-sm whitespace-nowrap">
          {formatTime(displayedData[index]?.time)}
        </div>
        <div
          on:click|stopPropagation
          class="p-2 text-center text-sm sm:text-[1rem] whitespace-nowrap"
        >
          <HoverStockChart
            symbol={displayedData[index]?.ticker}
            assetType={displayedData[index]?.underlying_type}
          />
        </div>

        <div
          on:click|stopPropagation={() => optionsInsight(displayedData[index])}
          class="p-2 text-center text-sm sm:text-[1rem] whitespace-nowrap"
        >
          <Spark
            class=" w-4 sm:w-5 sm:h-5 inline-block cursor-pointer shrink-0 text-black sm:hover:text-muted dark:text-white dark:sm:hover:text-gray-200"
          />
        </div>
        <!--
        <div
          id={displayedData[index]?.id}
          on:click|stopPropagation={() =>
            addToWatchlist(displayedData[index]?.id)}
          class="p-2 text-end text-sm sm:text-[1rem] whitespace-nowrap {optionsWatchlist.optionsId?.includes(
            displayedData[index]?.id,
          )
            ? 'text-[#FFA500]'
            : $mode === 'light'
              ? 'text-gray-400'
              : 'text-[#fff]'}"
        >
          <svg
            class="{displayedData[index]?.id === animationId
              ? animationClass
              : ''} w-4 sm:w-5 sm:h-5 inline-block cursor-pointer shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            ><path
              fill="currentColor"
              d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327l4.898.696c.441.062.612.636.282.95l-3.522 3.356l.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"
            /></svg
          >
        </div>
-->
        <div class="p-2 text-end text-sm sm:text-[1rem] whitespace-nowrap">
          {reformatDate(displayedData[index]?.date_expiration)}
        </div>

        <div class="p-2 text-center text-sm sm:text-[1rem] whitespace-nowrap">
          {displayedData[index]?.dte < 0
            ? "expired"
            : displayedData[index]?.dte + "d"}
        </div>

        <div class="p-2 text-center text-sm sm:text-[1rem] whitespace-nowrap">
          {displayedData[index]?.strike_price}
        </div>

        <div
          class="p-2 text-center text-sm sm:text-[1rem] whitespace-nowrap {displayedData[
            index
          ]?.put_call === 'Calls'
            ? 'text-green-800 dark:text-[#00FC50]'
            : 'text-red-800 dark:text-[#FF2F1F]'} "
        >
          {displayedData[index]?.put_call}
        </div>

        <div
          class="p-2 text-end text-sm sm:text-[1rem] whitespace-nowrap {displayedData[
            index
          ]?.sentiment === 'Bullish'
            ? 'text-green-800 dark:text-[#00FC50]'
            : displayedData[index]?.sentiment === 'Bearish'
              ? 'text-red-800 dark:text-[#FF2F1F]'
              : 'text-orange-800 dark:text-[#C6A755]'} "
        >
          {displayedData[index]?.sentiment}
        </div>

        <div class="p-2 text-end text-sm sm:text-[1rem] whitespace-nowrap">
          {displayedData[index]?.underlying_price}
        </div>

        <div class="p-2 text-end text-sm sm:text-[1rem] whitespace-nowrap">
          {displayedData[index]?.price}
        </div>

        <div class="p-2 text-end text-sm sm:text-[1rem] whitespace-nowrap">
          {@html abbreviateNumber(
            displayedData[index]?.cost_basis,
            false,
            true,
          )}
        </div>

        <div
          class="p-2 text-end text-sm sm:text-[1rem] whitespace-nowrap {displayedData[
            index
          ]?.option_activity_type === 'Sweep'
            ? 'text-muted dark:text-[#C6A755]'
            : 'text-muted dark:text-[#976DB7]'}"
        >
          {displayedData[index]?.option_activity_type}
        </div>

        <div
          class="p-2 text-end text-sm sm:text-[1rem] whitespace-nowrap {[
            'At Ask',
            'Above Ask',
          ]?.includes(displayedData[index]?.execution_estimate)
            ? 'text-muted dark:text-[#C8A32D]'
            : ['At Bid', 'Below Bid']?.includes(
                  displayedData[index]?.execution_estimate,
                )
              ? 'text-muted dark:text-[#8F82FE]'
              : 'text-muted dark:text-[#A98184]'}"
        >
          {displayedData[index]?.execution_estimate
            ?.replace("At", "")
            ?.replace("Above", "")
            ?.replace("Below", "")
            ?.replace("Midpoint", "Mid")}
        </div>

        <div class="p-2 text-end text-sm sm:text-[1rem] whitespace-nowrap">
          {new Intl.NumberFormat("en", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(displayedData[index]?.size)}
        </div>

        <div class="p-2 text-end text-sm sm:text-[1rem] whitespace-nowrap">
          {new Intl.NumberFormat("en", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(displayedData[index]?.volume)}
        </div>

        <div class="p-2 text-end text-sm sm:text-[1rem] whitespace-nowrap">
          {new Intl.NumberFormat("en", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(displayedData[index]?.open_interest)}
        </div>
      </div>
    </VirtualList>
  </div>
</div>

<input type="checkbox" id="optionsInsightModal" class="modal-toggle" />

<dialog id="optionsInsightModal" class="modal bg-[#000]/40 p-3 sm:p-0">
  <label
    id="optionsInsightModal"
    for="optionsInsightModal"
    class="cursor-pointer modal-backdrop"
  ></label>

  <div
    class="modal-box max-h-[1000px] w-full max-w-4xl rounded w-full bg-white dark:bg-secondary border border-gray-600"
  >
    <div
      class="mb-5 flex flex-row justify-between items-center border-b pb-2 border-gray-300 dark:border-gray-600"
    >
      <h3 class="font-semibold text-lg sm:text-xl text-black dark:text-white">
        {selectedOptionData?.ticker}
        {selectedOptionData?.put_call}
        {selectedOptionData?.strike_price}
        {new Date(selectedOptionData?.date_expiration)?.toLocaleDateString(
          "en-US",
          {
            year: "numeric",
            month: "short", // "short" gives "Aug", "long" would give "August"
            day: "numeric",
            timeZone: "UTC",
          },
        )} Options Insight
      </h3>
      <label
        for="optionsInsightModal"
        class="cursor-pointer absolute right-5 top-2 text-[1rem] sm:text-[1.5rem]"
      >
        ✕
      </label>
    </div>

    <div class="">
      <div class="flex flex-col items-start w-full">
        {#if isStreaming && !optionsInsightContent}
          <div class="flex items-center gap-3 w-full">
            <img
              class="w-8 h-8 rounded-full shrink-0 animate-pulse"
              src="/pwa-192x192.png"
              alt="Stocknear Logo"
              loading="lazy"
            />
            <div class="flex items-center space-x-2 py-2 animate-pulse">
              Analyzing options flow order...
            </div>
          </div>
        {/if}

        {#if optionsInsightContent || (!isStreaming && optionsInsightContent)}
          <div class="flex items-start gap-3 w-full">
            <img
              class="w-8 h-8 rounded-full shrink-0"
              src="/pwa-192x192.png"
              alt="Stocknear Logo"
              loading="lazy"
            />
            <div class="flex-1">
              <div class="prose prose-sm dark:prose-invert max-w-none">
                {@html optionsInsightContent}
              </div>
              {#if isStreaming && optionsInsightContent}
                <div class="mt-2 flex items-center">
                  <div
                    class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"
                  ></div>
                  <span class="ml-1.5 text-xs text-gray-500 dark:text-gray-400"
                    >Analyzing...</span
                  >
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</dialog>

<style>
  .heartbeat {
    animation: heartbeat-animation 0.3s;
    animation-timing-function: ease-in-out;
  }

  @keyframes heartbeat-animation {
    0% {
      transform: rotate(0deg) scale(0.95);
    }
    25% {
      transform: rotate(10deg) scale(1.05);
    }
    50% {
      transform: rotate(0deg) scale(1.2);
    }
    75% {
      transform: rotate(-10deg) scale(1.05);
    }
    100% {
      transform: rotate(0deg) scale(0.95);
    }
  }
</style>
