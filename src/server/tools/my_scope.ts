export const myScopeTool = {
  name: "my_scope",
  description: "Return the scope identifier for this Claude Code session. Share this with others so they can message you.",
  inputSchema: {
    type: "object" as const,
    properties: {},
  },
  handler(scope: string): string {
    return scope;
  },
};
