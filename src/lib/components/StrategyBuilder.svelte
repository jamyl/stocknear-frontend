<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { fade, fly } from "svelte/transition";
    import Trash2 from "lucide-svelte/icons/trash-2";
    import Plus from "lucide-svelte/icons/plus";
    import GripVertical from "lucide-svelte/icons/grip-vertical";
    import ChevronDown from "lucide-svelte/icons/chevron-down";
    import Link2 from "lucide-svelte/icons/link-2";

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

    // Drag and drop state
    let draggedBlock = null;
    let draggedOverBlock = null;
    let isDragging = false;

    // UI state
    let showIndicatorMenu = false;
    let selectedBlockId = null;
    let blockIdCounter = 0;

    // Initialize with default blocks if empty
    if (strategyBlocks.length === 0) {
        strategyBlocks = [createConditionBlock()];
    }

    function createConditionBlock(
        indicator = "rsi",
        operator = null,
        value = null,
    ) {
        const id = `block_${blockIdCounter++}`;
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
        const id = `block_${blockIdCounter++}`;
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

    // Drag and drop handlers
    function handleDragStart(event, block) {
        draggedBlock = block;
        isDragging = true;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/html", event.target.innerHTML);
    }

    function handleDragOver(event, block) {
        if (event.preventDefault) {
            event.preventDefault();
        }
        event.dataTransfer.dropEffect = "move";
        draggedOverBlock = block;
        return false;
    }

    function handleDragEnter(event, block) {
        if (draggedBlock && draggedBlock.id !== block.id) {
            event.currentTarget.classList.add(
                "border-blue-500",
                "bg-blue-50",
                "dark:bg-blue-900/20",
            );
        }
    }

    function handleDragLeave(event) {
        event.currentTarget.classList.remove(
            "border-blue-500",
            "bg-blue-50",
            "dark:bg-blue-900/20",
        );
    }

    function normalizeLogicOperators() {
        // Ensure last block has no connector and non-last blocks have a default if missing
        strategyBlocks.forEach((b, i) => {
            if (i === strategyBlocks.length - 1) {
                b.logicOperator = null;
            } else if (!b.logicOperator) {
                b.logicOperator = LOGIC_OPERATORS.AND;
            }
        });
    }

    function handleDrop(event, targetBlock) {
        if (event.stopPropagation) {
            event.stopPropagation();
        }

        event.currentTarget.classList.remove(
            "border-blue-500",
            "bg-blue-50",
            "dark:bg-blue-900/20",
        );

        if (
            !draggedBlock ||
            !targetBlock ||
            draggedBlock.id === targetBlock.id
        ) {
            // nothing to do
            return false;
        }

        const draggedIndex = strategyBlocks.findIndex(
            (b) => b.id === draggedBlock.id,
        );
        const targetIndex = strategyBlocks.findIndex(
            (b) => b.id === targetBlock.id,
        );

        if (draggedIndex === -1 || targetIndex === -1) {
            return false;
        }

        // Remove dragged block
        const [removed] = strategyBlocks.splice(draggedIndex, 1);

        let insertIndex =
            draggedIndex < targetIndex ? targetIndex : targetIndex + 1;

        // Clamp to valid bounds
        if (insertIndex < 0) insertIndex = 0;
        if (insertIndex > strategyBlocks.length)
            insertIndex = strategyBlocks.length;

        // Insert in new position
        strategyBlocks.splice(insertIndex, 0, removed);

        // Normalize logic operators so last block has null and non-last blocks have sensible defaults
        normalizeLogicOperators();

        strategyBlocks = [...strategyBlocks];
        dispatch("change", { blocks: strategyBlocks });

        return false;
    }

    function handleDragEnd(event) {
        isDragging = false;
        draggedBlock = null;
        draggedOverBlock = null;

        // Remove all drag-over classes
        document.querySelectorAll(".border-blue-500").forEach((el) => {
            el.classList.remove(
                "border-blue-500",
                "bg-blue-50",
                "dark:bg-blue-900/20",
            );
        });
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
    <div class="flex justify-between items-center mb-5">
        <h3
            class="text-lg font-semibold capitalize text-gray-900 dark:text-white"
        >
            {mode} Conditions
        </h3>
        <div class="relative">
            <button
                class="flex items-center gap-1.5 px-3 py-2 bg-black sm:hover:bg-default text-white rounded text-sm font-medium transition-colors"
                on:click={() => {
                    addBlock(BLOCK_TYPES.CONDITION);
                }}
            >
                <Plus size={16} />
                Add Block
            </button>
        </div>
    </div>

    <div class="h-auto">
        {#each strategyBlocks as block, index (block.id)}
            <div class="mb-3" transition:fly={{ y: 20, duration: 300 }}>
                {#if block.type === BLOCK_TYPES.CONDITION}
                    <div
                        class="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-300 cursor-move"
                        class:opacity-50={isDragging &&
                            draggedBlock?.id === block.id}
                        draggable="true"
                        on:dragstart={(e) => handleDragStart(e, block)}
                        on:dragover={(e) => handleDragOver(e, block)}
                        on:dragenter={(e) => handleDragEnter(e, block)}
                        on:dragleave={handleDragLeave}
                        on:drop={(e) => handleDrop(e, block)}
                        on:dragend={handleDragEnd}
                    >
                        <div
                            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-move"
                        >
                            <GripVertical size={16} />
                        </div>

                        <div class="flex-1 flex items-center gap-3 flex-wrap">
                            <select
                                class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 focus:outline-none focus:border-blue-500 min-w-[180px]"
                                value={block.indicator}
                                on:change={(e) => {
                                    const newIndicator = e.target.value;
                                    const config =
                                        getIndicatorConfig(newIndicator);
                                    let newValue;

                                    // Set default value based on indicator type
                                    if (Array.isArray(config.defaultValue)) {
                                        newValue = config.defaultValue[0];
                                    } else {
                                        newValue = config.defaultValue;
                                    }

                                    updateBlock(block.id, {
                                        indicator: newIndicator,
                                        operator:
                                            config.defaultOperator || "equals",
                                        value: newValue,
                                    });
                                }}
                            >
                                {#each Object.entries(availableIndicators) as [key, config]}
                                    <option value={key}>{config.label}</option>
                                {/each}
                            </select>

                            <select
                                class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 focus:outline-none focus:border-blue-500 min-w-[100px]"
                                value={block.operator}
                                on:change={(e) =>
                                    updateBlock(block.id, {
                                        operator: e.target.value,
                                    })}
                            >
                                {#each getIndicatorConfig(block.indicator).operators as op}
                                    <option value={op}>{op}</option>
                                {/each}
                            </select>

                            <!-- Dynamic value input based on indicator type -->
                            {#if Array.isArray(getIndicatorConfig(block.indicator).defaultValue)}
                                <!-- Dropdown for indicators with array defaultValue -->
                                <select
                                    class="w-[120px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 focus:outline-none focus:border-blue-500"
                                    value={block.value}
                                    on:change={(e) =>
                                        updateBlock(block.id, {
                                            value: e.target.value,
                                        })}
                                >
                                    {#each getIndicatorConfig(block.indicator).defaultValue as option}
                                        <option value={option}>
                                            {getIndicatorConfig(block.indicator)
                                                .valueLabels?.[option] ||
                                                option}
                                        </option>
                                    {/each}
                                </select>
                            {:else}
                                <!-- Number input for indicators with numeric defaultValue -->
                                <input
                                    type="number"
                                    class="w-[100px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 focus:outline-none focus:border-blue-500"
                                    value={block.value}
                                    min={getIndicatorConfig(block.indicator)
                                        .min}
                                    max={getIndicatorConfig(block.indicator)
                                        .max}
                                    on:input={(e) =>
                                        updateBlock(block.id, {
                                            value: parseFloat(e.target.value),
                                        })}
                                />
                            {/if}
                        </div>

                        <button
                            class="p-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-500 dark:text-red-400 rounded transition-colors"
                            on:click={() => removeBlock(block.id)}
                            title="Remove block"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                {/if}

                {#if block.type === BLOCK_TYPES.GROUP}
                    <div
                        class="p-5 bg-gray-50 dark:bg-gray-900/50 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl"
                    >
                        <div class="flex justify-between items-center mb-3">
                            <span
                                class="text-sm font-semibold text-gray-600 dark:text-gray-400"
                                >Group</span
                            >
                            <button
                                class="p-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-500 dark:text-red-400 rounded transition-colors"
                                on:click={() => removeBlock(block.id)}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                        <div class="space-y-2">
                            {#each block.children as child}
                                <div
                                    class="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                                >
                                    <!-- Render child conditions here -->
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}

                {#if block.logicOperator && index < strategyBlocks.length - 1}
                    <div
                        class="flex items-center justify-center -my-1.5 relative z-10"
                    >
                        <div
                            class="flex-1 h-px bg-gray-300 dark:bg-gray-600"
                        ></div>
                        <button
                            class="flex items-center gap-1 px-3 py-1.5 mx-3 bg-black text-white dark:bg-white border border-gray-300 dark:border-gray-600 rounded-full text-xs sm:text-sm font-semibold transition-all"
                            on:click={() => {
                                const newOp =
                                    block.logicOperator === LOGIC_OPERATORS.AND
                                        ? LOGIC_OPERATORS.OR
                                        : LOGIC_OPERATORS.AND;
                                updateLogicOperator(block.id, newOp);
                            }}
                        >
                            <Link2 size={12} />
                            {block.logicOperator}
                        </button>
                        <div
                            class="flex-1 h-px bg-gray-300 dark:bg-gray-600"
                        ></div>
                    </div>
                {/if}
            </div>
        {/each}

        {#if strategyBlocks.length === 0}
            <div class="text-center py-10">
                <p class="text-gray-500 dark:text-gray-400 mb-4">
                    No conditions added yet
                </p>
                <button
                    class="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded transition-all"
                    on:click={() => addBlock(BLOCK_TYPES.CONDITION)}
                >
                    <Plus size={16} />
                    Add your first condition
                </button>
            </div>
        {/if}
    </div>
</div>
