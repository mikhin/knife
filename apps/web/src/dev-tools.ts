/**
 * react-grab lets a component be picked in the browser and handed to an agent
 * with its context. Loaded from here rather than from index.html so the
 * dependency is visible to the tools that look for dead ones.
 */
export const loadDevTools = async (): Promise<void> => {
  await Promise.all([import("react-grab"), import("@react-grab/mcp/client")]);
};
