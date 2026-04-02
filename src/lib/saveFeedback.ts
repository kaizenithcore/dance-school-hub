import { toast } from "sonner";

interface SaveFeedbackMessages {
  loading: string;
  success: string;
  error: string;
  successDescription?: string;
  errorHint?: string;
}

export async function runWithSaveFeedback<T>(
  messages: SaveFeedbackMessages,
  operation: () => Promise<T>
): Promise<T> {
  const toastId = toast.loading(messages.loading);

  try {
    const result = await operation();
    toast.success(messages.success, {
      id: toastId,
      description: messages.successDescription,
    });
    return result;
  } catch (error) {
    const suffix = error instanceof Error && error.message ? `: ${error.message}` : "";
    toast.error(`${messages.error}${suffix}`, {
      id: toastId,
      description: messages.errorHint,
    });
    throw error;
  }
}
