

// Convert the input to a value or return it as-is if it's already an array
function convertUnitToValue(input: string | number | string[]) {
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
      return numericValue //numericValue / 100; // Convert percentage to a decimal
    }

    // Handle units (B, M, K)
    const units = { B: 1_000_000_000, M: 1_000_000, K: 1_000 };
    const match = input.match(/^(-?\d+(\.\d+)?)([BMK])?$/); // Allow optional '-' at the beginning
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[3] as keyof typeof units;
      return unit ? value * units[unit] : value;
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

// Centralized rule checking logic
function createRuleCheck(rule, ruleName, ruleValue) {
  // Handle 'any' condition quickly
  if (rule.value === 'any') return () => true;





  // Categorical checks
  const categoricalFields = [
    'optionType',
    'assetType'
  ];

  if (categoricalFields?.includes(rule.name)) {
    return (item) => {
      const itemValue = item[rule.name];
      if (Array.isArray(ruleValue)) {
        console.log(ruleValue, itemValue)
        return ruleValue?.includes(itemValue);
      }
      return itemValue === ruleValue;
    };
  }



  // Between condition
  if (rule.condition === 'between' && Array?.isArray(ruleValue)) {
    return (item) => {
      const itemValue = item[rule.name];
      const [min, max] = ruleValue?.map(convertUnitToValue);


      // Handle empty/undefined min and max
      if ((min === '' || min === undefined || min === null) && 
          (max === '' || max === undefined || max === null)) {
        return true;
      }

      if (min === '' || min === undefined || min === null) {
        return itemValue < max;
      }

      if (max === '' || max === undefined || max === null) {
        return itemValue > min;
      }
      
      return itemValue > min && itemValue < max;
    };
  }

  // Default numeric comparisons
  return (item) => {
    const itemValue = item[rule.name];
    if (itemValue === null) return false;

   if (rule.condition === 'exactly' && itemValue !== ruleValue) return false;
  if (rule.condition === 'over' && itemValue <= ruleValue) return false;
  if (rule.condition === 'under' && itemValue > ruleValue) return false;



    // Default comparison if no specific condition
    return true;
  };
}


async function filterStockScreenerData(stockScreenerData, ruleOfList) {
  // Early return if no data or no rules
  if (!stockScreenerData?.length || !ruleOfList?.length) {
    return stockScreenerData || [];
  }

  // Precompile rule conditions to avoid repeated checks
  const compiledRules = ruleOfList.map(rule => {
    const ruleName = rule.name.toLowerCase();
    const ruleValue = convertUnitToValue(rule.value);

    return {
      ...rule,
      compiledCheck: createRuleCheck(rule, ruleName, ruleValue)
    };
  });

  // Use a more performant filtering method
  return stockScreenerData?.filter(item => 
    compiledRules?.every(rule => rule.compiledCheck(item))
  );
}


onmessage = async (event: MessageEvent) => {
  const { stockScreenerData, ruleOfList } = event.data || {};

  try {
    let filteredData = await filterStockScreenerData(
      stockScreenerData,
      ruleOfList
    );

    //filteredData = filteredData?.sort((a,b) => b?.totalPrem - a?.totalPrem);

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
      error: error.toString()
    });
  }
};

export {};