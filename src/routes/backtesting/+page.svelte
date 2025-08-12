<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { screenWidth } from "$lib/store";
    import { toast } from "svelte-sonner";
    import { mode } from "mode-watcher";

    import { groupScreenerRules } from "$lib/utils";
    import * as DropdownMenu from "$lib/components/shadcn/dropdown-menu/index.js";
    import { Button } from "$lib/components/shadcn/button/index.js";
    import * as Tabs from "$lib/components/shadcn/tabs/index.js";

    import SEO from "$lib/components/SEO.svelte";
    import StrategyBuilder from "$lib/components/StrategyBuilder.svelte";

    //const userConfirmation = confirm('Unsaved changes detected. Leaving now will discard your strategy. Continue?');

    import { writable } from "svelte/store";

    let shouldLoadWorker = writable(false);
    export let data;
    export let form;
    let downloadWorker: Worker | undefined;

    let removeList = false;

    $: testList = [];

    let strategyList = data?.getAllStrategies;
    let selectedStrategy = strategyList?.at(0)?.id ?? "";
    let ruleOfList = strategyList?.at(0)?.rules ?? [];
    let groupedRules = {};
    let displayRules = [];
    let selectedPopularStrategy = "";
    let activeTab = "buy";
    const popularStrategyList = [
        { key: "dividendGrowth", label: "Dividend Growth" },
        { key: "monthlyDividends", label: "Monthly Dividends" },
        { key: "topGainers1Y", label: "Top Gainers 1Y" },
        { key: "topShortedStocks", label: "Top Shorted Stocks" },
        { key: "momentumTAStocks", label: "Momentum TA Stocks" },
        { key: "underValuedStocks", label: "Undervalued Stocks" },
        { key: "strongCashFlow", label: "Strong Cash Flow" },
    ];

    const onlySubscriberRules = [
        "gexRatio",
        "ivRank",
        "iv30d",
        "totalOI",
        "changeOI",
        "netCallPrem",
        "netPutPrem",
        "callVolume",
        "putVolume",
        "pcRatio",
        "topAnalystRating",
        "topAnalystCounter",
        "topAnalystPriceTarget",
        "topAnalystUpside",
        "score",
    ];

    const checkedRules = [
        "sma20",
        "sma50",
        "sma100",
        "sma200",
        "ema20",
        "ema50",
        "ema100",
        "ema200",
        "grahamNumber",
        "lynchFairValue",
        "analystRating",
        "earningsTime",
        "earningsDate",
        "payoutFrequency",
        "topAnalystRating",
        "halalStocks",
        "score",
        "sector",
        "industry",
        "country",
    ];

    let displayTableTab = "general";
    let otherTabRules = [];

    // Preloading system for tab data
    let preloadedData = new Map(); // Cache for preloaded tab data
    let hoverTimeout = null; // Debounce hover events

    // Buy conditions
    let buyConditions = [
        {
            indicator: "rsi",
            operator: "below",
            value: 30,
        },
    ];

    // Sell conditions
    let sellConditions = [
        {
            indicator: "rsi",
            operator: "above",
            value: 70,
        },
    ];

    // Risk Management
    let riskManagement = {
        stopLoss: {
            enabled: true,
            type: "percentage",
            value: 5,
        },
        takeProfit: {
            enabled: true,
            type: "percentage",
            value: 10,
        },
        positionSize: {
            type: "fixed",
            value: 1000,
        },
    };

    // Define all possible indicators and their properties
    const availableIndicators = {
        rsi: {
            label: "RSI (Relative Strength Index)",
            category: "Technical Analysis",
            operators: ["above", "below", "equals"],
            defaultOperator: "below",
            defaultValue: 30,
            min: 0,
            max: 100,
        },
        sma: {
            label: "Simple Moving Average",
            category: "Technical Analysis",
            operators: ["above", "below", "equals"],
            defaultOperator: "above",
            defaultValue: 20,
            min: 1,
            max: 200,
        },
        ema: {
            label: "Exponential Moving Average",
            category: "Technical Analysis",
            operators: ["above", "below", "equals"],
            defaultOperator: "above",
            defaultValue: 20,
            min: 1,
            max: 200,
        },
        macd: {
            label: "MACD",
            category: "Technical Analysis",
            operators: ["above", "below", "equals"],
            defaultOperator: "above",
            defaultValue: 0,
            min: -10,
            max: 10,
        },
        volume: {
            label: "Volume",
            category: "Volume",
            operators: ["above", "below", "equals"],
            defaultOperator: "above",
            defaultValue: 1000000,
            min: 0,
            max: 999999999,
        },
        price: {
            label: "Price",
            category: "Price",
            operators: ["above", "below", "equals"],
            defaultOperator: "above",
            defaultValue: 10,
            min: 0,
            max: 10000,
        },
    };

    // Strategy blocks for the new block-based UI
    let buyConditionBlocks = [];
    let sellConditionBlocks = [];

    // Define all possible rules and their properties (keeping for compatibility)
    const allRules = {
        rsi: {
            label: "Relative Strength Index",
            step: [90, 80, 70, 60, 50, 40, 30, 20],
            category: "Technical Analysis",
            defaultCondition: "over",
            defaultValue: "any",
        },
    };

    let filteredData = [];
    let displayResults = [];

    // Generate allRows from allRules
    $: allRows = Object?.entries(allRules)
        ?.sort(([, a], [, b]) => a.label.localeCompare(b.label)) // Sort by label
        ?.map(([ruleName, ruleProps]) => ({
            rule: ruleName,
            ...ruleProps,
        }));

    let filteredGroupedRules;
    let searchTerm = "";

    let ruleName = "";

    // Quick search functionality for unselected rules
    let quickSearchTerm = "";
    let quickSearchResults = [];
    let showQuickSearchDropdown = false;
    let selectedQuickSearchIndex = -1;

    // Define your default values

    let ruleCondition = {};
    let valueMappings = {};

    Object.keys(allRules).forEach((ruleName) => {
        ruleCondition[ruleName] = allRules[ruleName].defaultCondition;

        // Check if the default condition is "between"
        if (allRules[ruleName].defaultCondition === "between") {
            valueMappings[ruleName] = allRules[ruleName].defaultValue || [
                null,
                null,
            ];
        } else {
            valueMappings[ruleName] = allRules[ruleName].defaultValue;
        }
    });

    // Update ruleCondition and valueMappings based on existing rules
    ruleOfList?.forEach((rule) => {
        ruleCondition[rule.name] =
            rule.condition || allRules[rule.name].defaultCondition;
        valueMappings[rule.name] =
            rule.value || allRules[rule.name].defaultValue;
    });

    async function handleCreateStrategy() {
        if (["Pro", "Plus"]?.includes(data?.user?.tier)) {
            const closePopup = document.getElementById("addStrategy");
            closePopup?.dispatchEvent(new MouseEvent("click"));
        } else {
            toast.info("Available only to Plus or Pro Member", {
                style: `border-radius: 5px; background: #fff; color: #000; border-color: ${$mode === "light" ? "#F9FAFB" : "#4B5563"}; font-size: 15px;`,
            });
        }
    }

    async function handleDeleteStrategy() {
        const deletePromise = (async () => {
            const postData = {
                strategyId: selectedStrategy,
                type: "stocksScreener",
            };

            const response = await fetch("/api/delete-strategy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(postData),
            });

            if (!response.ok) {
                throw new Error(`Network error: ${response.status}`);
            }

            const output = await response.json();
            if (output !== "success") {
                throw new Error("Server returned failure");
            }

            // ——— SUCCESS: run your state‐update logic ———
            strategyList =
                strategyList?.filter((item) => item.id !== selectedStrategy) ??
                [];
            selectedStrategy = strategyList?.at(0)?.id ?? "";
            ruleOfList =
                strategyList?.find((item) => item.id === selectedStrategy)
                    ?.rules ?? [];

            ruleOfList.forEach((rule) => {
                ruleCondition[rule.name] =
                    rule.condition || allRules[rule.name].defaultCondition;
                valueMappings[rule.name] =
                    rule.value || allRules[rule.name].defaultValue;
            });

            if (ruleOfList.length === 0) {
                filteredData = [];
                displayResults = [];
            }

            await updateStockScreenerData();

            checkedItems = new Map(
                ruleOfList
                    ?.filter((rule) => checkedRules.includes(rule.name))
                    ?.map((rule) => [rule.name, new Set(rule.value)]),
            );

            // return something if you need to chain further
            return true;
        })();

        return toast?.promise(deletePromise, {
            loading: "Deleting screener…",
            success: "Screener deleted successfully!",
            error: "Delete failed. Please try again.",
            style: `
        border-radius: 5px;
        background: #fff;
        color: #000;
        border-color: ${$mode === "light" ? "#F9FAFB" : "#4B5563"};
        font-size: 15px;
      `,
        });
    }

    async function createStrategy(event) {
        event.preventDefault();

        const formData = new FormData(event.target);
        formData.append("user", data?.user?.id);
        formData.append("rules", "[]");
        let title = formData.get("title");

        if (!title || title.length === 0) {
            title = "My Screener";
        }

        if (title?.length > 100) {
            toast.error(
                "Title is too long. Please keep it under 100 characters.",
                {
                    style: `
        border-radius: 5px;
        background: #fff;
        color: #000;
        border-color: ${$mode === "light" ? "#F9FAFB" : "#4B5563"};
        font-size: 15px;
      `,
                },
            );
            return;
        }

        // build postData object
        const postData = { type: "stocksScreener" };
        for (const [key, value] of formData.entries()) {
            postData[key] = value;
        }

        // wrap the fetch + response check + state updates in a promise
        const createPromise = (async () => {
            const response = await fetch("/api/create-strategy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(postData),
            });

            if (!response.ok) {
                throw new Error(`Network error: ${response.status}`);
            }

            const output = await response.json();
            if (!output?.id) {
                throw new Error("Server did not return a new strategy ID");
            }

            // ——— SUCCESS: run your existing post-create logic ———
            toast.success("Screener created successfully!", {
                style: `
        border-radius: 5px;
        background: #fff;
        color: #000;
        border-color: ${$mode === "light" ? "#F9FAFB" : "#4B5563"};
        font-size: 15px;
      `,
            });

            // close modal
            const closePopup = document.getElementById("addStrategy");
            closePopup?.dispatchEvent(new MouseEvent("click"));

            selectedStrategy = output.id;
            strategyList?.unshift(output);
            selectedPopularStrategy = "";

            if (removeList) {
                removeList = false;
                ruleOfList = [];
            }

            // trigger a save without toasting again
            await handleSave(false);

            return output;
        })();

        // show loading / success / error around the whole operation
        return toast.promise(createPromise, {
            loading: "Creating screener…",
            success: () => "", // we already show success inside the promise
            error: "Something went wrong. Please try again later!",
            style: `
        border-radius: 5px;
        background: #fff;
        color: #000;
        border-color: ${$mode === "light" ? "#F9FAFB" : "#4B5563"};
        font-size: 15px;
      `,
        });
    }

    async function switchStrategy(item) {
        displayTableTab = "general";
        ruleName = "";
        selectedPopularStrategy = "";
        selectedStrategy = item?.id ?? "";

        ruleOfList =
            strategyList?.find((item) => item.id === selectedStrategy)?.rules ??
            [];

        ruleOfList.forEach((rule) => {
            ruleCondition[rule.name] =
                rule.condition || allRules[rule.name].defaultCondition;
            valueMappings[rule.name] =
                rule.value || allRules[rule.name].defaultValue;
        });

        if (ruleOfList?.length === 0) {
            filteredData = [];
            displayResults = [];
        }
        await updateStockScreenerData();
        checkedItems = new Map(
            ruleOfList
                ?.filter((rule) => checkedRules?.includes(rule.name)) // Only include specific rules
                ?.map((rule) => [rule.name, new Set(rule.value)]), // Create Map from filtered rules
        );
    }

    function changeRule(state: string) {
        if (
            !["Pro", "Plus"]?.includes(data?.user?.tier) &&
            onlySubscriberRules?.includes(state)
        ) {
            goto("/pricing");
        } else {
            selectedPopularStrategy = "";
            ruleName = state;
            handleAddRule();
        }
    }

    const handleMessage = (event) => {
        displayRules = allRows?.filter((row) =>
            ruleOfList?.some((rule) => rule.name === row.rule),
        );

        filteredData = event.data?.filteredData ?? [];
        displayResults = filteredData?.slice(0, 50);
    };

    const handleScreenerMessage = (event) => {
        stockScreenerData = event?.data?.stockScreenerData;
        shouldLoadWorker.set(true);
    };

    const updateStockScreenerData = async () => {
        downloadWorker.postMessage({
            ruleOfList: [...ruleOfList, ...otherTabRules],
        });
    };

    // Debounced hover handler
    const handleTabHover = (tabName) => {
        // Clear existing timeout
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
        }

        // Set new timeout for debouncing
        hoverTimeout = setTimeout(() => {
            preloadTabData(tabName);
        }, 50);
    };

    // Clear hover timeout
    const handleTabHoverLeave = () => {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
        }
    };

    // Quick search functions
    const updateQuickSearchResults = (searchQuery) => {
        if (!searchQuery || searchQuery.trim().length === 0) {
            quickSearchResults = [];
            showQuickSearchDropdown = false;
            return;
        }

        // Get currently selected rule names
        const selectedRuleNames = new Set(ruleOfList.map((rule) => rule.name));

        // Filter available rules that haven't been selected yet
        quickSearchResults = allRows
            .filter(
                (row) =>
                    !selectedRuleNames.has(row.rule) &&
                    row.label.toLowerCase().includes(searchQuery.toLowerCase()),
            )
            .slice(0, 8); // Limit to 8 results for better UX

        showQuickSearchDropdown = quickSearchResults.length > 0;
        selectedQuickSearchIndex = -1;
    };

    const handleQuickSearchInput = (event) => {
        quickSearchTerm = event.target.value;
        updateQuickSearchResults(quickSearchTerm);
    };

    const handleQuickSearchKeydown = (event) => {
        if (!showQuickSearchDropdown) return;

        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                selectedQuickSearchIndex = Math.min(
                    selectedQuickSearchIndex + 1,
                    quickSearchResults.length - 1,
                );
                break;
            case "ArrowUp":
                event.preventDefault();
                selectedQuickSearchIndex = Math.max(
                    selectedQuickSearchIndex - 1,
                    -1,
                );
                break;
            case "Enter":
                event.preventDefault();
                if (
                    selectedQuickSearchIndex >= 0 &&
                    quickSearchResults[selectedQuickSearchIndex]
                ) {
                    selectQuickSearchRule(
                        quickSearchResults[selectedQuickSearchIndex],
                    );
                }
                break;
            case "Escape":
                showQuickSearchDropdown = false;
                selectedQuickSearchIndex = -1;
                break;
        }
    };

    const selectQuickSearchRule = (rule) => {
        changeRule(rule.rule);
        quickSearchTerm = "";
        quickSearchResults = [];
        showQuickSearchDropdown = false;
        selectedQuickSearchIndex = -1;
    };

    // Reactive statement to update search results when ruleOfList changes
    $: if (quickSearchTerm) {
        updateQuickSearchResults(quickSearchTerm);
    }

    const closeQuickSearchDropdown = () => {
        setTimeout(() => {
            showQuickSearchDropdown = false;
            selectedQuickSearchIndex = -1;
        }, 150); // Small delay to allow click events
    };

    function handleAddRule() {
        if (ruleName === "") {
            toast.error("Please select a rule", {
                style: `border-radius: 5px; background: #fff; color: #000; border-color: ${$mode === "light" ? "#F9FAFB" : "#4B5563"}; font-size: 15px;`,
            });
            return;
        }

        // Clear preloaded data when rules change
        preloadedData.clear();

        let newRule;

        switch (ruleName) {
            case "analystRating":
            case "payoutFrequency":
            case "topAnalystRating":
            case "earningsTime":
            case "earningsDate":
            case "halalStocks":
            case "score":
            case "sector":
            case "industry":
            case "country":
            case "ema20":
            case "ema50":
            case "ema100":
            case "ema200":
            case "sma20":
            case "grahamNumber":
            case "sma50":
            case "sma100":
            case "sma200":
                newRule = {
                    name: ruleName,
                    value: Array.isArray(valueMappings[ruleName])
                        ? valueMappings[ruleName]
                        : [valueMappings[ruleName]],
                }; // Ensure value is an array
                break;
            default:
                newRule = {
                    name: ruleName,
                    condition: ruleCondition[ruleName],
                    value: valueMappings[ruleName],
                };
                break;
        }
        handleRule(newRule);
    }

    async function handleRule(newRule) {
        const existingRuleIndex = ruleOfList.findIndex(
            (rule) => rule.name === newRule.name,
        );

        if (existingRuleIndex !== -1) {
            const existingRule = ruleOfList[existingRuleIndex];
            if (existingRule.name === newRule.name) {
                // Remove the rule instead of showing an error
                ruleOfList.splice(existingRuleIndex, 1);
                ruleOfList = [...ruleOfList]; // Trigger reactivity
            } else {
                ruleOfList[existingRuleIndex] = newRule;
                ruleOfList = [...ruleOfList]; // Trigger reactivity
            }
        } else {
            ruleOfList = [...ruleOfList, newRule];

            await updateStockScreenerData();
        }
    }

    async function handleScroll() {
        const scrollThreshold = document.body.offsetHeight * 0.8; // 80% of the website height
        const isBottom = window.innerHeight + window.scrollY >= scrollThreshold;
        if (isBottom && displayResults?.length !== filteredData?.length) {
            const nextIndex = displayResults?.length;
            const filteredNewResults = filteredData?.slice(
                nextIndex,
                nextIndex + 30,
            );
            displayResults = [...displayResults, ...filteredNewResults];
        }
    }

    // Strategy block handlers for the new block-based UI
    function handleBuyConditionChange(event) {
        buyConditionBlocks = event.detail.blocks;
        // Convert blocks back to legacy format for compatibility
        buyConditions = convertBlocksToConditions(buyConditionBlocks);
    }

    function handleSellConditionChange(event) {
        sellConditionBlocks = event.detail.blocks;
        // Convert blocks back to legacy format for compatibility
        sellConditions = convertBlocksToConditions(sellConditionBlocks);
    }

    function convertBlocksToConditions(blocks) {
        return blocks.map((block) => ({
            indicator: block.indicator,
            operator: block.operator,
            value: block.value,
            logic: block.logicOperator
                ? block.logicOperator.toLowerCase()
                : undefined,
        }));
    }

    // Generate plain English explanations
    function generatePlainEnglishExplanation(blocks, mode) {
        if (!blocks || blocks.length === 0) {
            return `No ${mode} conditions set.`;
        }

        const conditionTexts = blocks.map((block, index) => {
            let text = "";

            // Get readable indicator name
            const indicatorName =
                availableIndicators[block.indicator]?.label || block.indicator;

            // Convert operator to readable text
            let operatorText = "";
            switch (block.operator) {
                case "above":
                    operatorText = "is above";
                    break;
                case "below":
                    operatorText = "is below";
                    break;
                case "equals":
                    operatorText = "equals";
                    break;
                default:
                    operatorText = block.operator;
            }

            text = `${indicatorName} ${operatorText} ${block.value}`;

            // Add logic connector for next condition
            if (block.logicOperator && index < blocks.length - 1) {
                text += ` ${block.logicOperator.toLowerCase()}`;
            }

            return text;
        });

        const action = mode === "buy" ? "Buy" : "Sell";
        return `${action} when ${conditionTexts.join(" ")}.`;
    }

    // Reactive statements for plain English explanations
    $: buyExplanation = generatePlainEnglishExplanation(
        buyConditionBlocks,
        "buy",
    );
    $: sellExplanation = generatePlainEnglishExplanation(
        sellConditionBlocks,
        "sell",
    );

    // Backtesting variables
    let backtestResults = null;
    let isBacktesting = false;
    let backtestError = null;
    let selectedTicker = "AAPL";
    let startDate = "2023-01-01";
    let endDate = "2024-01-01";
    let initialCapital = 100000;

    // Mock data for demonstration (replace with actual API call)
    const mockBacktestResults = {
        strategy: {
            name: "Custom Strategy",
            totalReturn: 15.2,
            annualReturn: 15.2,
            sharpeRatio: 1.35,
            maxDrawdown: -8.4,
            winRate: 65.2,
            totalTrades: 23,
            finalValue: 115200,
        },
        benchmark: {
            name: "SPY",
            totalReturn: 12.1,
            annualReturn: 12.1,
            sharpeRatio: 1.12,
            maxDrawdown: -12.3,
            finalValue: 112100,
        },
        performanceData: [
            { date: "2023-01-01", strategy: 100000, benchmark: 100000 },
            { date: "2023-02-01", strategy: 102500, benchmark: 101200 },
            { date: "2023-03-01", strategy: 98800, benchmark: 99800 },
            { date: "2023-04-01", strategy: 105200, benchmark: 103400 },
            { date: "2023-05-01", strategy: 108900, benchmark: 105600 },
            { date: "2023-06-01", strategy: 107300, benchmark: 104800 },
            { date: "2023-07-01", strategy: 111500, benchmark: 107200 },
            { date: "2023-08-01", strategy: 109200, benchmark: 108600 },
            { date: "2023-09-01", strategy: 113800, benchmark: 109900 },
            { date: "2023-10-01", strategy: 110400, benchmark: 107500 },
            { date: "2023-11-01", strategy: 116700, benchmark: 111800 },
            { date: "2023-12-01", strategy: 115200, benchmark: 112100 },
        ],
    };

    async function runBacktest() {
        if (
            buyConditionBlocks.length === 0 ||
            sellConditionBlocks.length === 0
        ) {
            backtestError =
                "Please set up both buy and sell conditions before running backtest";
            return;
        }

        isBacktesting = true;
        backtestError = null;

        try {
            // Simulate API call delay
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // For now, use mock data - replace with actual API call
            backtestResults = mockBacktestResults;
        } catch (error) {
            backtestError = "Failed to run backtest: " + error.message;
        } finally {
            isBacktesting = false;
        }
    }

    /*
const handleKeyDown = (event) => {
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault(); // prevent the browser's default save action
      handleSave();
    }
  };

*/

    let LoginPopup;

    onMount(async () => {
        groupedRules = groupScreenerRules(allRows);
    });

    async function handleSave(showMessage) {
        if (!data?.user) return;

        if (strategyList?.length === 0) {
            handleCreateStrategy();
        }

        if (strategyList?.length > 0) {
            // update local strategyList
            strategyList.find((item) => item.id === selectedStrategy).rules =
                ruleOfList;

            const postData = {
                strategyId: selectedStrategy,
                rules: ruleOfList,
                type: "stocksScreener",
            };

            const savePromise = (async () => {
                const response = await fetch("/api/save-strategy", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(postData),
                });
                if (!response.ok) {
                    throw new Error(`Server responded with ${response.status}`);
                }
                return response;
            })();

            if (showMessage) {
                return toast.promise(savePromise, {
                    loading: "Saving screener...",
                    success: "Screener saved!",
                    error: "Save failed. Please try again.",
                    style: `
            border-radius: 5px;
            background: #fff;
            color: #000;
            border-color: ${$mode === "light" ? "#F9FAFB" : "#4B5563"};
            font-size: 15px;
          `,
                });
            } else {
                // just await without toast
                await savePromise;
            }
        }
    }

    $: {
        if (ruleOfList) {
            const ruleToUpdate = ruleOfList?.find(
                (rule) => rule.name === ruleName,
            );
            if (ruleToUpdate) {
                ruleToUpdate.value = valueMappings[ruleToUpdate.name];
                ruleToUpdate.condition = ruleCondition[ruleToUpdate.name];
                ruleOfList = [...ruleOfList];
            }
            shouldLoadWorker.set(true);
        }
    }

    $: {
        if (searchTerm?.length > 0) {
            // Filter rows by search term
            const filteredRows = allRows?.filter((row) =>
                row?.label?.toLowerCase()?.includes(searchTerm?.toLowerCase()),
            );

            // Group the filtered rows by category
            filteredGroupedRules = groupScreenerRules(filteredRows);
        } else {
            // If no search term, return all rows grouped by category
            filteredGroupedRules = groupScreenerRules(allRows);
        }
    }

    $: charNumber = $screenWidth < 640 ? 20 : 40;

    function changeRuleCondition(name: string, state: string) {
        ruleName = name;
        const newState = state?.toLowerCase();

        // Initialize array for "between" condition
        if (newState === "between") {
            valueMappings[ruleName] = ["", ""];
        } else if (
            ruleCondition[ruleName] === "between" &&
            ["over", "under", "exactly"].includes(newState)
        ) {
            valueMappings[ruleName] = "any";
        }

        ruleCondition[ruleName] = newState;
    }

    let checkedItems = new Map(
        ruleOfList
            ?.filter((rule) => checkedRules?.includes(rule.name)) // Only include specific rules
            ?.map((rule) => [rule.name, new Set(rule.value)]), // Create Map from filtered rules
    );

    function isChecked(item, ruleName) {
        return (
            checkedItems?.has(ruleName) && checkedItems?.get(ruleName).has(item)
        );
    }

    // Utility function to convert values to comparable numbers
    function parseValue(val) {
        if (typeof val === "string") {
            // Handle percentage values
            if (val.endsWith("%")) {
                return parseFloat(val);
            }

            // Handle values with suffixes like K (thousand), M (million), B (billion)
            const suffixMap = {
                K: 1e3,
                M: 1e6,
                B: 1e9,
            };

            const suffix = val.slice(-1).toUpperCase();
            const numberPart = parseFloat(val);

            if (suffix in suffixMap) {
                return numberPart * suffixMap[suffix];
            }
        }

        return parseFloat(val);
    }

    // Custom sorting function
    function customSort(a, b) {
        return parseValue(a) - parseValue(b);
    }

    async function handleChangeValue(value, { shouldSort = true } = {}) {
        // Add this check at the beginning of the function
        if (ruleCondition[ruleName] === "between") {
            // Ensure valueMappings[ruleName] is always an array for "between" condition
            if (!Array.isArray(valueMappings[ruleName])) {
                valueMappings[ruleName] = ["", ""];
            }

            // If value is a single value (from input), update only the specified index
            if (!Array.isArray(value) && typeof currentIndex === "number") {
                valueMappings[ruleName][currentIndex] = value;
                value = valueMappings[ruleName];
            } else if (Array.isArray(value)) {
                // Only for preset ranges from dropdown
                valueMappings[ruleName] = value;
            }
        }

        if (checkedItems.has(ruleName)) {
            const itemsSet = checkedItems.get(ruleName);

            // Apply sorting only if shouldSort is true
            const sortedValue =
                shouldSort && Array.isArray(value)
                    ? value.sort(customSort)
                    : value;

            const valueKey = Array.isArray(sortedValue)
                ? sortedValue.join("-")
                : sortedValue;

            if (itemsSet?.has(valueKey)) {
                itemsSet?.delete(valueKey);
            } else {
                itemsSet?.add(valueKey);
            }
        } else {
            // Apply sorting only if shouldSort is true
            const sortedValue =
                shouldSort && Array.isArray(value)
                    ? value.sort(customSort)
                    : value;

            const valueKey = Array.isArray(sortedValue)
                ? sortedValue.join("-")
                : sortedValue;

            checkedItems?.set(ruleName, new Set([valueKey]));
        }

        if (checkedRules?.includes(ruleName)) {
            searchQuery = "";
            if (!Array.isArray(valueMappings[ruleName])) {
                valueMappings[ruleName] = [];
            }

            // Apply sorting only if shouldSort is true
            const sortedValue =
                shouldSort && Array?.isArray(value)
                    ? value?.sort(customSort)
                    : value;

            const valueKey = Array?.isArray(sortedValue)
                ? sortedValue.join("-")
                : sortedValue;

            const index = valueMappings[ruleName].indexOf(valueKey);
            if (index === -1) {
                valueMappings[ruleName].push(valueKey);
            } else {
                valueMappings[ruleName].splice(index, 1);
            }

            if (valueMappings[ruleName].length === 0) {
                valueMappings[ruleName] = "any";
            }

            await updateStockScreenerData();
        } else if (ruleName in valueMappings) {
            if (
                ruleCondition[ruleName] === "between" &&
                Array?.isArray(value)
            ) {
                // Apply sorting only if shouldSort is true
                valueMappings[ruleName] = shouldSort
                    ? value?.sort(customSort)
                    : value;
            } else {
                valueMappings[ruleName] = value;
            }
        } else {
            console.warn(`Unhandled rule: ${ruleName}`);
        }

        // Add this at the end of the function to ensure the filter is applied
        if (
            ruleCondition[ruleName] === "between" &&
            value.some((v) => v !== "")
        ) {
            await updateStockScreenerData();
        }
    }

    async function stepSizeValue(value, condition) {
        if (value === "any") {
            value = 0;
        }
        const match = value.toString().match(/^(-?[\d.]+)([KMB%]?)$/);
        if (!match) return value;

        let [_, number, suffix] = match;
        number = parseFloat(number);

        let step = 1;

        number += condition === "add" ? step : -step;

        // Round to 2 decimal places for consistency
        number = parseFloat(number?.toFixed(2));
        const newValue = suffix ? `${number}${suffix}` : Math?.round(number);
        await handleChangeValue(newValue);
    }

    let currentIndex = null;

    async function handleValueInput(event, ruleName, index = null) {
        const newValue = event.target.value;

        if (ruleCondition[ruleName] === "between") {
            // Ensure valueMappings[ruleName] is initialized as an array
            if (!Array.isArray(valueMappings[ruleName])) {
                valueMappings[ruleName] = ["", ""];
            }

            // Store the current index being modified
            currentIndex = index;

            if (newValue?.length === 0) {
                valueMappings[ruleName][index] = "";
            }

            await handleChangeValue(newValue, { shouldSort: false });

            // Reset currentIndex after handling the value
            currentIndex = null;
        } else {
            if (newValue?.length === 0) {
                const ruleIndex = ruleOfList?.findIndex(
                    (rule) => rule.name === ruleName,
                );
                if (ruleIndex !== -1) {
                    ruleOfList[ruleIndex].value = "any";
                }
            }
            await handleChangeValue(newValue);
        }
    }

    async function popularStrategy(state: string) {
        ruleOfList = [];
        const strategies = {
            dividendGrowth: {
                name: "Dividend Growth",
                rules: [
                    { condition: "over", name: "dividendGrowth", value: "5%" },
                    { condition: "over", name: "dividendYield", value: "1%" },
                    { condition: "under", name: "payoutRatio", value: "60%" },
                    { condition: "over", name: "growthRevenue", value: "5%" },
                ],
            },
            monthlyDividends: {
                name: "Monthly Dividends",
                rules: [
                    {
                        condition: "",
                        name: "payoutFrequency",
                        value: "Monthly",
                    },
                    { condition: "over", name: "dividendYield", value: "0%" },
                ],
            },
            topGainers1Y: {
                name: "Top Gainers 1Y",
                rules: [
                    { condition: "over", name: "change1Y", value: "50%" },
                    { condition: "over", name: "marketCap", value: "10B" },
                    { condition: "over", name: "eps", value: 5 },
                ],
            },
            topShortedStocks: {
                name: "Top Shorted Stocks",
                rules: [
                    {
                        condition: "over",
                        name: "shortFloatPercent",
                        value: "20%",
                    },
                    { condition: "over", name: "shortRatio", value: 1 },
                    {
                        condition: "over",
                        name: "shortOutstandingPercent",
                        value: "10%",
                    },
                    { condition: "over", name: "sharesShort", value: "20M" },
                    { condition: "over", name: "marketCap", value: "100M" },
                ],
            },

            momentumTAStocks: {
                name: "Momentum TA Stocks",
                rules: [
                    { condition: "under", name: "rsi", value: 40 },
                    { condition: "under", name: "stochRSI", value: 40 },
                    { condition: "over", name: "marketCap", value: "1B" },
                    { condition: "under", name: "mfi", value: 40 },
                ],
            },
            underValuedStocks: {
                name: "Undervalued Stocks",
                rules: [
                    {
                        condition: "between",
                        name: "marketCap",
                        value: ["100M", "500M"],
                    },
                    { condition: "over", name: "debtToEquityRatio", value: 1 },
                    {
                        condition: "under",
                        name: "priceToEarningsRatio",
                        value: 15,
                    },
                    {
                        condition: "under",
                        name: "priceToSalesRatio",
                        value: 1.5,
                    },
                    { condition: "under", name: "priceToBookRatio", value: 1 },
                    { condition: "over", name: "eps", value: 0 },
                ],
            },
            strongCashFlow: {
                // New Strategy Added
                name: "Strong Cash Flow",
                rules: [
                    { condition: "over", name: "marketCap", value: "300M" },
                    { condition: "over", name: "freeCashFlow", value: "100M" },
                    {
                        condition: "over",
                        name: "growthFreeCashFlow",
                        value: "10%",
                    },
                    {
                        condition: "over",
                        name: "operatingCashFlow",
                        value: "100M",
                    },
                    {
                        condition: "over",
                        name: "freeCashFlowMargin",
                        value: "10%",
                    },
                ],
            },
        };

        const strategy = strategies[state];
        if (strategy) {
            selectedPopularStrategy = strategy.name;
            ruleOfList = strategy?.rules;
            ruleOfList?.forEach((row) => {
                ruleName = row?.name;
                ruleCondition[ruleName] = row?.condition;
                handleChangeValue(row?.value);
            });

            await updateStockScreenerData();
        }
    }
</script>

<SEO
    title="Free Backtesting - Search, Filter and Analyze Stocks"
    description={`A free backtesting to search, filter and analyze stocks by ${allRows?.length} different indicators and metrics. The screener data is updated once per minute.`}
/>

<svelte:window on:scroll={handleScroll} />

<section
    class="w-full max-w-3xl sm:max-w-(--breakpoint-xl) overflow-hidden min-h-screen pb-40 px-5"
>
    <div class="text-sm sm:text-[1rem] breadcrumbs">
        <ul>
            <li><a href="/" class="text-muted dark:text-gray-300">Home</a></li>
            <li>
                <span class="text-muted dark:text-gray-300">Backtesting</span>
            </li>
        </ul>
    </div>

    <!--Start Build Strategy-->
    <div class="sm:rounded">
        <div class="flex flex-col md:flex-row items-start md:items-center mb-5">
            <div class="w-full flex flex-row items-center sm:mt-4">
                <h1 class=" text-3xl font-semibold">Backtesting</h1>
            </div>

            <div class="flex flex-row items-center w-full mt-5">
                <div
                    class="flex w-full sm:w-[50%] md:block md:w-auto sm:ml-auto"
                >
                    <div
                        class="hidden text-sm sm:text-[1rem] font-semibold md:block sm:mb-1"
                    >
                        Popular Screens
                    </div>
                    <div class="relative inline-block text-left grow">
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild let:builder>
                                <Button
                                    builders={[builder]}
                                    class="w-full  border-gray-300 dark:border-gray-800 border text-white bg-black sm:hover:bg-default dark:bg-default dark:sm:hover:bg-primary ease-out flex flex-row justify-between items-center px-3 py-2  rounded truncate"
                                >
                                    <span class="truncate"
                                        >{selectedPopularStrategy?.length !== 0
                                            ? selectedPopularStrategy
                                            : "Select popular"}</span
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
                                align="end"
                                sideOffset={10}
                                alignOffset={0}
                                class="w-56 h-fit max-h-72 overflow-y-auto scroller"
                            >
                                <DropdownMenu.Label
                                    class="text-muted dark:text-gray-400 font-normal"
                                >
                                    Popular Strategies
                                </DropdownMenu.Label>
                                <DropdownMenu.Separator />
                                <DropdownMenu.Group>
                                    {#each popularStrategyList as item}
                                        <DropdownMenu.Item
                                            on:click={() =>
                                                popularStrategy(item?.key)}
                                            class="cursor-pointer sm:hover:bg-gray-300 dark:sm:hover:bg-primary"
                                        >
                                            {item?.label}
                                        </DropdownMenu.Item>
                                    {/each}
                                </DropdownMenu.Group>
                            </DropdownMenu.Content>
                        </DropdownMenu.Root>
                    </div>
                </div>

                <div
                    class="flex w-full sm:w-[50%] sm:ml-3 md:block md:w-auto ml-3"
                >
                    <div
                        class="hidden text-sm sm:text-[1rem] font-semibold md:block sm:mb-1"
                    >
                        Saved Screens
                    </div>
                    <div class="relative inline-block text-left grow">
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild let:builder>
                                <Button
                                    builders={[builder]}
                                    class="min-w-[110px]  w-full border-gray-300 dark:border-gray-800 border text-white bg-black sm:hover:bg-default dark:bg-default  dark:sm:hover:bg-primary ease-out flex flex-row justify-between items-center px-3 py-2  rounded truncate"
                                >
                                    <span class="truncate max-w-48"
                                        >{selectedStrategy?.length !== 0
                                            ? strategyList?.find(
                                                  (item) =>
                                                      item.id ===
                                                      selectedStrategy,
                                              )?.title
                                            : "Select screen"}</span
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
                                align="end"
                                sideOffset={10}
                                alignOffset={0}
                                class="w-full max-w-56 h-fit max-h-72 overflow-y-auto scroller"
                            >
                                <DropdownMenu.Label
                                    class="text-muted dark:text-gray-400 font-normal"
                                >
                                    <DropdownMenu.Trigger asChild let:builder>
                                        <Button
                                            on:click={() => {
                                                removeList = true;
                                                handleCreateStrategy();
                                            }}
                                            builders={[builder]}
                                            class="p-0 -mb-2 -mt-2 text-sm inline-flex cursor-pointer items-center justify-center space-x-1 whitespace-nowrap   bg-[#0909B] focus:outline-hidden "
                                        >
                                            <svg
                                                class="h-4 w-4"
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
                                                New Screen
                                            </div>
                                        </Button>
                                    </DropdownMenu.Trigger>
                                </DropdownMenu.Label>
                                <DropdownMenu.Separator />
                                <DropdownMenu.Group>
                                    {#each strategyList as item}
                                        <DropdownMenu.Item
                                            on:click={(e) => {
                                                e.preventDefault();
                                                switchStrategy(item);
                                            }}
                                            class=" {item?.id ===
                                            selectedStrategy
                                                ? 'bg-gray-300 dark:bg-primary'
                                                : ''} cursor-pointer sm:hover:bg-gray-300 dark:sm:hover:bg-primary"
                                        >
                                            {item?.title?.length > 20
                                                ? item?.title?.slice(0, 20) +
                                                  "..."
                                                : item?.title} ({item?.rules
                                                ?.length})

                                            <label
                                                for="deleteStrategy"
                                                class="ml-auto inline-block cursor-pointer sm:hover:text-red-500"
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
                </div>
            </div>
        </div>

        <!--End Adding Rules-->
    </div>

    <!-- Strategy Configuration Tabs -->
    <div
        class="mt-8 bg-white dark:bg-default rounded shadow-lg border border-gray-300 dark:border-gray-800 overflow-hidden"
    >
        <!-- Tab Header with Enhanced Design -->
        <div class="border-b border-gray-300 dark:border-gray-800">
            <div class="flex items-center justify-between px-6 py-4">
                <h2
                    class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"
                >
                    Strategy Builder
                </h2>
            </div>
        </div>

        <Tabs.Root bind:value={activeTab} class="w-full">
            <!-- Enhanced Tab List -->
            <div
                class="flex border-b border-gray-300 dark:border-gray-800 bg-gray-50 dark:bg-default"
            >
                <button
                    class="flex-1 px-6 py-4 text-sm sm:text-[1rem] font-medium border-b-2 {activeTab ===
                    'buy'
                        ? 'bg-default  dark:bg-white text-white dark:text-muted'
                        : '   '}"
                    on:click={() => (activeTab = "buy")}
                >
                    <div class="flex items-center justify-center gap-2">
                        <svg
                            class="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                            />
                        </svg>
                        Buy Conditions
                    </div>
                </button>

                <button
                    class="flex-1 px-6 py-4 text-sm sm:text-[1rem] font-medium border-b-2 {activeTab ===
                    'sell'
                        ? 'bg-default  dark:bg-white text-white dark:text-muted'
                        : '   '}"
                    on:click={() => (activeTab = "sell")}
                >
                    <div class="flex items-center justify-center gap-2">
                        <svg
                            class="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                            />
                        </svg>
                        Sell Conditions
                    </div>
                </button>

                <button
                    class="flex-1 px-6 py-4 text-sm sm:text-[1rem] font-medium border-b-2 {activeTab ===
                    'risk'
                        ? 'bg-default  dark:bg-white text-white dark:text-muted'
                        : '   '}"
                    on:click={() => (activeTab = "risk")}
                >
                    <div class="flex items-center justify-center gap-2">
                        <svg
                            class="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                            />
                        </svg>
                        Risk Management
                    </div>
                </button>

                <button
                    class="flex-1 px-6 py-4 text-sm sm:text-[1rem] font-medium border-b-2 {activeTab ===
                    'backtest'
                        ? 'bg-default  dark:bg-white text-white dark:text-muted'
                        : '   '}"
                    on:click={() => (activeTab = "backtest")}
                >
                    <div class="flex items-center justify-center gap-2">
                        <svg
                            class="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                        </svg>
                        Backtesting
                    </div>
                </button>
            </div>

            <!-- Tab Content with Enhanced Styling -->
            <div class="p-6">
                <!-- Buy Conditions Tab Content -->
                <Tabs.Content value="buy" class="outline-none">
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3
                                    class="text-lg font-semibold text-green-700 dark:text-green-400"
                                >
                                    Buy Signal Conditions
                                </h3>
                                <p
                                    class="text-sm text-gray-600 dark:text-gray-400 mt-1"
                                >
                                    Define when to enter long positions
                                </p>
                            </div>
                        </div>
                        <StrategyBuilder
                            bind:strategyBlocks={buyConditionBlocks}
                            {availableIndicators}
                            mode="buy"
                            on:change={handleBuyConditionChange}
                        />
                    </div>
                </Tabs.Content>

                <!-- Sell Conditions Tab Content -->
                <Tabs.Content value="sell" class="outline-none">
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3
                                    class="text-lg font-semibold text-red-700 dark:text-red-400"
                                >
                                    Sell Signal Conditions
                                </h3>
                                <p
                                    class="text-sm text-gray-600 dark:text-gray-400 mt-1"
                                >
                                    Define when to exit positions
                                </p>
                            </div>
                        </div>
                        <StrategyBuilder
                            bind:strategyBlocks={sellConditionBlocks}
                            {availableIndicators}
                            mode="sell"
                            on:change={handleSellConditionChange}
                        />
                    </div>
                </Tabs.Content>

                <!-- Risk Management Tab Content -->
                <Tabs.Content value="risk" class="outline-none">
                    <div class="space-y-6">
                        <div>
                            <h3
                                class="text-lg font-semibold text-purple-700 dark:text-purple-400 mb-2"
                            >
                                Risk Management Settings
                            </h3>
                            <p class="text-sm text-gray-600 dark:text-gray-400">
                                Configure position sizing and risk controls
                            </p>
                        </div>

                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <!-- Stop Loss Card -->
                            <div
                                class="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/10 rounded-xl p-6 border border-red-200 dark:border-red-800/30"
                            >
                                <div
                                    class="flex items-center justify-between mb-4"
                                >
                                    <div class="flex items-center gap-2">
                                        <div
                                            class="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg"
                                        >
                                            <svg
                                                class="w-5 h-5 text-red-600 dark:text-red-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                                                />
                                            </svg>
                                        </div>
                                        <h4
                                            class="font-semibold text-red-700 dark:text-red-400"
                                        >
                                            Stop Loss
                                        </h4>
                                    </div>
                                    <label
                                        class="relative inline-flex items-center cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            bind:checked={
                                                riskManagement.stopLoss.enabled
                                            }
                                            class="sr-only peer"
                                        />
                                        <div
                                            class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after: dark:border-gray-800 peer-checked:bg-red-500"
                                        ></div>
                                    </label>
                                </div>
                                {#if riskManagement.stopLoss.enabled}
                                    <div class="space-y-3">
                                        <select
                                            bind:value={
                                                riskManagement.stopLoss.type
                                            }
                                            class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                                        >
                                            <option value="percentage"
                                                >Percentage Loss</option
                                            >
                                            <option value="fixed"
                                                >Fixed Amount</option
                                            >
                                            <option value="atr"
                                                >ATR Multiple</option
                                            >
                                        </select>
                                        <div
                                            class="flex items-center space-x-2"
                                        >
                                            <input
                                                type="number"
                                                bind:value={
                                                    riskManagement.stopLoss
                                                        .value
                                                }
                                                min="0"
                                                step="0.1"
                                                class="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                                                placeholder="Enter value"
                                            />
                                            <span
                                                class="px-3 py-2 bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium min-w-[40px] text-center"
                                            >
                                                {riskManagement.stopLoss
                                                    .type === "percentage"
                                                    ? "%"
                                                    : riskManagement.stopLoss
                                                            .type === "atr"
                                                      ? "×"
                                                      : "$"}
                                            </span>
                                        </div>
                                    </div>
                                {/if}
                            </div>

                            <!-- Take Profit Card -->
                            <div
                                class="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10 rounded-xl p-6 border border-green-200 dark:border-green-800/30"
                            >
                                <div
                                    class="flex items-center justify-between mb-4"
                                >
                                    <div class="flex items-center gap-2">
                                        <div
                                            class="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg"
                                        >
                                            <svg
                                                class="w-5 h-5 text-green-600 dark:text-green-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                                                />
                                            </svg>
                                        </div>
                                        <h4
                                            class="font-semibold text-green-700 dark:text-green-400"
                                        >
                                            Take Profit
                                        </h4>
                                    </div>
                                    <label
                                        class="relative inline-flex items-center cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            bind:checked={
                                                riskManagement.takeProfit
                                                    .enabled
                                            }
                                            class="sr-only peer"
                                        />
                                        <div
                                            class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after: dark:border-gray-800 peer-checked:bg-green-500"
                                        ></div>
                                    </label>
                                </div>
                                {#if riskManagement.takeProfit.enabled}
                                    <div class="space-y-3">
                                        <select
                                            bind:value={
                                                riskManagement.takeProfit.type
                                            }
                                            class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                        >
                                            <option value="percentage"
                                                >Percentage Gain</option
                                            >
                                            <option value="fixed"
                                                >Fixed Amount</option
                                            >
                                            <option value="riskReward"
                                                >Risk/Reward Ratio</option
                                            >
                                        </select>
                                        <div
                                            class="flex items-center space-x-2"
                                        >
                                            <input
                                                type="number"
                                                bind:value={
                                                    riskManagement.takeProfit
                                                        .value
                                                }
                                                min="0"
                                                step="0.1"
                                                class="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                                placeholder="Enter value"
                                            />
                                            <span
                                                class="px-3 py-2 bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium min-w-[40px] text-center"
                                            >
                                                {riskManagement.takeProfit
                                                    .type === "percentage"
                                                    ? "%"
                                                    : riskManagement.takeProfit
                                                            .type ===
                                                        "riskReward"
                                                      ? ":1"
                                                      : "$"}
                                            </span>
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        </div>

                        <!-- Position Sizing Card -->
                        <div
                            class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 rounded-xl p-6 border border-blue-200 dark:border-blue-800/30"
                        >
                            <div class="flex items-center gap-2 mb-4">
                                <div
                                    class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"
                                >
                                    <svg
                                        class="w-5 h-5 text-blue-600 dark:text-blue-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                </div>
                                <h4
                                    class="font-semibold text-blue-700 dark:text-blue-400"
                                >
                                    Position Sizing
                                </h4>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="space-y-2">
                                    <label
                                        class="block text-sm font-medium text-blue-700 dark:text-blue-400"
                                        >Sizing Method</label
                                    >
                                    <select
                                        bind:value={
                                            riskManagement.positionSize.type
                                        }
                                        class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    >
                                        <option value="fixed"
                                            >Fixed Amount</option
                                        >
                                        <option value="percentage"
                                            >% of Portfolio</option
                                        >
                                        <option value="kellycriterion"
                                            >Kelly Criterion</option
                                        >
                                        <option value="riskbased"
                                            >Risk-Based</option
                                        >
                                    </select>
                                </div>
                                <div class="space-y-2">
                                    <label
                                        class="block text-sm font-medium text-blue-700 dark:text-blue-400"
                                        >Value</label
                                    >
                                    <div class="flex items-center space-x-2">
                                        <input
                                            type="number"
                                            bind:value={
                                                riskManagement.positionSize
                                                    .value
                                            }
                                            min="0"
                                            step="0.1"
                                            class="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            placeholder="Enter amount"
                                        />
                                        <span
                                            class="px-3 py-2 bg-blue-100 dark:bg-blue-800/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-medium min-w-[40px] text-center"
                                        >
                                            {riskManagement.positionSize
                                                .type === "percentage" ||
                                            riskManagement.positionSize.type ===
                                                "riskbased"
                                                ? "%"
                                                : "$"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Tabs.Content>

                <!-- Backtesting Tab Content -->
                <Tabs.Content value="backtest" class="outline-none">
                    <div class="space-y-6">
                        <div>
                            <h3
                                class="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-2"
                            >
                                Backtest Your Strategy
                            </h3>
                            <p class="text-sm text-gray-600 dark:text-gray-400">
                                Test your strategy against historical data
                            </p>
                        </div>

                        <!-- Backtest Configuration -->
                        <div
                            class="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-300 dark:border-gray-800"
                        >
                            <h4
                                class="font-semibold text-gray-900 dark:text-white mb-4"
                            >
                                Configuration
                            </h4>
                            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label
                                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                                        >Ticker Symbol</label
                                    >
                                    <input
                                        type="text"
                                        bind:value={selectedTicker}
                                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm uppercase"
                                        placeholder="AAPL"
                                    />
                                </div>
                                <div>
                                    <label
                                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                                        >Start Date</label
                                    >
                                    <input
                                        type="date"
                                        bind:value={startDate}
                                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>
                                <div>
                                    <label
                                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                                        >End Date</label
                                    >
                                    <input
                                        type="date"
                                        bind:value={endDate}
                                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>
                                <div>
                                    <label
                                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                                        >Initial Capital</label
                                    >
                                    <input
                                        type="number"
                                        bind:value={initialCapital}
                                        min="1000"
                                        step="1000"
                                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>
                            </div>
                            <div class="mt-4">
                                <button
                                    on:click={runBacktest}
                                    disabled={isBacktesting}
                                    class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
                                >
                                    {#if isBacktesting}
                                        <svg
                                            class="w-4 h-4 animate-spin"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                            />
                                        </svg>
                                        Running Backtest...
                                    {:else}
                                        <svg
                                            class="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M13 10V3L4 14h7v7l9-11h-7z"
                                            />
                                        </svg>
                                        Run Backtest
                                    {/if}
                                </button>
                            </div>
                        </div>

                        <!-- Error Display -->
                        {#if backtestError}
                            <div
                                class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
                            >
                                <div class="flex items-start gap-3">
                                    <svg
                                        class="w-5 h-5 text-red-500 mt-0.5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    <p
                                        class="text-red-700 dark:text-red-400 text-sm"
                                    >
                                        {backtestError}
                                    </p>
                                </div>
                            </div>
                        {/if}

                        <!-- Results Display -->
                        {#if backtestResults}
                            <!-- Performance Summary Cards -->
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <!-- Strategy Performance -->
                                <div
                                    class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 rounded-xl p-6 border border-blue-200 dark:border-blue-800/30"
                                >
                                    <div
                                        class="flex items-center justify-between mb-4"
                                    >
                                        <h4
                                            class="font-semibold text-blue-700 dark:text-blue-400"
                                        >
                                            Your Strategy
                                        </h4>
                                        <div
                                            class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"
                                        >
                                            <svg
                                                class="w-4 h-4 text-blue-600 dark:text-blue-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                                                />
                                            </svg>
                                        </div>
                                    </div>
                                    <div class="space-y-3">
                                        <div
                                            class="flex justify-between items-center"
                                        >
                                            <span
                                                class="text-sm text-blue-600 dark:text-blue-300"
                                                >Total Return</span
                                            >
                                            <span
                                                class="font-semibold text-blue-700 dark:text-blue-400"
                                                >{backtestResults.strategy
                                                    .totalReturn}%</span
                                            >
                                        </div>
                                        <div
                                            class="flex justify-between items-center"
                                        >
                                            <span
                                                class="text-sm text-blue-600 dark:text-blue-300"
                                                >Sharpe Ratio</span
                                            >
                                            <span
                                                class="font-semibold text-blue-700 dark:text-blue-400"
                                                >{backtestResults.strategy
                                                    .sharpeRatio}</span
                                            >
                                        </div>
                                        <div
                                            class="flex justify-between items-center"
                                        >
                                            <span
                                                class="text-sm text-blue-600 dark:text-blue-300"
                                                >Max Drawdown</span
                                            >
                                            <span
                                                class="font-semibold text-red-600 dark:text-red-400"
                                                >{backtestResults.strategy
                                                    .maxDrawdown}%</span
                                            >
                                        </div>
                                        <div
                                            class="flex justify-between items-center"
                                        >
                                            <span
                                                class="text-sm text-blue-600 dark:text-blue-300"
                                                >Win Rate</span
                                            >
                                            <span
                                                class="font-semibold text-blue-700 dark:text-blue-400"
                                                >{backtestResults.strategy
                                                    .winRate}%</span
                                            >
                                        </div>
                                    </div>
                                </div>

                                <!-- Benchmark Performance -->
                                <div
                                    class="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/30 rounded-xl p-6 border border-gray-300 dark:border-gray-800"
                                >
                                    <div
                                        class="flex items-center justify-between mb-4"
                                    >
                                        <h4
                                            class="font-semibold text-gray-700 dark:text-gray-300"
                                        >
                                            SPY Benchmark
                                        </h4>
                                        <div
                                            class="p-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg"
                                        >
                                            <svg
                                                class="w-4 h-4 text-gray-600 dark:text-gray-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                                                />
                                            </svg>
                                        </div>
                                    </div>
                                    <div class="space-y-3">
                                        <div
                                            class="flex justify-between items-center"
                                        >
                                            <span
                                                class="text-sm text-gray-600 dark:text-gray-400"
                                                >Total Return</span
                                            >
                                            <span
                                                class="font-semibold text-gray-700 dark:text-gray-300"
                                                >{backtestResults.benchmark
                                                    .totalReturn}%</span
                                            >
                                        </div>
                                        <div
                                            class="flex justify-between items-center"
                                        >
                                            <span
                                                class="text-sm text-gray-600 dark:text-gray-400"
                                                >Sharpe Ratio</span
                                            >
                                            <span
                                                class="font-semibold text-gray-700 dark:text-gray-300"
                                                >{backtestResults.benchmark
                                                    .sharpeRatio}</span
                                            >
                                        </div>
                                        <div
                                            class="flex justify-between items-center"
                                        >
                                            <span
                                                class="text-sm text-gray-600 dark:text-gray-400"
                                                >Max Drawdown</span
                                            >
                                            <span
                                                class="font-semibold text-red-600 dark:text-red-400"
                                                >{backtestResults.benchmark
                                                    .maxDrawdown}%</span
                                            >
                                        </div>
                                        <div
                                            class="flex justify-between items-center"
                                        >
                                            <span
                                                class="text-sm text-gray-600 dark:text-gray-400"
                                                >Final Value</span
                                            >
                                            <span
                                                class="font-semibold text-gray-700 dark:text-gray-300"
                                                >${backtestResults.benchmark.finalValue.toLocaleString()}</span
                                            >
                                        </div>
                                    </div>
                                </div>

                                <!-- Alpha/Outperformance -->
                                <div
                                    class="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10 rounded-xl p-6 border border-green-200 dark:border-green-800/30"
                                >
                                    <div
                                        class="flex items-center justify-between mb-4"
                                    >
                                        <h4
                                            class="font-semibold text-green-700 dark:text-green-400"
                                        >
                                            Outperformance
                                        </h4>
                                        <div
                                            class="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg"
                                        >
                                            <svg
                                                class="w-4 h-4 text-green-600 dark:text-green-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                                                />
                                            </svg>
                                        </div>
                                    </div>
                                    <div class="space-y-3">
                                        <div
                                            class="flex justify-between items-center"
                                        >
                                            <span
                                                class="text-sm text-green-600 dark:text-green-300"
                                                >Alpha</span
                                            >
                                            <span
                                                class="font-semibold text-green-700 dark:text-green-400"
                                                >+{(
                                                    backtestResults.strategy
                                                        .totalReturn -
                                                    backtestResults.benchmark
                                                        .totalReturn
                                                ).toFixed(1)}%</span
                                            >
                                        </div>
                                        <div
                                            class="flex justify-between items-center"
                                        >
                                            <span
                                                class="text-sm text-green-600 dark:text-green-300"
                                                >Total Trades</span
                                            >
                                            <span
                                                class="font-semibold text-green-700 dark:text-green-400"
                                                >{backtestResults.strategy
                                                    .totalTrades}</span
                                            >
                                        </div>
                                        <div
                                            class="flex justify-between items-center"
                                        >
                                            <span
                                                class="text-sm text-green-600 dark:text-green-300"
                                                >Final Value</span
                                            >
                                            <span
                                                class="font-semibold text-green-700 dark:text-green-400"
                                                >${backtestResults.strategy.finalValue.toLocaleString()}</span
                                            >
                                        </div>
                                        <div
                                            class="flex justify-between items-center"
                                        >
                                            <span
                                                class="text-sm text-green-600 dark:text-green-300"
                                                >Profit</span
                                            >
                                            <span
                                                class="font-semibold text-green-700 dark:text-green-400"
                                                >+${(
                                                    backtestResults.strategy
                                                        .finalValue -
                                                    backtestResults.benchmark
                                                        .finalValue
                                                ).toLocaleString()}</span
                                            >
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Performance Chart -->
                            <div
                                class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-300 dark:border-gray-800"
                            >
                                <div
                                    class="flex items-center justify-between mb-6"
                                >
                                    <h4
                                        class="font-semibold text-gray-900 dark:text-white"
                                    >
                                        Cumulative Returns
                                    </h4>
                                    <div
                                        class="flex items-center gap-4 text-sm"
                                    >
                                        <div class="flex items-center gap-2">
                                            <div
                                                class="w-3 h-3 bg-blue-500 rounded-full"
                                            ></div>
                                            <span
                                                class="text-gray-600 dark:text-gray-400"
                                                >Your Strategy</span
                                            >
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <div
                                                class="w-3 h-3 bg-gray-400 rounded-full"
                                            ></div>
                                            <span
                                                class="text-gray-600 dark:text-gray-400"
                                                >SPY Benchmark</span
                                            >
                                        </div>
                                    </div>
                                </div>

                                <!-- Simplified Chart Display -->
                                <div
                                    class="h-64 bg-gray-50 dark:bg-gray-900/50 rounded-lg flex items-center justify-center border border-gray-300 dark:border-gray-800"
                                >
                                    <div class="text-center dark:text-gray-400">
                                        <svg
                                            class="w-16 h-16 mx-auto mb-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                            />
                                        </svg>
                                        <p class="text-lg font-medium mb-2">
                                            Performance Chart
                                        </p>
                                        <p class="text-sm">
                                            Chart showing strategy vs SPY
                                            benchmark over time
                                        </p>
                                        <p class="text-xs mt-2">
                                            Strategy Return: <span
                                                class="text-blue-600 font-semibold"
                                                >{backtestResults.strategy
                                                    .totalReturn}%</span
                                            >
                                            | SPY Return:
                                            <span
                                                class="text-gray-600 font-semibold"
                                                >{backtestResults.benchmark
                                                    .totalReturn}%</span
                                            >
                                        </p>
                                    </div>
                                </div>
                            </div>
                        {/if}
                    </div>
                </Tabs.Content>
            </div>

            <!-- Strategy Summary in Plain English -->
            <div class="px-6 pb-6">
                <div
                    class="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-indigo-200 dark:border-indigo-800/30"
                >
                    <div class="flex items-start gap-3">
                        <div
                            class="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex-shrink-0"
                        >
                            <svg
                                class="w-5 h-5 text-indigo-600 dark:text-indigo-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                        <div class="flex-1">
                            <h4
                                class="font-semibold text-indigo-700 dark:text-indigo-400 mb-2"
                            >
                                Strategy Summary
                            </h4>
                            <div class="space-y-2 text-sm">
                                <div class="flex items-start gap-2">
                                    <span
                                        class="inline-block w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"
                                    ></span>
                                    <span
                                        class="text-gray-700 dark:text-gray-300"
                                        >{buyExplanation}</span
                                    >
                                </div>
                                <div class="flex items-start gap-2">
                                    <span
                                        class="inline-block w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"
                                    ></span>
                                    <span
                                        class="text-gray-700 dark:text-gray-300"
                                        >{sellExplanation}</span
                                    >
                                </div>
                                {#if riskManagement.stopLoss.enabled || riskManagement.takeProfit.enabled}
                                    <div class="flex items-start gap-2 pt-1">
                                        <span
                                            class="inline-block w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"
                                        ></span>
                                        <span
                                            class="text-gray-700 dark:text-gray-300"
                                        >
                                            Risk controls:
                                            {#if riskManagement.stopLoss.enabled}
                                                Stop loss at {riskManagement
                                                    .stopLoss
                                                    .value}{riskManagement
                                                    .stopLoss.type ===
                                                "percentage"
                                                    ? "%"
                                                    : riskManagement.stopLoss
                                                            .type === "atr"
                                                      ? "× ATR"
                                                      : "$"}
                                            {/if}
                                            {#if riskManagement.stopLoss.enabled && riskManagement.takeProfit.enabled},
                                            {/if}
                                            {#if riskManagement.takeProfit.enabled}
                                                Take profit at {riskManagement
                                                    .takeProfit
                                                    .value}{riskManagement
                                                    .takeProfit.type ===
                                                "percentage"
                                                    ? "%"
                                                    : riskManagement.takeProfit
                                                            .type ===
                                                        "riskReward"
                                                      ? ":1 ratio"
                                                      : "$"}
                                            {/if}.
                                        </span>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Tabs.Root>
    </div>

    <!--End Build Strategy-->

    <!--End Matching Preview-->
</section>

<!--
  <div class="tabs w-screen mb-5 ">
    <label on:click={() => handleRuleTab('all')} class="tab mr-2   transition duration-150 ease-out hover:ease-out rounded hover:bg-[#333333] {displayTab === 'all' ? 'bg-[#333333]' : ''}">
      All
    </label> 
    <label on:click={() => handleRuleTab('ta')} class="tab mr-2   transition duration-150 ease-out hover:ease-out rounded hover:bg-[#333333] {displayTab === 'ta' ? 'bg-[#333333]' : ''}">
      Technical Indicators
    </label> 
    <label on:click={() => handleRuleTab('fund')} class="tab mr-2   transition duration-150 ease-out hover:ease-out rounded hover:bg-[#333333] {displayTab === 'fund' ? 'bg-[#333333]' : ''}">
      Fundamental Data
    </label> 
  </div>
-->

<!--Start Login Modal-->
{#if LoginPopup}
    <LoginPopup {form} />
{/if}

<!--End Login Modal-->

<style>
    .scroller {
        scrollbar-width: thin;
    }

    .scrollbar {
        display: grid;
        grid-gap: 90px;
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
        grid-auto-flow: column;
        overflow-x: auto;
        scrollbar-width: thin; /* Hide the default scrollbar in Firefox */
        scrollbar-color: transparent transparent; /* Hide the default scrollbar in Firefox */
    }

    /* Custom scrollbar for Webkit (Chrome, Safari) */
    .scrollbar::-webkit-scrollbar {
        width: 0; /* Hide the width of the scrollbar */
        height: 0; /* Hide the height of the scrollbar */
    }

    .scrollbar::-webkit-scrollbar-thumb {
        background: transparent; /* Make the thumb transparent */
    }
</style>
