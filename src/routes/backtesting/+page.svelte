<script lang="ts">
    import { toast } from "svelte-sonner";
    import { mode } from "mode-watcher";

    import * as DropdownMenu from "$lib/components/shadcn/dropdown-menu/index.js";
    import { Button } from "$lib/components/shadcn/button/index.js";
    import * as Tabs from "$lib/components/shadcn/tabs/index.js";

    import SEO from "$lib/components/SEO.svelte";
    import StrategyBuilder from "$lib/components/StrategyBuilder.svelte";
    import { onMount } from "svelte";
    import highcharts from "$lib/highcharts.ts";

    export let data;
    export let form;

    let config = null;
    let activeTab = "buy";
    const popularStrategyList = [
        { key: "rsiOversold", label: "RSI Oversold" },
        { key: "macdBullish", label: "MACD Bullish Crossover" },
        { key: "goldenCross", label: "Golden Cross (50/200 SMA)" },

        { key: "movingAverageBounce", label: "Moving Average Bounce" },
    ];

    // Strategy definitions for popular strategies
    const strategyDefinitions = {
        rsiOversold: {
            buy: [
                {
                    indicator: "rsi",
                    operator: "below",
                    value: 30,
                    logicOperator: null,
                },
            ],
            sell: [
                {
                    indicator: "rsi",
                    operator: "above",
                    value: 70,
                    logicOperator: null,
                },
            ],
        },
        macdBullish: {
            buy: [
                {
                    indicator: "macd",
                    operator: "above",
                    value: "macd_signal",
                    logicOperator: "AND",
                },
                {
                    indicator: "macd",
                    operator: "above",
                    value: 0,
                    logicOperator: null,
                },
            ],
            sell: [
                {
                    indicator: "macd",
                    operator: "below",
                    value: "macd_signal",
                    logicOperator: null,
                },
            ],
        },

        goldenCross: {
            buy: [
                {
                    indicator: "sma_50",
                    operator: "above",
                    value: "sma_200",
                    logicOperator: "AND",
                },
                {
                    indicator: "price",
                    operator: "above",
                    value: "sma_50",
                    logicOperator: null,
                },
            ],
            sell: [
                {
                    indicator: "sma_50",
                    operator: "below",
                    value: "sma_200",
                    logicOperator: null,
                },
            ],
        },

        movingAverageBounce: {
            buy: [
                {
                    indicator: "price",
                    operator: "above",
                    value: "sma_20",
                    logicOperator: "AND",
                },
                {
                    indicator: "sma_20",
                    operator: "above",
                    value: "sma_50",
                    logicOperator: "AND",
                },
                {
                    indicator: "rsi",
                    operator: "above",
                    value: 50,
                    logicOperator: null,
                },
            ],
            sell: [
                {
                    indicator: "price",
                    operator: "below",
                    value: "sma_20",
                    logicOperator: "OR",
                },
                {
                    indicator: "rsi",
                    operator: "below",
                    value: 30,
                    logicOperator: null,
                },
            ],
        },
    };

    // Function to handle popular strategy selection
    function handleStrategySelection(strategyKey) {
        const strategy = strategyDefinitions[strategyKey];
        if (strategy) {
            // Generate unique IDs for each condition
            buyConditionBlocks = strategy.buy.map((condition, index) => ({
                ...condition,
                id: `block_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
                type: "condition",
            }));

            sellConditionBlocks = strategy.sell.map((condition, index) => ({
                ...condition,
                id: `block_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
                type: "condition",
            }));

            // Also update the buyConditions and sellConditions for backward compatibility
            buyConditions = buyConditionBlocks;
            sellConditions = sellConditionBlocks;
        }
    }

    // Buy conditions
    let buyConditions = [];

    // Sell conditions
    let sellConditions = [];

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

    // Backtesting parameters
    let selectedTickers = ["AAPL"];
    let startDate = "2020-01-01";
    let endDate = new Date().toISOString().split("T")[0];

    // Strategy data collection - this is the main object you requested
    let strategyData = {};

    // Function to collect and format all strategy data
    function updateStrategyData() {
        strategyData = {
            tickers: selectedTickers,
            start_date: startDate,
            end_date: endDate,
            buy_condition: formatConditionsForBacktesting(buyConditions),
            sell_condition: formatConditionsForBacktesting(sellConditions),
            initial_capital: initialCapital,
        };
    }

    // Convert conditions to backtesting format
    function formatConditionsForBacktesting(conditions) {
        return conditions.map((condition, index) => {
            const formattedCondition = {
                name: condition.indicator,
                value: condition.value,
                operator: condition.operator,
            };

            // For moving averages comparing to other indicators, we need special handling
            if (
                condition.indicator === "sma_20" ||
                condition.indicator === "sma_50" ||
                condition.indicator === "sma_100" ||
                condition.indicator === "sma_200" ||
                condition.indicator === "ema_20" ||
                condition.indicator === "ema_50" ||
                condition.indicator === "ema_100" ||
                condition.indicator === "ema_200"
            ) {
                // If the value is a string like "price", "sma_50", etc., keep it as is
                // If it's a number, convert appropriately
                if (typeof condition.value === "string") {
                    // Map the comparison target (e.g., "sma_200" -> "sma_200")
                    if (
                        condition.value.startsWith("sma") ||
                        condition.value.startsWith("ema")
                    ) {
                        formattedCondition.value = condition.value;
                    } else if (condition.value === "price") {
                        formattedCondition.value = "price";
                    } else {
                        formattedCondition.value = condition.value;
                    }
                }
            }

            // Add connector except for the last condition
            if (index < conditions.length - 1) {
                formattedCondition.connector =
                    condition.logic?.toUpperCase() || "AND";
            }

            return formattedCondition;
        });
    }

    // Sync selectedTicker with selectedTickers array
    $: if (selectedTicker) {
        selectedTickers = [selectedTicker];
    }

    // Update strategy data whenever conditions change
    $: if (
        buyConditions ||
        sellConditions ||
        selectedTickers ||
        startDate ||
        endDate ||
        initialCapital
    ) {
        updateStrategyData();
    }

    // Define all possible indicators and their properties
    const availableIndicators = {
        rsi: {
            label: "RSI (Relative Strength Index)",

            operators: ["above", "below"],
            defaultOperator: "below",
            defaultValue: 30,
            min: 0,
            max: 100,
        },
        sma_20: {
            label: "20-Day Moving Average",

            operators: ["above", "below"],
            defaultOperator: "above",
            defaultValue: [
                "price",
                "sma_50",
                "sma_100",
                "sma_200",
                "ema_20",
                "ema_50",
                "ema_100",
                "ema_200",
            ],
            valueLabels: {
                price: "Stock Price",
                sma_50: "50-Day Moving Average",
                sma_100: "100-Day Moving Average",
                sma_200: "200-Day Moving Average",
                ema_20: "20-Day Exponential Moving Average",
                ema_50: "50-Day Exponential Moving Average",
                ema_100: "100-Day Exponential Moving Average",
                ema_200: "200-Day Exponential Moving Average",
            },
        },
        sma_50: {
            label: "50-Day Moving Average",

            operators: ["above", "below"],
            defaultOperator: "above",
            defaultValue: [
                "price",
                "sma_20",
                "sma_100",
                "sma_200",
                "ema_20",
                "ema_50",
                "ema_100",
                "ema_200",
            ],
            valueLabels: {
                price: "Stock Price",
                sma_20: "20-Day SMA",
                sma_100: "100-Day SMA",
                sma_200: "200-Day SMA",
                ema_20: "20-Day EMA",
                ema_50: "50-Day EMA",
                ema_100: "100-Day EMA",
                ema_200: "200-Day EMA",
            },
        },
        sma_100: {
            label: "100-Day Moving Average",

            operators: ["above", "below"],
            defaultOperator: "above",
            defaultValue: [
                "price",
                "sma_20",
                "sma_50",
                "sma_200",
                "ema_20",
                "ema_50",
                "ema_100",
                "ema_200",
            ],
            valueLabels: {
                price: "Stock Price",
                sma_20: "20-Day SMA",
                sma_50: "50-Day SMA",
                sma_200: "200-Day SMA",
                ema_20: "20-Day EMA",
                ema_50: "50-Day EMA",
                ema_100: "100-Day EMA",
                ema_200: "200-Day EMA",
            },
        },
        sma_200: {
            label: "200-Day Moving Average",

            operators: ["above", "below"],
            defaultOperator: "above",
            defaultValue: [
                "price",
                "sma_20",
                "sma_50",
                "sma_100",
                "ema_20",
                "ema_50",
                "ema_100",
                "ema_200",
            ],
            valueLabels: {
                price: "Stock Price",
                sma_20: "20-Day SMA",
                sma_50: "50-Day SMA",
                sma_100: "100-Day SMA",
                ema_20: "20-Day EMA",
                ema_50: "50-Day EMA",
                ema_100: "100-Day EMA",
                ema_200: "200-Day EMA",
            },
        },
        ema_20: {
            label: "20-Day Exponential Moving Average",

            operators: ["above", "below"],
            defaultOperator: "above",
            defaultValue: [
                "price",
                "sma_20",
                "sma_50",
                "sma_100",
                "sma_200",
                "ema_50",
                "ema_100",
                "ema_200",
            ],
            valueLabels: {
                price: "Stock Price",
                sma_20: "20-Day SMA",
                sma_50: "50-Day SMA",
                sma_100: "100-Day SMA",
                sma_200: "200-Day SMA",
                ema_50: "50-Day EMA",
                ema_100: "100-Day EMA",
                ema_200: "200-Day EMA",
            },
        },
        ema_50: {
            label: "50-Day Exponential Moving Average",

            operators: ["above", "below"],
            defaultOperator: "above",
            defaultValue: [
                "price",
                "sma_20",
                "sma_50",
                "sma_100",
                "sma_200",
                "ema_20",
                "ema_100",
                "ema_200",
            ],
            valueLabels: {
                price: "Stock Price",
                sma_20: "20-Day SMA",
                sma_50: "50-Day SMA",
                sma_100: "100-Day SMA",
                sma_200: "200-Day SMA",
                ema_20: "20-Day EMA",
                ema_100: "100-Day EMA",
                ema_200: "200-Day EMA",
            },
        },
        ema_100: {
            label: "100-Day Exponential Moving Average",

            operators: ["above", "below"],
            defaultOperator: "above",
            defaultValue: [
                "price",
                "sma_20",
                "sma_50",
                "sma_100",
                "sma_200",
                "ema_20",
                "ema_50",
                "ema_200",
            ],
            valueLabels: {
                price: "Stock Price",
                sma_20: "20-Day SMA",
                sma_50: "50-Day SMA",
                sma_100: "100-Day SMA",
                sma_200: "200-Day SMA",
                ema_20: "20-Day EMA",
                ema_50: "50-Day EMA",
                ema_200: "200-Day EMA",
            },
        },
        ema_200: {
            label: "200-Day Exponential Moving Average",

            operators: ["above", "below"],
            defaultOperator: "above",
            defaultValue: [
                "price",
                "sma_20",
                "sma_50",
                "sma_100",
                "sma_200",
                "ema_20",
                "ema_50",
                "ema_100",
            ],
            valueLabels: {
                price: "Stock Price",
                sma_20: "20-Day SMA",
                sma_50: "50-Day SMA",
                sma_100: "100-Day SMA",
                sma_200: "200-Day SMA",
                ema_20: "20-Day EMA",
                ema_50: "50-Day EMA",
                ema_100: "100-Day EMA",
            },
        },
        macd: {
            label: "MACD",

            operators: ["above", "below"],
            defaultOperator: "above",
            defaultValue: ["macd_signal", 0],
            valueLabels: {
                macd_signal: "MACD Signal Line",
                0: "Zero Line",
            },
        },
        volume: {
            label: "Volume",
            category: "Volume",
            operators: ["above", "below"],
            defaultOperator: "above",
            defaultValue: 1000000,
            min: 0,
            max: 999999999,
        },
        price: {
            label: "Price",
            category: "Price",
            operators: ["above", "below"],
            defaultOperator: "above",
            defaultValue: [
                "sma_20",
                "sma_50",
                "sma_100",
                "sma_200",
                "ema_20",
                "ema_50",
                "ema_100",
                "ema_200",
            ],
            valueLabels: {
                sma_20: "20-Day SMA",
                sma_50: "50-Day SMA",
                sma_100: "100-Day SMA",
                sma_200: "200-Day SMA",
                ema_20: "20-Day EMA",
                ema_50: "50-Day EMA",
                ema_100: "100-Day EMA",
                ema_200: "200-Day EMA",
            },
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

            defaultCondition: "over",
            defaultValue: "any",
        },
    };

    let filteredData = [];
    let displayResults = [];

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

            // Get readable value name (check if it should be translated using valueLabels)
            let valueText = block.value;
            if (
                typeof block.value === "string" &&
                availableIndicators[block.indicator]?.valueLabels
            ) {
                valueText =
                    availableIndicators[block.indicator].valueLabels[
                        block.value
                    ] || block.value;
            }

            text = `${indicatorName} ${operatorText} ${valueText}`;

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
    let backtestResults = {};
    let isBacktesting = false;
    let backtestError = null;
    let selectedTicker = "AAPL";
    let initialCapital = 100000;

    async function runBacktest() {
        if (
            buyConditionBlocks.length === 0 ||
            sellConditionBlocks.length === 0
        ) {
            toast?.error(
                "Please set up both buy and sell conditions before running backtest",
                {
                    style: `border-radius: 5px; background: #fff; color: #000; border-color: ${$mode === "light" ? "#F9FAFB" : "#4B5563"}; font-size: 15px;`,
                },
            );

            return;
        }

        isBacktesting = true;
        backtestError = null;

        try {
            // Update strategyData before running backtest
            updateStrategyData();

            const postData = { strategyData: strategyData };
            const response = await fetch("/api/backtesting", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(postData),
            });

            const output = await response.json();
            if (output?.success) {
                backtestResults = output;
                config = plotData();
            } else {
                backtestResults = {};
            }
        } catch (error) {
            backtestError = "Failed to run backtest: " + error.message;
        } finally {
            isBacktesting = false;
        }
    }

    let LoginPopup;

    function plotData() {
        const dates =
            backtestResults?.plot_data?.strategy?.map((item) => item.date) ||
            [];
        const values =
            backtestResults?.plot_data?.strategy?.map(
                (item) => item.return_pct,
            ) || [];

        const benchmarkValues =
            backtestResults?.plot_data?.spy_benchmark?.map(
                (item) => item.return_pct,
            ) || [];
        const fillColorStart = "rgb(70, 129, 244,0.5)";
        const fillColorEnd = "rgb(70, 129, 244,0.001)";

        const options = {
            credits: {
                enabled: false,
            },
            chart: {
                backgroundColor: $mode === "light" ? "#fff" : "#09090B",
                plotBackgroundColor: $mode === "light" ? "#fff" : "#09090B",
                height: 360,
            },
            title: {
                text: null,
                style: {
                    color: $mode === "light" ? "black" : "white",
                    // Using inline CSS for margin-top and margin-bottom
                },
                useHTML: true, // Enable HTML to apply custom class styling
            },
            xAxis: {
                type: "datetime",
                endOnTick: false,
                categories: dates,
                crosshair: {
                    color: $mode === "light" ? "black" : "white", // Set the color of the crosshair line
                    width: 1, // Adjust the line width as needed
                    dashStyle: "Solid",
                },
                labels: {
                    style: {
                        color: $mode === "light" ? "#545454" : "white",
                    },
                    distance: 10, // Increases space between label and axis
                    formatter: function () {
                        const date = new Date(this.value);
                        return date.toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                        });
                    },
                },
                tickPositioner: function () {
                    // Create custom tick positions with wider spacing
                    const positions = [];
                    const info = this.getExtremes();
                    const tickCount = 5; // Reduce number of ticks displayed
                    const interval = Math.floor(
                        (info.max - info.min) / tickCount,
                    );

                    for (let i = 0; i <= tickCount; i++) {
                        positions.push(info.min + i * interval);
                    }
                    return positions;
                },
            },
            yAxis: {
                gridLineWidth: 1,
                gridLineColor: $mode === "light" ? "#e5e7eb" : "#111827",
                labels: {
                    style: { color: $mode === "light" ? "#545454" : "white" },
                },
                title: { text: null },
                opposite: true,
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
                    let tooltipContent = `<span class="m-auto text-[1rem] font-[501]">${new Date(
                        this?.x,
                    ).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                    })}</span><br>`;

                    // Loop through each point in the shared tooltip
                    this.points.forEach((point) => {
                        tooltipContent += `
        <span class="font-semibold text-sm">${point.series.name}:</span> 
        <span class="font-normal text-sm">${point.y?.toLocaleString("en-US")}%</span><br>`;
                    });

                    return tooltipContent;
                },
            },

            plotOptions: {
                series: {
                    color: "white",
                    animation: false, // Disable series animation
                    states: {
                        hover: {
                            enabled: false, // Disable hover effect globally
                        },
                    },
                },
            },
            legend: {
                enabled: false,
            },
            series: [
                {
                    name: "Cumulative Returns",
                    type: "area",
                    data: values,
                    color: "#4681f4",
                    lineWidth: 1.2,
                    marker: {
                        enabled: false,
                    },
                    fillColor: {
                        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                        stops: [
                            [0, fillColorStart],
                            [1, fillColorEnd],
                        ],
                    },
                },
                {
                    name: "SPY Returns",
                    type: "area",
                    data: benchmarkValues,
                    color: "#ff4d4d", // solid red for the line
                    lineWidth: 1.2,
                    marker: {
                        enabled: false,
                    },
                    fillColor: {
                        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                        stops: [
                            [0, "rgba(255, 77, 77, 0.5)"], // soft red start
                            [1, "rgba(255, 77, 77, 0.001)"], // fade to transparent
                        ],
                    },
                },
            ],
        };

        return options;
    }

    onMount(() => {
        handleStrategySelection("rsiOversold");
    });
</script>

<SEO
    title="Free Backtesting - Search, Filter and Analyze Stocks"
    description={`A free backtesting to search, filter and analyze stocks  different indicators and metrics. The screener data is updated once per minute.`}
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
                        Popular Strategies
                    </div>
                    <div class="relative inline-block text-left grow">
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild let:builder>
                                <Button
                                    builders={[builder]}
                                    class="w-full  border-gray-300 dark:border-gray-800 border text-white bg-black sm:hover:bg-default dark:bg-default dark:sm:hover:bg-primary ease-out flex flex-row justify-between items-center px-3 py-2  rounded truncate"
                                >
                                    <span class="truncate">Select Popular</span>
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
                                            class="cursor-pointer sm:hover:bg-gray-300 dark:sm:hover:bg-primary"
                                            on:click={() =>
                                                handleStrategySelection(
                                                    item.key,
                                                )}
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
                        Saved Strategies
                    </div>
                    <div class="relative inline-block text-left grow">
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild let:builder>
                                <Button
                                    builders={[builder]}
                                    class="min-w-[110px]  w-full border-gray-300 dark:border-gray-800 border text-white bg-black sm:hover:bg-default dark:bg-default  dark:sm:hover:bg-primary ease-out flex flex-row justify-between items-center px-3 py-2  rounded truncate"
                                >
                                    <span class="truncate max-w-48"
                                        >{"Select Strategy"}</span
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
        class=" bg-white dark:bg-default rounded shadow-lg border border-gray-300 dark:border-gray-800 overflow-hidden"
    >
        <Tabs.Root bind:value={activeTab} class="w-full">
            <!-- Enhanced Tab List -->
            <div
                class="flex border-b border-gray-300 dark:border-gray-800 bg-gray-50 dark:bg-default"
            >
                <button
                    class="cursor-pointer flex-1 px-4 py-2 text-sm sm:text-[1rem] font-medium border-b-2 {activeTab ===
                    'buy'
                        ? 'text-muted dark:text-white bg-[#EEEEEE] dark:bg-primary/90 font-semibold'
                        : 'text-gray-600 dark:text-gray-400 sm:hover:text-muted dark:sm:hover:text-white sm:hover:bg-[#EEEEEE] dark:sm:hover:bg-primary/90'}"
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
                    class="cursor-pointer flex-1 px-6 py-4 text-sm sm:text-[1rem] font-medium border-b-2 {activeTab ===
                    'sell'
                        ? 'text-muted dark:text-white bg-[#EEEEEE] dark:bg-primary/90 font-semibold'
                        : 'text-gray-600 dark:text-gray-400 sm:hover:text-muted dark:sm:hover:text-white sm:hover:bg-[#EEEEEE] dark:sm:hover:bg-primary/90'}"
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
                <!--
                <button
                    class="cursor-pointer flex-1 px-6 py-4 text-sm sm:text-[1rem] font-medium border-b-2 {activeTab ===
                    'risk'
                        ? 'text-muted dark:text-white bg-[#EEEEEE] dark:bg-primary/90 font-semibold'
                        : 'text-gray-600 dark:text-gray-400 sm:hover:text-muted dark:sm:hover:text-white sm:hover:bg-[#EEEEEE] dark:sm:hover:bg-primary/90'}"
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
                -->

                <button
                    class="cursor-pointer flex-1 px-6 py-4 text-sm sm:text-[1rem] font-medium border-b-2 {activeTab ===
                    'backtest'
                        ? 'text-muted dark:text-white bg-[#EEEEEE] dark:bg-primary/90 font-semibold'
                        : 'text-gray-600 dark:text-gray-400 sm:hover:text-muted dark:sm:hover:text-white sm:hover:bg-[#EEEEEE] dark:sm:hover:bg-primary/90'}"
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
            <div class="p-3">
                <!-- Buy Conditions Tab Content -->
                <Tabs.Content value="buy" class="outline-none">
                    <div class="space-y-4">
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
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <!-- Stop Loss Card -->
                            <div
                                class="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/10 rounded p-6 border border-red-200 dark:border-red-800/30"
                            >
                                <div
                                    class="flex items-center justify-between mb-4"
                                >
                                    <div class="flex items-center gap-2">
                                        <div
                                            class="p-2 bg-red-100 dark:bg-red-900/30 rounded"
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
                                            class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-600 rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
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
                                                class="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-600 rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                                                placeholder="Enter value"
                                            />
                                            <span
                                                class="px-3 py-2 bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-400 rounded text-sm font-medium min-w-[40px] text-center"
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
                                class="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10 rounded p-6 border border-green-200 dark:border-green-800/30"
                            >
                                <div
                                    class="flex items-center justify-between mb-4"
                                >
                                    <div class="flex items-center gap-2">
                                        <div
                                            class="p-2 bg-green-100 dark:bg-green-900/30 rounded"
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
                                            class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-600 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
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
                                                class="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-600 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                                placeholder="Enter value"
                                            />
                                            <span
                                                class="px-3 py-2 bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-400 rounded text-sm font-medium min-w-[40px] text-center"
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
                            class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 rounded p-6 border border-blue-200 dark:border-blue-800/30"
                        >
                            <div class="flex items-center gap-2 mb-4">
                                <div
                                    class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded"
                                >
                                    <svg
                                        class="w-5 h-5"
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
                                        class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                                            class="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            placeholder="Enter amount"
                                        />
                                        <span
                                            class="px-3 py-2 bg-blue-100 dark:bg-blue-800/30 text-blue-700 dark:text-blue-400 rounded text-sm font-medium min-w-[40px] text-center"
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
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold capitalize">
                            Define Backtesting Settings
                        </h3>
                    </div>

                    <div class="space-y-6">
                        <!-- Backtest Configuration -->
                        <div class="bg-gray-100 dark:bg-default p-3">
                            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label
                                        class="block text-sm font-medium mb-2"
                                        >Symbol</label
                                    >
                                    <input
                                        type="text"
                                        bind:value={selectedTicker}
                                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm uppercase"
                                        placeholder=""
                                    />
                                </div>
                                <div>
                                    <label
                                        class="block text-sm font-medium mb-2"
                                        >Start Date</label
                                    >
                                    <input
                                        type="date"
                                        bind:value={startDate}
                                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>
                                <div>
                                    <label
                                        class="block text-sm font-medium mb-2"
                                        >End Date</label
                                    >
                                    <input
                                        type="date"
                                        bind:value={endDate}
                                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>
                                <div>
                                    <label
                                        class="block text-sm font-medium mb-2"
                                        >Initial Capital</label
                                    >
                                    <input
                                        type="number"
                                        bind:value={initialCapital}
                                        min="1000"
                                        step="1000"
                                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-800 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>
                            </div>
                            <div class="mt-4 w-full ml-auto flex justify-end">
                                <button
                                    on:click={runBacktest}
                                    disabled={isBacktesting}
                                    class="mt-3 cursor-pointer inline-flex items-center text-sm gap-1 px-3 py-2 bg-black sm:hover:bg-default disabled:bg-black/80 text-white dark:text-muted dark:bg-white dark:sm:hover:bg-gray-100 dark:disabled:bg-white/80 rounded font-medium transition-colors"
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
                                class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4"
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
                        <!-- Performance Summary Cards -->
                        <div class="w-full">
                            <!-- Strategy Performance -->
                            {#if backtestResults?.period}
                                <p class="mb-2">
                                    Trading Period between {backtestResults?.period}
                                </p>
                            {/if}
                            <div
                                class="grid grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-6 p-3"
                            >
                                <div class="">
                                    <h4 class="font-semibold mb-2">
                                        Total Returns
                                    </h4>
                                    <p
                                        class="text-[1rem] sm:text-lg font-semibold"
                                    >
                                        {backtestResults?.total_return
                                            ? backtestResults?.total_return +
                                              "%"
                                            : "n/a"}
                                    </p>
                                </div>

                                <div class="">
                                    <h4 class="font-semibold mb-2">
                                        Benchmark Returns
                                    </h4>
                                    <p
                                        class="text-[1rem] sm:text-lg font-semibold"
                                    >
                                        {backtestResults?.spy_benchmark
                                            ?.spy_return
                                            ? backtestResults?.spy_benchmark
                                                  ?.spy_return + "%"
                                            : "n/a"}
                                    </p>
                                </div>

                                <div class="">
                                    <h4 class="font-semibold mb-2">
                                        Sharpe Ratio
                                    </h4>
                                    <p
                                        class="text-[1rem] sm:text-lg font-semibold"
                                    >
                                        {backtestResults?.sharpe_ratio ?? "n/a"}
                                    </p>
                                </div>
                                <div class="">
                                    <h4 class="font-semibold mb-2">Alpha</h4>
                                    <p
                                        class="text-[1rem] sm:text-lg font-semibold"
                                    >
                                        {backtestResults?.alpha ?? "n/a"}
                                    </p>
                                </div>
                                <div class="">
                                    <h4 class="font-semibold mb-2">Beta</h4>
                                    <p
                                        class="text-[1rem] sm:text-lg font-semibold"
                                    >
                                        {backtestResults?.beta ?? "n/a"}
                                    </p>
                                </div>

                                <div class="">
                                    <h4 class="font-semibold mb-2">Sortino</h4>
                                    <p
                                        class="text-[1rem] sm:text-lg font-semibold"
                                    >
                                        {backtestResults?.sortino_ratio ??
                                            "n/a"}
                                    </p>
                                </div>

                                <div class="">
                                    <h4 class="font-semibold mb-2">
                                        Max Drawdown
                                    </h4>
                                    <p
                                        class="text-[1rem] sm:text-lg font-semibold"
                                    >
                                        {backtestResults?.max_drawdown
                                            ? backtestResults?.max_drawdown +
                                              "%"
                                            : "n/a"}
                                    </p>
                                </div>

                                <div class="">
                                    <h4 class="font-semibold mb-2">
                                        Volatility
                                    </h4>
                                    <p
                                        class="text-[1rem] sm:text-lg font-semibold"
                                    >
                                        {backtestResults?.volatility
                                            ? backtestResults?.volatility + "%"
                                            : "n/a"}
                                    </p>
                                </div>
                                <div class="">
                                    <h4 class="font-semibold mb-2">Win Rate</h4>
                                    <p
                                        class="text-[1rem] sm:text-lg font-semibold"
                                    >
                                        {backtestResults?.win_rate
                                            ? backtestResults?.win_rate + "%"
                                            : "n/a"}
                                    </p>
                                </div>
                                <div class="">
                                    <h4 class="font-semibold mb-2">
                                        Profit Factor
                                    </h4>
                                    <p
                                        class="text-[1rem] sm:text-lg font-semibold"
                                    >
                                        {backtestResults?.profit_factor ??
                                            "n/a"}
                                    </p>
                                </div>
                                <div class="">
                                    <h4 class="font-semibold mb-2">
                                        Total Trades
                                    </h4>
                                    <p
                                        class="text-[1rem] sm:text-lg font-semibold"
                                    >
                                        {backtestResults?.total_trades ?? "n/a"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Performance Chart -->
                        <div class="">
                            <div
                                class="flex flex-col sm:flex-row items-center justify-between mb-6"
                            >
                                <h4
                                    class="text-sm sm:text-[1rem] font-semibold mb-2 sm:mb-0"
                                >
                                    Cumulative Returns
                                </h4>
                                <div class="flex items-center gap-4 text-sm">
                                    <div class="flex items-center gap-2">
                                        <div
                                            class="w-3 h-3 bg-blue-500 rounded-full"
                                        ></div>
                                        <span class="">Your Strategy</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <div
                                            class="w-3 h-3 bg-[#ff4d4d] rounded-full"
                                        ></div>
                                        <span class="">SPY Benchmark</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Simplified Chart Display -->
                            {#if config}
                                <div
                                    class="chart-driver border border-gray-300 shadow-xs dark:border-gray-800 rounded"
                                    use:highcharts={config}
                                ></div>
                            {:else}
                                <div
                                    class="h-64 bg-gray-50 dark:bg-default rounded flex items-center justify-center border border-gray-300 dark:border-gray-800"
                                >
                                    <div class="text-center">
                                        <svg
                                            class="w-16 h-16 mx-auto mb-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="1.5"
                                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                            />
                                        </svg>
                                        <p class="text-lg font-medium mb-2">
                                            Performance Chart
                                        </p>
                                        <p class="text-sm">
                                            Your Strategy vs SPY benchmark over
                                            time
                                        </p>
                                        <p class="text-xs mt-2"></p>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </div>
                </Tabs.Content>
            </div>

            <!-- Strategy Summary in Plain English -->
            <div class="p-3 mt-4">
                <div class="">
                    <div class="flex items-start gap-3">
                        <div class="flex-1">
                            <h4 class="font-semibold mb-2 text-xl sm:text-2xl">
                                Strategy Summary
                            </h4>
                            <div class="space-y-2 text-sm">
                                <div class="flex items-start gap-2">
                                    <span
                                        class="inline-block w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"
                                    ></span>
                                    <span class="">{buyExplanation}</span>
                                </div>
                                <div class="flex items-start gap-2">
                                    <span
                                        class="inline-block w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"
                                    ></span>
                                    <span class="">{sellExplanation}</span>
                                </div>
                                <!--
                                {#if riskManagement.stopLoss.enabled || riskManagement.takeProfit.enabled}
                                    <div class="flex items-start gap-2 pt-1">
                                        <span
                                            class="inline-block w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"
                                        ></span>
                                        <span
                                            class=""
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
                            -->
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

<!--Start Login Modal-->
{#if LoginPopup}
    <LoginPopup {form} />
{/if}

<!--End Login Modal-->
