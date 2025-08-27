// filterWorker.ts
// Worker that filters stock screener data based on rules, including indexMembership.
// Accepts message with { stockScreenerData, ruleOfList, indexDict }

function convertUnitToValue(input: string | number | string[]): any {
  try {
    if (Array.isArray(input)) {
      return input.map(convertUnitToValue); // Recursively convert array elements
    }
    if (typeof input === "number") return input;
    if (typeof input !== "string") {
      return input; // Return as-is if not a string or number
    }

    const lowerInput = input?.toLowerCase();

    // Pre-compute the set for quick lookups
    const nonNumericValues = new Set([
      "any",
      "call",
      "put",
      "stock",
      "etf",
    ]);

    if (nonNumericValues?.has(lowerInput)) return input;

    // Handle percentage values
    if (input?.endsWith("%")) {
      const numericValue = parseFloat(input?.slice(0, -1));  // Remove '%' and convert to number
      if (isNaN(numericValue)) {
        return input; // Return original input if conversion fails
      }
      return numericValue; // keep as numeric percent (e.g. "5%" => 5)
    }

    // Handle units (B, M, K)
    const units: Record<string, number> = { B: 1_000_000_000, M: 1_000_000, K: 1_000 };
    const match = input.match(/^(-?\d+(\.\d+)?)([BMK])?$/i); // Allow optional '-' at the beginning, case-insensitive
    if (match) {
      const value = parseFloat(match[1]);
      const unit = (match[3] || '').toUpperCase();
      return unit ? value * (units[unit] ?? 1) : value;
    }

    // Default numeric conversion (if no unit specified)
    const numericValue = parseFloat(input);
    if (isNaN(numericValue)) {
      return input; // Return original input if conversion fails
    }

    return numericValue;
  } catch (error) {
    console.warn(`Error converting value: ${input}`, error);
    return input; // Return original input in case of any unexpected errors
  }
}

// Normalize index keys so variants like "S&P100", "s&p 100", "s and p500" become "sp100"/"sp500"
function normalizeIndexKey(raw: any): string {
  if (typeof raw !== 'string') return String(raw || '').toLowerCase();
  let s = raw.toLowerCase();
  s = s.replace(/\s+/g, ""); // remove spaces
  // replace patterns like "s&p" or "s and p" with "sp"
  s = s.replace(/s&p/gi, "sp");
  s = s.replace(/sandp/gi, "sp"); // "s and p" -> "sandp" after removing spaces -> handle that
  s = s.replace(/s& p/gi, "sp");
  s = s.replace(/s\s*and\s*p/gi, "sp");
  // remove any leftover non-word chars (just in case)
  s = s.replace(/[^\w]/g, "");
  return s;
}

// Centralized rule checking logic
function createRuleCheck(rule: any, ruleName: string, ruleValue: any, indexDict: any) {
  // If rule.value is 'any' or ruleValue resolves to 'any' -> always match
  if (rule?.value === 'any') return () => true;
  if (ruleValue === 'any') return () => true;
  // Also handle arrays that contain 'any'
  if (Array.isArray(ruleValue) && ruleValue.some((v: any) => v === 'any')) return () => true;

  // Special handling: indexMembership
  if (ruleName === "indexmembership" || rule.name === "indexMembership") {
    // Build a normalized indexDict: keys normalized, values -> uppercase symbol set for quick lookup
    const normalizedIndexDict: Record<string, string[]> = {};
    if (indexDict && typeof indexDict === 'object') {
      for (const k of Object.keys(indexDict)) {
        try {
          const nk = normalizeIndexKey(k);
          const list = Array.isArray(indexDict[k]) ? indexDict[k] : [];
          normalizedIndexDict[nk] = list.map((s: any) => (s || "").toString().toUpperCase());
        } catch (err) {
          // ignore malformed entries
        }
      }
    }

    // Normalize the rule.value(s)
    const selectedIndexes: string[] = Array.isArray(rule.value)
      ? rule.value.map((v: any) => normalizeIndexKey(v))
      : [normalizeIndexKey(rule.value)];

    return (item: any) => {
      const symbol = (item?.symbol || "").toString().toUpperCase();
      if (!symbol) return false;

      if (!normalizedIndexDict || Object.keys(normalizedIndexDict).length === 0) return false;

      for (const idx of selectedIndexes) {
        if (!idx) continue;
        const list = normalizedIndexDict[idx];
        if (!Array.isArray(list)) continue;
        if (list.includes(symbol)) return true;
      }
      return false;
    };
  }

  // Categorical checks
  const categoricalFields = [
    'optionType',
    'assetType'
  ];

  if (categoricalFields?.includes(ruleName) || categoricalFields?.includes(rule.name)) {
    return (item: any) => {
      const itemValue = item[rule.name];
      if (Array.isArray(ruleValue)) {
        return ruleValue?.includes(itemValue);
      }
      return itemValue === ruleValue;
    };
  }

  // Between condition (numeric)
  if (rule.condition === 'between' && Array.isArray(ruleValue)) {
    return (item: any) => {
      const rawItemValue = item[rule.name];
      const itemValue = (typeof rawItemValue === 'string' || typeof rawItemValue === 'number')
        ? convertUnitToValue(rawItemValue)
        : rawItemValue;

      const [minRaw, maxRaw] = ruleValue;
      const min = convertUnitToValue(minRaw);
      const max = convertUnitToValue(maxRaw);

      // Handle empty/undefined min and max
      const emptyMin = (min === '' || min === undefined || min === null);
      const emptyMax = (max === '' || max === undefined || max === null);

      if (emptyMin && emptyMax) return true;
      if (emptyMin) return itemValue < max;
      if (emptyMax) return itemValue > min;

      return itemValue > min && itemValue < max;
    };
  }

  // Default numeric/string comparisons
  return (item: any) => {
    const rawItemValue = item[rule.name];
    if (rawItemValue === null || rawItemValue === undefined) return false;

    // Normalize item value for numeric comparisons if possible
    const itemValue = (typeof rawItemValue === 'string' || typeof rawItemValue === 'number')
      ? convertUnitToValue(rawItemValue)
      : rawItemValue;

    // If ruleValue is an array and we expect inclusion
    if (Array.isArray(ruleValue)) {
      // For cases where ruleValue is a set of allowed values (categorical-like)
      return ruleValue.includes(rawItemValue) || ruleValue.includes(itemValue);
    }

    // Handle equality / comparisons
    switch (rule.condition) {
      case 'exactly':
        return itemValue === ruleValue;
      case 'over':
        // consider numeric comparison
        return Number(itemValue) > Number(ruleValue);
      case 'under':
        return Number(itemValue) <= Number(ruleValue);
      default:
        // If no condition specified, try equality or truthy
        // If ruleValue is a string/number, check equality.
        if (ruleValue !== undefined && ruleValue !== null) {
          return itemValue === ruleValue || itemValue == ruleValue;
        }
        // fallback true if nothing to compare
        return true;
    }
  };
}

async function filterStockScreenerData(stockScreenerData: any[], ruleOfList: any[], indexDict: any) {
  // Early return if no data or no rules
  if (!stockScreenerData?.length || !ruleOfList?.length) {
    return stockScreenerData || [];
  }

  // Precompile rule conditions to avoid repeated checks
  const compiledRules = ruleOfList.map(rule => {
    // normalize the rule name to lowercase for internal checks, but keep original name for item lookups
    const ruleName = (rule.name || "").toString().toLowerCase();

    // For indexMembership we want the raw string(s) (not converted to numbers). So pass rule.value directly.
    const ruleValue = (ruleName === 'indexmembership') ? rule.value : convertUnitToValue(rule.value);

    return {
      ...rule,
      compiledCheck: createRuleCheck(rule, ruleName, ruleValue, indexDict)
    };
  });

  // Filtering (every compiled rule must pass)
  return stockScreenerData.filter(item =>
    compiledRules.every(rule => {
      try {
        return rule.compiledCheck(item);
      } catch (err) {
        // If a rule check throws for an item, treat it as failing that rule
        console.warn("Rule check error for item", item?.symbol, err);
        return false;
      }
    })
  );
}

onmessage = async (event: MessageEvent) => {
  const { stockScreenerData, ruleOfList, indexDict } = event.data || {};

  try {
    const filteredData = await filterStockScreenerData(
      stockScreenerData,
      ruleOfList,
      indexDict
    );

    postMessage({
      message: "success",
      filteredData,
      originalDataLength: stockScreenerData?.length || 0,
      filteredDataLength: filteredData?.length || 0
    });
  } catch (error) {
    console.error('Error in onmessage handler:', error);
    postMessage({
      message: "error",
      originalData: stockScreenerData,
      error: (error && error.toString()) || String(error)
    });
  }
};

export {};
