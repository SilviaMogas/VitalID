export function createRefreshController({
  fetchStatus,
  render,
  renderUnavailable,
  onFreshStart,
}) {
  let refreshPromise;
  let freshPromise;
  let generation = 0;

  function refreshCurrent({fresh = false} = {}) {
    if (refreshPromise) return refreshPromise;
    const requestGeneration = generation;
    const requestIsFresh = fresh || Boolean(freshPromise);
    const current = (async () => {
      try {
        const state = await fetchStatus();
        if (requestGeneration !== generation) return;
        render(state);
      } catch (error) {
        if (requestGeneration !== generation) return;
        renderUnavailable({error, fresh: requestIsFresh});
        throw error;
      }
    })();
    const wrapped = current.finally(() => {
      if (refreshPromise === wrapped) refreshPromise = undefined;
    });
    refreshPromise = wrapped;
    return wrapped;
  }

  function refreshFresh() {
    if (freshPromise) return freshPromise;
    generation += 1;
    onFreshStart();
    const previous = refreshPromise;
    const current = (async () => {
      if (previous) await previous.catch(() => {});
      return refreshCurrent({fresh: true});
    })();
    const wrapped = current.finally(() => {
      if (freshPromise === wrapped) freshPromise = undefined;
    });
    freshPromise = wrapped;
    return wrapped;
  }

  function refresh(options = {}) {
    return options.fresh ? refreshFresh() : refreshCurrent();
  }

  return {
    refresh,
    get generation() { return generation; },
  };
}

export async function submitWithFreshRefresh(submit, refresh, onSuccess) {
  const result = await submit();
  onSuccess?.(result);
  await refresh({fresh: true});
  return result;
}

export async function refreshInFinally(operation, refresh) {
  try {
    return await operation();
  } finally {
    await refresh({fresh: true});
  }
}
