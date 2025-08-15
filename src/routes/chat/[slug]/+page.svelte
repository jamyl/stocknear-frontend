<script lang="ts">
  import ChatMessage from "$lib/components/Chat/ChatMessage.svelte";

  import Arrow from "lucide-svelte/icons/arrow-up";
  import Plus from "lucide-svelte/icons/plus";

  import { getCreditFromQuery, agentOptions, agentCategory } from "$lib/utils";
  import * as DropdownMenu from "$lib/components/shadcn/dropdown-menu/index.js";
  import { Button } from "$lib/components/shadcn/button/index.js";
  import { goto } from "$app/navigation";

  import { EditorState, Plugin } from "prosemirror-state";
  import { EditorView, Decoration, DecorationSet } from "prosemirror-view";
  import { keymap } from "prosemirror-keymap";
  import { schema } from "prosemirror-schema-basic";

  import { onMount, afterUpdate, tick, onDestroy } from "svelte";
  import SEO from "$lib/components/SEO.svelte";

  export let data;
  let selectedGroup = "overview";
  // Initialize messages with default or data
  let messages = data?.getChat?.messages || [
    { content: "Hello! How can I help you today?", role: "system" },
  ];

  let chatId = data?.getChat?.id;
  let editable = data?.getChat?.editable ?? false;

  let chatContainer: HTMLDivElement;
  let bottomEl: HTMLDivElement;

  // Auto-scrolling - Modified to track streaming state
  let isStreaming = false; // New variable to track streaming state
  let saveTimeout = null; // Timeout for periodic saves during streaming
  let lastSavedContent = ""; // Track last saved content to avoid redundant saves
  let animationFrameId = null; // For smooth rendering
  let pendingContent = ""; // Buffer for content updates
  let lastUpdateTime = 0; // Throttle DOM updates
  const UPDATE_INTERVAL = 16; // ~60fps

  let editorDiv;
  let editorView;
  let editorText = "";

  let suggestions = [];
  let showSuggestions = false;
  let suggestionPos = { top: 0, left: 0 };
  let selectedSuggestion = 0;
  let currentQuery = "";
  let isLoading = false;
  let agentNames = agentOptions?.map((item) => item?.name);

  const editorHighlighter = new Plugin({
    props: {
      decorations(state) {
        const decorations = [];
        const regex = /\@([a-zA-Z0-9_]+)/g;

        state.doc.descendants((node, pos) => {
          if (!node.isText) return;

          const text = node.text;
          if (!text) return;

          let match;
          while ((match = regex.exec(text)) !== null) {
            const mention = match[1];
            if (agentNames?.includes(mention)) {
              decorations?.push(
                Decoration?.inline(
                  pos + match.index,
                  pos + match.index + match[0]?.length,
                  {
                    class: "text-blue-800 dark:text-blue-400",
                  },
                ),
              );
            }
          }
        });

        return DecorationSet.create(state.doc, decorations);
      },
    },
  });

  function getCaretCoordinates(view) {
    const { from } = view.state.selection;
    const start = view.coordsAtPos(from);
    return start;
  }

  function checkAutocomplete(view) {
    const { from } = view.state.selection;
    const before = view.state.doc.textBetween(
      Math.max(0, from - 20),
      from,
      "\n",
      "\n",
    );
    const match = /\@([a-zA-Z0-9_]*)$/.exec(before);

    if (match) {
      currentQuery = match[1];
      suggestions = agentNames?.filter((s) =>
        s.toLowerCase().startsWith(currentQuery.toLowerCase()),
      );

      const coords = getCaretCoordinates(view);
      suggestionPos = { top: coords.bottom + 4, left: coords.left };
      showSuggestions = suggestions.length > 0;
    } else {
      showSuggestions = false;
    }
  }

  const placeholderPlugin = new Plugin({
    props: {
      decorations(state) {
        // only show if empty
        if (state.doc.textContent.length > 0) return null;

        const widget = Decoration.widget(1, () => {
          const span = document.createElement("span");
          span.className =
            "text-gray-800 dark:text-gray-200 pointer-events-none";
          span.textContent = editable
            ? "Ask anything"
            : "Read-only: You don’t have permission to edit this chat.";
          return span;
        });

        return DecorationSet.create(state.doc, [widget]);
      },
    },
  });

  // Function to save chat with debouncing during streaming
  async function saveChatWithDebounce(assistantContent = "") {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    saveTimeout = setTimeout(async () => {
      // Only save if content has changed
      if (assistantContent !== lastSavedContent) {
        lastSavedContent = assistantContent;
        await saveChat();
      }
    }, 2000); // Save every 2 seconds during streaming
  }

  // Function to handle page unload during streaming
  function handlePageUnload() {
    if (isStreaming && messages.length > 0) {
      // Use sendBeacon for reliable data sending during page unload
      const postData = JSON.stringify({
        messages: messages,
        chatId: chatId,
      });

      navigator.sendBeacon(
        "/api/update-chat",
        new Blob([postData], {
          type: "application/json",
        }),
      );
    }
  }

  onMount(async () => {
    editorView = new EditorView(editorDiv, {
      state: EditorState.create({
        schema,
        plugins: [
          editorHighlighter,
          placeholderPlugin,
          agentMentionDeletePlugin(agentNames),
        ],
      }),
      attributes: {
        style: "outline: none !important; border: none !important;",
      },
      editable: () => editable, // <-- Respect the editable variable from props
      dispatchTransaction(transaction) {
        // Prevent dispatch if not editable
        if (!editable) return;

        const newState = editorView.state.apply(transaction);
        editorView.updateState(newState);
        editorText = editorView?.state.doc?.textContent;
        checkAutocomplete(editorView);
      },
    });

    // Force remove outline after creation
    const proseMirrorEl = editorDiv.querySelector(".ProseMirror");
    if (proseMirrorEl) {
      proseMirrorEl.style.outline = "none";
      proseMirrorEl.style.border = "none";
      proseMirrorEl.style.boxShadow = "none";
    }

    // Autofocus the editor
    // Autofocus the editor with a small delay
    setTimeout(() => {
      editorView.focus();
    }, 100);
    editorText = editorView.state.doc.textContent;

    // Add event listeners for page unload
    window.addEventListener("beforeunload", handlePageUnload);
    window.addEventListener("pagehide", handlePageUnload);

    if (messages.length === 1 && messages[0].role === "user") {
      const userQuery = messages[0]?.content;
      editorText = "";
      if (userQuery?.trim()) {
        // Clear messages and set user message
        messages = [{ content: userQuery, Text, role: "user" }];
        await llmChat(userQuery);
      }
    }
  });

  // Modified afterUpdate to only autoscroll during streaming
  afterUpdate(async () => {
    if (isStreaming && bottomEl) {
      // Wait for new messages to render
      await tick();
      bottomEl.scrollIntoView({ behavior: "smooth" });
    }
  });

  async function llmChat(userMessage?: string) {
    if (isLoading || isStreaming) {
      //making sure to not send another request when the llm is responding already
      return;
    }

    isLoading = true;
    isStreaming = true;
    // Use provided message or input text
    const userQuery = userMessage || editorText?.trim();

    // Clear the editor content
    const emptyDoc = schema?.topNodeType?.createAndFill();
    const tr = editorView?.state?.tr?.replaceWith(
      0,
      editorView?.state?.doc?.content?.size,
      emptyDoc?.content,
    );
    editorView?.dispatch(tr);
    editorText = "";

    if (!userQuery || userQuery?.length < 1) {
      isLoading = false;
      return;
    }

    // Only append user message if not already in messages
    if (!userMessage) {
      messages = [...messages, { content: userQuery, role: "user" }];
    }

    // Add placeholder for assistant response
    messages = [...messages, { content: "", role: "system" }];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userQuery, chatId: chatId }),
      });

      if (!res.ok || !res.body) {
        // Remove empty LLM message
        messages = messages?.slice(0, -1);

        const errorMessage = (await res?.json())?.error || "Unknown error";
        messages = [...messages, { content: errorMessage, role: "system" }];
        isLoading = false;
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const idx = messages?.length - 1;
      let assistantText = "";
      let updateBuffer = [];
      let batchTimeout = null;
      let sourcesCollected = []; // Track sources for this response

      isLoading = false;

      while (true) {
        const { value, done } = await reader?.read();
        if (done) break;

        buffer += decoder?.decode(value, { stream: true });
        const lines = buffer?.split("\n");
        buffer = lines?.pop() ?? "";

        for (const line of lines) {
          if (!line?.trim()) continue;

          try {
            const json = JSON?.parse(line);

            if (json.error) {
              console.error("Stream error:", json.error);
              break;
            }

            // Handle sources event
            if (json?.event === "sources" && json?.sources) {
              sourcesCollected = json.sources;
              // Update the message with sources
              if (messages[idx]) {
                messages[idx].sources = sourcesCollected;
                messages = [...messages];
              }
            }

            if (json?.content) {
              assistantText = json?.content;
              pendingContent = assistantText;

              // Batch updates for smoother rendering
              updateBuffer.push(assistantText);

              if (batchTimeout) {
                clearTimeout(batchTimeout);
              }

              // Process batch updates
              batchTimeout = setTimeout(() => {
                if (updateBuffer.length > 0) {
                  const latestContent = updateBuffer[updateBuffer.length - 1];

                  // Use requestAnimationFrame for smooth DOM update
                  if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                  }

                  animationFrameId = requestAnimationFrame(() => {
                    messages[idx].content = latestContent;
                    messages = [...messages]; // Trigger reactivity
                    animationFrameId = null;
                  });

                  updateBuffer = []; // Clear buffer after processing
                }
              }, 30); // Batch updates every 30ms for smoother rendering

              // Save periodically during streaming
              await saveChatWithDebounce(assistantText);
            }
          } catch (err) {
            console.error("Parse error:", err, "Line:", line);
          }
        }
      }

      isStreaming = false; // End streaming - disable

      // Clear batch timeout
      if (batchTimeout) {
        clearTimeout(batchTimeout);
        batchTimeout = null;
      }

      // Ensure final content is updated
      if (pendingContent && messages[idx]) {
        messages[idx].content = pendingContent;
        messages = [...messages];
      }

      // Clear animation frame if pending
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      // Clear any pending debounced saves
      if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
      }

      const costOfCredit = getCreditFromQuery(userQuery, agentOptions);

      if (data?.user) {
        data.user.credits -= costOfCredit;
      }

      // Final save after streaming completes
      await saveChat();
    } catch (error) {
      console.error("Chat request failed:", error);
      messages = messages.slice(0, -1);
      messages = [
        ...messages,
        {
          content:
            "Failed to connect to the chat service. Please try again later.",
          role: "system",
        },
      ];
    } finally {
      isLoading = false;
      isStreaming = false; // Ensure streaming is disabled

      // Clear any pending saves in error cases
      if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
      }
    }
  }

  async function rewriteResponse(dispatchData: number) {
    if (editable) {
      const index = dispatchData?.detail ?? null;

      if (index < 1 || index > messages?.length) return;
      const userMessage = messages?.[index - 1]?.content;
      //messages = [...messages?.splice(index - 1, 1)]; // Remove the message at that index
      messages = messages?.slice(0, index);
      await llmChat(userMessage);
    }
  }

  async function editMessage(event) {
    if (editable) {
      const { index, content } = event.detail;

      if (index < 0 || index >= messages?.length) return;

      // Update the message content at the specified index
      messages[index].content = content;

      // Remove all messages after the edited one (including any assistant responses)
      messages = messages.slice(0, index + 1);

      // Trigger reactivity to update the UI
      messages = [...messages];

      // Trigger chat regeneration with the edited message (pass the content directly)
      await llmChat(content);
    }
  }

  async function saveChat() {
    const postData = { messages: messages, chatId: chatId };

    const response = await fetch("/api/update-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(postData),
    });

    const output = await response?.json();
  }

  async function handleKeyDown(event) {
    if (showSuggestions) {
      if (event.key === "ArrowDown") {
        selectedSuggestion = (selectedSuggestion + 1) % suggestions.length;
        event.preventDefault();
      } else if (event.key === "ArrowUp") {
        selectedSuggestion =
          (selectedSuggestion - 1 + suggestions.length) % suggestions.length;
        event.preventDefault();
      } else if (event.key === "Enter") {
        insertSuggestion(suggestions[selectedSuggestion]);
        event.preventDefault();
      } else if (event.key === "Escape") {
        showSuggestions = false;
      }
    } else {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        await llmChat();
      }
    }
  }

  function insertSuggestion(suggestion) {
    const { from } = editorView.state.selection;
    const before = editorView.state.doc.textBetween(
      Math.max(0, from - 20),
      from,
      "\n",
      "\n",
    );
    const match = /\@([a-zA-Z0-9_]*)$/.exec(before);

    if (match) {
      const start = from - match[0].length;

      // First, create transaction
      const tr = editorView.state.tr.insertText(`@${suggestion} `, start, from);

      // Then set selection on the new transaction
      const resolvedPos = tr.doc.resolve(start + suggestion.length + 2);
      const newSelection =
        editorView.state.selection.constructor.near(resolvedPos);
      tr.setSelection(newSelection);

      editorView.dispatch(tr);
      showSuggestions = false;
    }
  }

  function insertAgentOption(option) {
    const { from, to } = editorView.state.selection;
    const text = `@${option} `;

    const tr = editorView.state.tr.insertText(text, from, to);
    const resolvedPos = tr.doc.resolve(from + text.length);
    const newSelection =
      editorView.state.selection.constructor.near(resolvedPos);
    tr.setSelection(newSelection);

    editorView?.dispatch(tr);
    editorView?.focus();
  }

  onDestroy(() => {
    // Clean up event listeners and timeouts
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", handlePageUnload);
      window.removeEventListener("pagehide", handlePageUnload);
    }

    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  });

  function agentMentionDeletePlugin(agentNames: string[]) {
    return keymap({
      Backspace: (state, dispatch, view) => {
        const { $cursor } = state.selection as any;

        if (!$cursor) return false;

        const { pos } = $cursor;
        const textBefore = state.doc.textBetween(
          Math.max(0, pos - 30),
          pos,
          "\n",
          "\n",
        );

        const regex = /\@([a-zA-Z0-9_]+)$/;
        const match = regex.exec(textBefore);

        if (match && agentNames?.includes(match[1])) {
          const start = pos - match[0].length;

          if (dispatch) {
            dispatch(state.tr.delete(start, pos));
          }
          return true;
        }

        return false;
      },

      // Optional: support Delete key too
      Delete: (state, dispatch, view) => {
        const { $cursor } = state.selection as any;
        if (!$cursor) return false;

        const { pos } = $cursor;
        const textAfter = state.doc.textBetween(
          pos,
          Math.min(pos + 30, state.doc.content.size),
          "\n",
          "\n",
        );

        const regex = /^\@([a-zA-Z0-9_]+)/;
        const match = regex.exec(textAfter);

        if (match && agentNames?.includes(match[1])) {
          const end = pos + match[0].length;

          if (dispatch) {
            dispatch(state.tr.delete(pos, end));
          }
          return true;
        }

        return false;
      },
    });
  }
</script>

<SEO
  title="AI Financial Conversation - Personalized Stock Analysis & Investment Insights"
  description="Continue your personalized AI-powered financial analysis conversation. Review detailed stock research, market insights, and investment recommendations from your AI financial advisor. Access conversation history, follow-up questions, and comprehensive market analysis tailored to your investment needs."
  keywords="AI financial conversation, personalized stock analysis, AI investment advisor, financial chat history, personalized market insights, AI portfolio review, investment conversation, financial AI assistant, stock market consultation, AI trading advice"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "AI Financial Conversation",
    description:
      "Personalized AI financial analysis conversation with detailed stock research and investment insights",
    url: "https://stocknear.com/chat",
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
          name: "AI Chat",
          item: "https://stocknear.com/chat",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Conversation",
          item: "https://stocknear.com/chat",
        },
      ],
    },
    mainEntity: {
      "@type": "Conversation",
      about: {
        "@type": "Thing",
        name: "Stock Market Analysis and Investment Research",
      },
      participant: [
        {
          "@type": "Organization",
          name: "Stocknear AI Financial Agent",
        },
        {
          "@type": "Person",
          name: "Investor",
        },
      ],
    },
    creator: {
      "@type": "Organization",
      name: "Stocknear",
      url: "https://stocknear.com",
    },
    potentialAction: {
      "@type": "CommunicateAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://stocknear.com/chat",
      },
      object: {
        "@type": "Thing",
        name: "Financial Analysis Request",
      },
    },
  }}
/>

<section class="w-full max-w-[1400px] mx-auto min-h-[80vh] pt-5 px-4 lg:px-0">
  <div class="relative w-full 2xl:max-w-[1100px] flex flex-col min-h-[80vh]">
    <main
      class="w-full overflow-y-auto p-4 space-y-4"
      bind:this={chatContainer}
    >
      <div class="pb-60">
        {#each messages as message, index}
          {#if index === messages.length - 1 && message.role === "system" && isLoading}
            <ChatMessage
              {message}
              {index}
              isLoading={true}
              isStreaming={isStreaming}
              {editable}
              on:rewrite={rewriteResponse}
              on:edit={editMessage}
            />
          {:else}
            <ChatMessage
              {message}
              {index}
              isLoading={false}
              isStreaming={index === messages.length - 1 && message.role === "system" && isStreaming}
              {editable}
              on:rewrite={rewriteResponse}
              on:edit={editMessage}
            />
          {/if}
        {/each}
        <!-- sentinel div always at the bottom -->

        <div bind:this={bottomEl}></div>
      </div>

      <div
        class="bg-gray-50 dark:bg-[#2A2E39] fixed absolute bottom-10 sm:bottom-20 left-1/2 transform -translate-x-1/2 block p-3 min-w-[90vw] sm:min-w-0 sm:w-full sm:max-w-3xl border border-gray-300 dark:border-gray-600 shadow rounded-[8px] overflow-hidden"
      >
        <div
          bind:this={editorDiv}
          class="ml-2 bg-gray-50 dark:bg-[#2A2E39] w-full min-h-[5vh] sm:min-h-[60px] {!editable
            ? 'cursor-not-allowed'
            : ''}"
          on:keydown={handleKeyDown}
        />

        <form
          class="grow rounded relative flex items-center w-full overflow-hidden"
        >
          <div
            class="relative min-h-12 h-auto overflow-y-hidden w-full outline-none"
          >
            <div
              class="absolute bottom-0 flex flex-row justify-end w-full bg-gray-50 dark:bg-[#2A2E39]"
            >
              <div class="flex flex-row justify-between w-full">
                <div
                  class="order-first relative inline-block text-left cursor-pointer shadow-xs"
                >
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild let:builder>
                      <Button
                        builders={[builder]}
                        class="w-full border-gray-300 font-semibold dark:font-normal dark:border-gray-600 border bg-black sm:hover:bg-default  text-white dark:text-black dark:bg-white dark:sm:hover:bg-gray-100 ease-out flex flex-row justify-between items-center px-3 py-2 rounded truncate"
                      >
                        <span class="truncate">@Agents</span>
                        <svg
                          class="-mr-1 ml-3 h-5 w-5 xs:ml-2 inline-block"
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
                      class="w-64 h-fit max-h-56 overflow-y-auto scroller"
                    >
                      {#if selectedGroup === "overview"}
                        <DropdownMenu.Group>
                          {#each agentCategory as option}
                            <DropdownMenu.Item
                              on:click={(e) => {
                                e.preventDefault();
                                selectedGroup = option;
                              }}
                              class="cursor-pointer sm:hover:bg-gray-300 dark:sm:hover:bg-primary"
                            >
                              <div class="flex flex-row items-center w-full">
                                <span
                                  >{option} ({agentOptions?.filter(
                                    (item) => item?.group === option,
                                  )?.length})</span
                                >

                                <svg
                                  class="ml-auto h-5 w-5 inline-block rotate-270"
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
                              </div>
                            </DropdownMenu.Item>
                          {/each}
                          <DropdownMenu.Item
                            on:click={() => goto("/faq/ai-agents")}
                            class="cursor-pointer sm:hover:bg-gray-300 dark:sm:hover:bg-primary"
                          >
                            <div
                              class="flex flex-row items-center w-full text-sm"
                            >
                              <span>How to Use Agents correctly</span>
                            </div>
                            <svg
                              class="ml-auto h-5 w-5 inline-block rotate-270"
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
                          </DropdownMenu.Item>
                        </DropdownMenu.Group>
                      {:else}
                        <DropdownMenu.Group>
                          <div class="w-full p-1 flex items-stretch gap-1">
                            <button
                              type="button"
                              on:click={(e) => {
                                e.preventDefault();
                                selectedGroup = "overview";
                              }}
                              class="aspect-square flex items-center cursor-pointer"
                              ><svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="w-5 h-5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                ><path d="m15 18-6-6 6-6"></path></svg
                              ></button
                            >
                          </div>
                          {#each agentOptions as option}
                            {#if option?.group === selectedGroup}
                              <DropdownMenu.Item
                                on:click={() => insertAgentOption(option?.name)}
                                class="cursor-pointer sm:hover:bg-gray-300 dark:sm:hover:bg-primary"
                              >
                                <div class="flex flex-row items-center w-full">
                                  <span>{option?.name} </span>

                                  <span class="ml-auto text-xs"
                                    >{option?.credit} Credits</span
                                  >
                                </div>
                              </DropdownMenu.Item>
                            {/if}
                          {/each}
                        </DropdownMenu.Group>
                      {/if}
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                </div>

                <Button
                  on:click={() => goto("/chat")}
                  class="mr-auto ml-2 w-fit border-gray-300 font-semibold dark:font-normal dark:border-gray-600 border bg-black sm:hover:bg-default text-white dark:text-black dark:bg-white dark:sm:hover:bg-gray-100 ease-out flex flex-row justify-between items-center px-3 py-2 rounded truncate"
                >
                  <span class="hidden sm:block"> New chat</span>
                  <Plus class="sm:-mr-1 sm:ml-1 h-5 w-5 inline-block" />
                </Button>

                {#if data?.user}
                  <label
                    class="ml-auto mr-2 whitespace-nowrap w-auto text-xs border-gray-300 font-semibold dark:font-normal dark:border-gray-600 border bg-gray-50 dark:bg-[#2A2E39] flex flex-row justify-between items-center px-3 rounded"
                  >
                    <div>
                      {data?.user?.credits?.toLocaleString("en-US")}
                      <span class="hidden sm:inline-block">Credits</span>
                    </div>
                  </label>
                {/if}

                <button
                  on:click={() =>
                    editorText?.trim()?.length > 0 && !isLoading && !isStreaming
                      ? llmChat()
                      : ""}
                  class="{editorText?.trim()?.length > 0 &&
                  !isLoading &&
                  !isStreaming
                    ? 'cursor-pointer'
                    : 'cursor-not-allowed opacity-60'} py-2 text-white dark:text-black text-[1rem] rounded border border-gray-300 dark:border-gray-700 bg-black dark:bg-gray-50 px-3 transition-colors duration-200"
                  type="button"
                >
                  {#if isLoading || isStreaming}
                    <span
                      class="loading loading-spinner loading-xs text-center m-auto flex justify-center items-center text-white dark:text-black"
                    ></span>
                  {:else}
                    <Arrow
                      class="w-4 h-4 text-center m-auto flex justify-center items-center text-white dark:text-black"
                    />
                  {/if}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <!-- Suggestions Dropdown - Positioned relative to document body -->
    </main>
    {#if showSuggestions}
      <ul
        class=" fixed bg-gray-50 dark:bg-[#2A2E39] rounded shadow-md border border-gray-300 dark:border-gray-600 z-[9999] w-56 h-fit max-h-56 overflow-y-auto scroller"
        style="top: {suggestionPos?.top}px; left: {suggestionPos?.left}px;"
      >
        {#each suggestions as suggestion, i}
          <li
            class="px-2 py-1 cursor-pointer sm:hover:bg-gray-100 dark:sm:hover:bg-[#1E222D] text-sm {i ===
            selectedSuggestion
              ? 'bg-gray-100 dark:bg-[#1E222D]'
              : ''}"
            on:click={() => insertSuggestion(suggestion)}
          >
            {suggestion}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>

<style>
  /* Base textarea styling */
  .textarea-base {
    background: transparent;
    position: relative;
    z-index: 1;
    color: currentColor;
    resize: none;
    white-space: pre-wrap;
  }

  :global(.ProseMirror) {
    outline: none !important;
    border: none !important;
    box-shadow: none !important;
  }

  :global(.ProseMirror:focus) {
    outline: none !important;
    border: none !important;
    box-shadow: none !important;
  }

  :global(.ProseMirror:focus-visible) {
    outline: none !important;
    border: none !important;
    box-shadow: none !important;
  }

  /* Target the editor container div */
  .editor-container {
    outline: none !important;
  }

  .editor-container:focus {
    outline: none !important;
  }

  .editor-container:focus-within {
    outline: none !important;
  }

  /* Remove focus from any child elements */
  .editor-container * {
    outline: none !important;
  }

  .editor-container *:focus {
    outline: none !important;
  }
</style>
