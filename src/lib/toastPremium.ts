import { toast, type ExternalToast } from "sonner";

const TOAST_DEDUPE_WINDOW_MS = 4000;
const recentToastByKey = new Map<string, number>();

function shouldEmitToast(key: string): boolean {
  const now = Date.now();
  const last = recentToastByKey.get(key) ?? 0;

  if (now - last < TOAST_DEDUPE_WINDOW_MS) {
    return false;
  }

  recentToastByKey.set(key, now);
  return true;
}

export function toastErrorOnce(key: string, message: string, options?: ExternalToast) {
  if (!shouldEmitToast(`error:${key}`)) {
    return;
  }

  toast.error(message, options);
}

export function toastInfoOnce(key: string, message: string, options?: ExternalToast) {
  if (!shouldEmitToast(`info:${key}`)) {
    return;
  }

  toast.info(message, options);
}
