<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { fly } from "svelte/transition";
    import Trash2 from "lucide-svelte/icons/trash-2";
    import Plus from "lucide-svelte/icons/plus";
    import ChevronDown from "lucide-svelte/icons/chevron-down";

    import * as DropdownMenu from "$lib/components/shadcn/dropdown-menu/index.js";
    import { Button } from "$lib/components/shadcn/button/index.js";

    const dispatch = createEventDispatcher();

    export let strategyBlocks = [];
    export let availableIndicators = {};
    export let mode = "buy"; // 'buy' or 'sell'

    // Block types
    const BLOCK_TYPES = {
        CONDITION: "condition",
        LOGIC: "logic",
        GROUP: "group",
    };

    // Logic operators
    const LOGIC_OPERATORS = {
        AND: "AND",
        OR: "OR",
    };

    let blockIdCounter = 0;

    // Generate unique IDs using timestamp and counter to avoid duplicates
    function generateUniqueId() {
        let newId;
        do {
            newId = `block_${Date.now()}_${blockIdCounter++}`;
        } while (strategyBlocks.some((block) => block.id === newId));
        return newId;
    }

    // Initialize with empty blocks by default
    if (strategyBlocks.length === 0) {
        strategyBlocks = [];
    }

    function createConditionBlock(
        indicator = "rsi",
        operator = null,
        value = null,
    ) {
        const id = generateUniqueId();
        const config = getIndicatorConfig(indicator);

        // Use config defaults if not provided
        const finalOperator = operator || config.defaultOperator || "equals";
        let finalValue = value;

        if (finalValue === null) {
            if (Array.isArray(config.defaultValue)) {
                // For array defaultValue, use the first option
                finalValue = config.defaultValue[0];
            } else {
                // For numeric defaultValue, use the number directly
                finalValue = config.defaultValue;
            }
        }

        return {
            id,
            type: BLOCK_TYPES.CONDITION,
            indicator,
            operator: finalOperator,
            value: finalValue,
            logicOperator: null,
        };
    }

    function createGroupBlock() {
        const id = generateUniqueId();
        return {
            id,
            type: BLOCK_TYPES.GROUP,
            children: [createConditionBlock()],
            logicOperator: LOGIC_OPERATORS.AND,
        };
    }

    function addBlock(type = BLOCK_TYPES.CONDITION) {
        let newBlock;

        switch (type) {
            case BLOCK_TYPES.CONDITION:
                newBlock = createConditionBlock();
                break;
            case BLOCK_TYPES.GROUP:
                newBlock = createGroupBlock();
                break;
            default:
                return;
        }

        // Add logic operator to previous block if needed
        if (strategyBlocks.length > 0) {
            const lastBlock = strategyBlocks[strategyBlocks.length - 1];
            if (!lastBlock.logicOperator) {
                lastBlock.logicOperator = LOGIC_OPERATORS.AND;
            }
        }

        strategyBlocks = [...strategyBlocks, newBlock];
        dispatch("change", { blocks: strategyBlocks });
    }

    function removeBlock(blockId) {
        const index = strategyBlocks.findIndex((b) => b.id === blockId);
        if (index > -1) {
            strategyBlocks.splice(index, 1);
            // Remove logic operator from previous block if it's now the last
            if (index > 0 && index === strategyBlocks.length) {
                strategyBlocks[index - 1].logicOperator = null;
            }
            strategyBlocks = [...strategyBlocks];
            dispatch("change", { blocks: strategyBlocks });
        }
    }

    function updateBlock(blockId, updates) {
        const block = strategyBlocks.find((b) => b.id === blockId);
        if (block) {
            Object.assign(block, updates);
            strategyBlocks = [...strategyBlocks];
            dispatch("change", { blocks: strategyBlocks });
        }
    }

    function updateLogicOperator(blockId, operator) {
        const block = strategyBlocks.find((b) => b.id === blockId);
        if (block) {
            block.logicOperator = operator;
            strategyBlocks = [...strategyBlocks];
            dispatch("change", { blocks: strategyBlocks });
        }
    }

    // Get indicator configuration
    function getIndicatorConfig(indicatorKey) {
        return (
            availableIndicators[indicatorKey] || {
                label: indicatorKey,
                operators: ["equals"],
                defaultValue: 0,
            }
        );
    }

    // Convert blocks to conditions format for backend
    export function getConditions() {
        return strategyBlocks
            .map((block, index) => {
                if (block.type === BLOCK_TYPES.CONDITION) {
                    return {
                        indicator: block.indicator,
                        operator: block.operator,
                        value: block.value,
                        connector: block.logicOperator
                            ? block.logicOperator.toLowerCase()
                            : null,
                    };
                } else if (block.type === BLOCK_TYPES.GROUP) {
                    return {
                        type: "group",
                        operator: block.logicOperator,
                        conditions: block.children.map((child) => ({
                            indicator: child.indicator,
                            operator: child.operator,
                            value: child.value,
                        })),
                    };
                }
            })
            .filter(Boolean);
    }
</script>

<div class="">
    <div class="flex justify-between items-center">
        <h3 class="text-lg font-semibold capitalize text-white">
            {mode} Conditions
        </h3>
    </div>

    <div
        class="overflow-x-auto border border-gray-300 dark:border-gray-600 rounded bg-[#F8F9FA] dark:bg-secondary"
    >
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
            <!-- Table head -->
            <thead class="bg-gray-50 dark:bg-secondary">
                <tr>
                    <th
                        scope="col"
                        class="px-4 py-1.5 text-left text-sm font-semibold"
                    >
                        Indicator
                    </th>
                    <th
                        scope="col"
                        class="px-4 py-1.5 text-left text-sm font-semibold"
                    >
                        Operator
                    </th>
                    <th
                        scope="col"
                        class="px-4 py-1.5 text-left text-sm font-semibold"
                    >
                        Value
                    </th>
                    <th
                        scope="col"
                        class="px-4 py-1.5 text-left text-sm font-semibold"
                    >
                        Logic
                    </th>
                    <th
                        scope="col"
                        class="px-4 py-1.5 text-sm font-semibold w-8"
                    ></th>
                </tr>
            </thead>

            <!-- Table body -->
            <tbody
                class="bg-[#F9FAFB] dark:bg-secondary divide-y divide-gray-200 dark:divide-gray-600 text-sm"
            >
                {#each strategyBlocks as block, index (block.id)}
                    {#if block.type === BLOCK_TYPES.CONDITION}
                        <tr
                            class="transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                            transition:fly={{ y: 20, duration: 300 }}
                        >
                            <!-- Indicator Selection -->
                            <td class="px-4 py-2">
                                <DropdownMenu.Root>
                                    <DropdownMenu.Trigger asChild let:builder>
                                        <Button
                                            builders={[builder]}
                                            class="w-60 justify-between border-none bg-black text-white sm:hover:bg-default dark:hover:bg-gray-800 px-3 py-2 text-sm h-[35px]"
                                        >
                                            <span class="truncate">
                                                {getIndicatorConfig(
                                                    block.indicator,
                                                ).label}
                                            </span>
                                            <ChevronDown
                                                size={16}
                                                class="ml-2 opacity-50"
                                            />
                                        </Button>
                                    </DropdownMenu.Trigger>
                                    <DropdownMenu.Content
                                        class="w-60 max-h-[400px] overflow-y-auto scroller"
                                    >
                                        <DropdownMenu.Group>
                                            {#each Object.entries(availableIndicators) as [key, config]}
                                                <DropdownMenu.Item
                                                    class="cursor-pointer sm:hover:bg-gray-200 dark:sm:hover:bg-primary {block.indicator ===
                                                    key
                                                        ? 'bg-gray-100 dark:bg-gray-700'
                                                        : ''}"
                                                    on:click={() => {
                                                        const newIndicator =
                                                            key;
                                                        const newConfig =
                                                            getIndicatorConfig(
                                                                newIndicator,
                                                            );
                                                        let newValue;

                                                        if (
                                                            Array.isArray(
                                                                newConfig.defaultValue,
                                                            )
                                                        ) {
                                                            newValue =
                                                                newConfig
                                                                    .defaultValue[0];
                                                        } else {
                                                            newValue =
                                                                newConfig.defaultValue;
                                                        }

                                                        updateBlock(block.id, {
                                                            indicator:
                                                                newIndicator,
                                                            operator:
                                                                newConfig.defaultOperator ||
                                                                "equals",
                                                            value: newValue,
                                                        });
                                                    }}
                                                >
                                                    {config.label}
                                                </DropdownMenu.Item>
                                            {/each}
                                        </DropdownMenu.Group>
                                    </DropdownMenu.Content>
                                </DropdownMenu.Root>
                            </td>

                            <!-- Operator Selection -->
                            <td class="px-4 py-2">
                                <DropdownMenu.Root>
                                    <DropdownMenu.Trigger asChild let:builder>
                                        <Button
                                            builders={[builder]}
                                            class=" w-40 justify-between border-none bg-black text-white sm:hover:bg-default dark:hover:bg-gray-800 px-3 py-2 text-sm h-[35px]"
                                        >
                                            <span class="capitalize truncate"
                                                >{block.operator}</span
                                            >
                                            <ChevronDown
                                                size={16}
                                                class="ml-2 opacity-50"
                                            />
                                        </Button>
                                    </DropdownMenu.Trigger>
                                    <DropdownMenu.Content
                                        class="w-40 max-h-[400px] overflow-y-auto scroller"
                                    >
                                        <DropdownMenu.Group>
                                            {#each getIndicatorConfig(block.indicator).operators as op}
                                                <DropdownMenu.Item
                                                    class="cursor-pointer sm:hover:bg-gray-200 dark:sm:hover:bg-primary {block.operator ===
                                                    op
                                                        ? 'bg-gray-100 dark:bg-gray-700'
                                                        : ''}"
                                                    on:click={() => {
                                                        updateBlock(block.id, {
                                                            operator: op,
                                                        });
                                                    }}
                                                >
                                                    <span class="capitalize"
                                                        >{op}</span
                                                    >
                                                </DropdownMenu.Item>
                                            {/each}
                                        </DropdownMenu.Group>
                                    </DropdownMenu.Content>
                                </DropdownMenu.Root>
                            </td>

                            <!-- Value Selection/Input -->
                            <td class="px-4 py-2">
                                {#if Array.isArray(getIndicatorConfig(block.indicator).defaultValue)}
                                    <DropdownMenu.Root>
                                        <DropdownMenu.Trigger
                                            asChild
                                            let:builder
                                        >
                                            <Button
                                                builders={[builder]}
                                                class="w-60 justify-between border-none bg-black text-white sm:hover:bg-default dark:hover:bg-gray-800 px-3 py-2 text-sm h-[35px]"
                                            >
                                                <span class="truncate">
                                                    {getIndicatorConfig(
                                                        block.indicator,
                                                    ).valueLabels?.[
                                                        block.value
                                                    ] || block.value}
                                                </span>
                                                <ChevronDown
                                                    size={16}
                                                    class="ml-2 opacity-50"
                                                />
                                            </Button>
                                        </DropdownMenu.Trigger>
                                        <DropdownMenu.Content
                                            class="w-60 max-h-[400px] overflow-y-auto scroller"
                                        >
                                            <DropdownMenu.Group>
                                                {#each getIndicatorConfig(block.indicator).defaultValue as option}
                                                    <DropdownMenu.Item
                                                        class="cursor-pointer sm:hover:bg-gray-200 dark:sm:hover:bg-primary {block.value ===
                                                        option
                                                            ? 'bg-gray-100 dark:bg-gray-700'
                                                            : ''}"
                                                        on:click={() => {
                                                            updateBlock(
                                                                block.id,
                                                                {
                                                                    value: option,
                                                                },
                                                            );
                                                        }}
                                                    >
                                                        {getIndicatorConfig(
                                                            block.indicator,
                                                        ).valueLabels?.[
                                                            option
                                                        ] || option}
                                                    </DropdownMenu.Item>
                                                {/each}
                                            </DropdownMenu.Group>
                                        </DropdownMenu.Content>
                                    </DropdownMenu.Root>
                                {:else}
                                    <input
                                        type="number"
                                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded text-sm bg-white dark:bg-[#000] focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        value={block.value}
                                        min={getIndicatorConfig(block.indicator)
                                            .min}
                                        max={getIndicatorConfig(block.indicator)
                                            .max}
                                        on:input={(e) =>
                                            updateBlock(block.id, {
                                                value: parseFloat(
                                                    e.target.value,
                                                ),
                                            })}
                                    />
                                {/if}
                            </td>

                            <!-- Logic Operator -->
                            <td class="px-4 py-2">
                                {#if block.logicOperator && index < strategyBlocks.length - 1}
                                    <button
                                        class="px-3 py-1 bg-black text-white dark:bg-white dark:text-black rounded text-xs font-semibold transition-all hover:bg-gray-800 dark:hover:bg-gray-200"
                                        on:click={() => {
                                            const newOp =
                                                block.logicOperator ===
                                                LOGIC_OPERATORS.AND
                                                    ? LOGIC_OPERATORS.OR
                                                    : LOGIC_OPERATORS.AND;
                                            updateLogicOperator(
                                                block.id,
                                                newOp,
                                            );
                                        }}
                                    >
                                        {block.logicOperator}
                                    </button>
                                {:else}
                                    <span class="text-gray-400">-</span>
                                {/if}
                            </td>

                            <!-- Delete Button -->
                            <td class="px-4 py-2">
                                <button
                                    class="p-1.5 cursor-pointer"
                                    on:click={() => removeBlock(block.id)}
                                    title="Remove condition"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    {/if}
                {/each}
            </tbody>
        </table>
    </div>

    {#if strategyBlocks.length === 0}
        <div
            class="border border-gray-300 dark:border-gray-600 rounded bg-[#F8F9FA] dark:bg-secondary p-10 mt-4"
        >
            <div class="text-center">
                <p class="text-gray-800 dark:text-gray-400">
                    No conditions added yet
                </p>
            </div>
        </div>
    {/if}

    <div class="flex justify-between items-center mt-4">
        <h3 class="text-lg font-semibold capitalize text-white">
            {mode} Conditions
        </h3>
        <div class="relative">
            <button
                class="cursor-pointer flex items-center gap-1.5 px-3 py-2 bg-black dark:bg-white sm:hover:bg-default text-white dark:text-black rounded text-sm font-medium transition-colors"
                on:click={() => {
                    addBlock(BLOCK_TYPES.CONDITION);
                }}
            >
                <Plus size={16} />
                Add Block
            </button>
        </div>
    </div>
</div>
