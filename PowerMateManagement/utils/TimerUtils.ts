export type TimerHandle = ReturnType<typeof setInterval>;

export const createInterval = (callback: () => void, delay: number): TimerHandle => {
  return setInterval(callback, delay);
};

export const createTimeout = (callback: () => void, delay: number): ReturnType<typeof setTimeout> => {
  return setTimeout(callback, delay);
};

export const clearIntervalSafe = (handle: TimerHandle | null): void => {
  if (handle !== null) {
    clearInterval(handle);
  }
};

export const clearTimeoutSafe = (handle: ReturnType<typeof setTimeout> | null): void => {
  if (handle !== null) {
    clearTimeout(handle);
  }
};
