const CUSTOMER_PASSKEYS_KEY = 'app_customer_passkeys';
const CUSTOMER_PASSKEY_LAST_USED_KEY = 'app_customer_passkey_last_used';

type PasskeyRecord = {
  customerId: string;
  whatsapp: string;
  credentialId: string;
  enabled: boolean;
  updatedAt: string;
};

type PasskeyStore = Record<string, PasskeyRecord>;

const normalizeWhatsapp = (value: string): string => String(value || '').replace(/\D/g, '');

const toBase64Url = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const fromBase64Url = (value: string): Uint8Array => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const randomChallenge = (size = 32): Uint8Array => {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes;
};

const loadStore = (): PasskeyStore => {
  try {
    const raw = localStorage.getItem(CUSTOMER_PASSKEYS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as PasskeyStore) : {};
  } catch {
    return {};
  }
};

const saveStore = (store: PasskeyStore) => {
  localStorage.setItem(CUSTOMER_PASSKEYS_KEY, JSON.stringify(store));
};

const upsertRecord = (record: PasskeyRecord) => {
  const store = loadStore();
  store[record.customerId] = record;
  saveStore(store);
};

const setLastUsedCustomerId = (customerId: string) => {
  localStorage.setItem(CUSTOMER_PASSKEY_LAST_USED_KEY, customerId);
};

const getLastUsedCustomerId = (): string => {
  return String(localStorage.getItem(CUSTOMER_PASSKEY_LAST_USED_KEY) || '');
};

export const isPasskeySupported = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.credentials !== 'undefined' &&
    window.isSecureContext
  );
};

export const getCustomerPasskeyStatus = (customerId: string): { configured: boolean; enabled: boolean } => {
  const rec = loadStore()[customerId];
  if (!rec?.credentialId) return { configured: false, enabled: false };
  return { configured: true, enabled: Boolean(rec.enabled) };
};

export const registerCustomerPasskey = async (
  customer: { id: string; name: string; whatsapp_number: string }
): Promise<void> => {
  if (!isPasskeySupported()) throw new Error('unsupported');

  const normalizedWhatsapp = normalizeWhatsapp(customer.whatsapp_number);
  const existing = loadStore()[customer.id];
  const exclude = existing?.credentialId
    ? [
        {
          type: 'public-key' as const,
          id: fromBase64Url(existing.credentialId),
        },
      ]
    : [];

  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: randomChallenge(),
    rp: {
      name: 'Pluto Store AI',
      id: window.location.hostname,
    },
    user: {
      id: new TextEncoder().encode(customer.id),
      name: normalizedWhatsapp || customer.id,
      displayName: customer.name || normalizedWhatsapp || customer.id,
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },
      { alg: -257, type: 'public-key' },
    ],
    timeout: 60_000,
    authenticatorSelection: {
      userVerification: 'required',
      residentKey: 'preferred',
    },
    excludeCredentials: exclude,
    attestation: 'none',
  };

  const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
  if (!credential) throw new Error('create_failed');

  upsertRecord({
    customerId: customer.id,
    whatsapp: normalizedWhatsapp,
    credentialId: toBase64Url(credential.rawId),
    enabled: true,
    updatedAt: new Date().toISOString(),
  });
  setLastUsedCustomerId(customer.id);
};

export const setCustomerPasskeyEnabled = (customerId: string, enabled: boolean): void => {
  const store = loadStore();
  const rec = store[customerId];
  if (!rec) return;
  store[customerId] = { ...rec, enabled, updatedAt: new Date().toISOString() };
  saveStore(store);
};

export const removeCustomerPasskey = (customerId: string): void => {
  const store = loadStore();
  if (!store[customerId]) return;
  delete store[customerId];
  saveStore(store);
  if (getLastUsedCustomerId() === customerId) {
    localStorage.removeItem(CUSTOMER_PASSKEY_LAST_USED_KEY);
  }
};

export const rememberCustomerForPasskey = (customerId: string): void => {
  const rec = loadStore()[customerId];
  if (!rec || !rec.enabled) return;
  setLastUsedCustomerId(customerId);
};

export const authenticateCustomerWithPasskey = async (
  whatsappNumber?: string
): Promise<{ customerId: string }> => {
  if (!isPasskeySupported()) throw new Error('unsupported');

  const store = loadStore();
  const enabled = Object.values(store).filter((item) => item.enabled && item.credentialId);

  let rec: PasskeyRecord | undefined;
  const normalizedWhatsapp = normalizeWhatsapp(String(whatsappNumber || ''));

  if (normalizedWhatsapp) {
    rec = enabled.find((item) => item.whatsapp === normalizedWhatsapp);
  } else {
    const lastUsedId = getLastUsedCustomerId();
    if (lastUsedId && store[lastUsedId]?.enabled) {
      rec = store[lastUsedId];
    } else if (enabled.length === 1) {
      rec = enabled[0];
    } else {
      throw new Error('phone_required');
    }
  }

  if (!rec?.credentialId) throw new Error('not_configured');

  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: randomChallenge(),
    allowCredentials: [{ type: 'public-key', id: fromBase64Url(rec.credentialId) }],
    userVerification: 'required',
    timeout: 60_000,
    rpId: window.location.hostname,
  };

  const result = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
  if (!result) throw new Error('auth_failed');

  setLastUsedCustomerId(rec.customerId);
  return { customerId: rec.customerId };
};
