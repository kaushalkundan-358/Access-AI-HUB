document.addEventListener(
  "click",
  (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const trigger = target.closest<HTMLButtonElement>(
      'button[aria-label="Open sign in and account screens"]',
    );
    if (!trigger) return;

    event.preventDefault();
    event.stopPropagation();
    void import("./SupabaseAuth")
      .then(({ openSupabaseAuth }) => openSupabaseAuth())
      .catch((error: unknown) => {
        console.error("Could not open the sign-in dialog.", error);
      });
  },
  true,
);
