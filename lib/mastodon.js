const MASTODON_BASE_URL = "https://social.ffmuc.net";

// Mastodon admin API — requires a token with the admin:write:accounts scope.
// https://docs.joinmastodon.org/methods/admin/accounts/#action
export const disableMastodonAccount = async (accountId, token) => {
  const response = await fetch(
    `${MASTODON_BASE_URL}/api/v1/admin/accounts/${encodeURIComponent(accountId)}/action`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ type: "disable" }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to disable Mastodon account ${accountId}: ${response.status}`,
    );
  }
};

// Reverses `disable` — https://docs.joinmastodon.org/methods/admin/accounts/#enable
export const enableMastodonAccount = async (accountId, token) => {
  const response = await fetch(
    `${MASTODON_BASE_URL}/api/v1/admin/accounts/${encodeURIComponent(accountId)}/enable`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to enable Mastodon account ${accountId}: ${response.status}`,
    );
  }
};
