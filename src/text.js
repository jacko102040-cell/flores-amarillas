export const fill = (text, values) => text.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
