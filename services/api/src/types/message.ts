export const MESSAGE_ROLE = {
  USER: "user",
  ASSISTANT: "assistant",
} as const;

export type MessageRole = (typeof MESSAGE_ROLE)[keyof typeof MESSAGE_ROLE];
