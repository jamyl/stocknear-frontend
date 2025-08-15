<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let questions: string[] = [];

  const dispatch = createEventDispatcher();

  let expandedQuestions: Set<number> = new Set();

  function handleQuestionClick(question: string, index: number) {
    // Dispatch event to parent to handle the question click
    dispatch("question-click", { question, index });
  }
</script>

{#if questions && questions.length > 0}
  <div class="bg-[#27272A] dark:bg-default mt-5">
    <div class="flex items-center gap-3 mb-4">
      <h3 class="text-lg font-semibold text-white dark:text-gray-100">
        Related
      </h3>
    </div>

    <div class="flex flex-col gap-0.5">
      {#each questions as question, index}
        <div
          class="border-b border-gray-300 dark:border-gray-800 last:border-b-0"
        >
          <button
            class="cursor-pointer w-full flex justify-between items-center py-4 px-2 bg-transparent transition-colors text-left group"
            on:click={() => handleQuestionClick(question, index)}
            aria-expanded={expandedQuestions.has(index)}
          >
            <span
              class="flex-1 text-[15px] leading-relaxed text-gray-200 dark:text-gray-300 font-normal pr-3"
            >
              {question}
            </span>
            <span
              class="flex items-center justify-center w-6 h-6 text-blue-400 dark:text-blue-500 transition-transform {expandedQuestions.has(
                index,
              )
                ? 'rotate-45'
                : ''}"
            >
            </span>
          </button>
        </div>
      {/each}
    </div>
  </div>
{/if}
