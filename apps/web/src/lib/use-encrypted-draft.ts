"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type EncryptedDraftPayload,
  decryptDraft,
  deserializeEncryptedDraft,
  encryptDraft
} from "@tpt-hearth/crypto";

const DRAFT_STORAGE_PREFIX = "tpt-hearth:draft:";
const DRAFT_PASSPHRASE_STORAGE_KEY = "tpt-hearth:draft-passphrase";

/**
 * Hook for managing encrypted local draft storage for letters and messages.
 *
 * Drafts are encrypted with AES-GCM via PBKDF2 before being written to localStorage.
 * A per-session passphrase is stored in sessionStorage so the user only unlocks once per tab.
 */
export function useEncryptedDraft(draftId: string) {
  const [draft, setDraft] = useState<EncryptedDraftPayload | null>(null);
  const [passphrase, setPassphraseState] = useState<string | null>(null);

  // Attempt to recover passphrase from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(DRAFT_PASSPHRASE_STORAGE_KEY);
      if (stored) {
        setPassphraseState(stored);
      }
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  const getStorageKey = useCallback(
    () => `${DRAFT_STORAGE_PREFIX}${draftId}`,
    [draftId]
  );

  /** Unlock drafts with a passphrase (stored in sessionStorage for the tab session) */
  const unlock = useCallback((phrase: string) => {
    setPassphraseState(phrase);
    try {
      sessionStorage.setItem(DRAFT_PASSPHRASE_STORAGE_KEY, phrase);
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  /** Lock drafts (clear passphrase from sessionStorage) */
  const lock = useCallback(() => {
    setPassphraseState(null);
    try {
      sessionStorage.removeItem(DRAFT_PASSPHRASE_STORAGE_KEY);
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  /** Save a plaintext draft, encrypting it before writing to localStorage */
  const saveDraft = useCallback(
    async (plaintext: string) => {
      const phrase = passphrase ?? draftId;

      try {
        const encrypted = await encryptDraft(plaintext, phrase);
        const storageKey = getStorageKey();
        localStorage.setItem(storageKey, JSON.stringify(encrypted));
        setDraft(encrypted);
        return true;
      } catch {
        return false;
      }
    },
    [passphrase, draftId, getStorageKey]
  );

  /** Load and decrypt a draft from localStorage */
  const loadDraft = useCallback(async (): Promise<string | null> => {
    const phrase = passphrase ?? draftId;
    const storageKey = getStorageKey();

    try {
      const serialized = localStorage.getItem(storageKey);
      if (!serialized) return null;

      const parsed = deserializeEncryptedDraft(serialized);
      setDraft(parsed);

      const plaintext = await decryptDraft(parsed, phrase);
      return plaintext;
    } catch {
      return null;
    }
  }, [passphrase, draftId, getStorageKey]);

  /** Check if a draft exists in storage */
  const hasDraft = useCallback((): boolean => {
    try {
      return localStorage.getItem(getStorageKey()) !== null;
    } catch {
      return false;
    }
  }, [getStorageKey]);

  /** Remove the draft from storage */
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(getStorageKey());
      setDraft(null);
    } catch {
      // localStorage unavailable
    }
  }, [getStorageKey]);

  const isUnlocked = passphrase !== null;

  return {
    draft,
    isUnlocked,
    unlock,
    lock,
    saveDraft,
    loadDraft,
    hasDraft,
    clearDraft
  };
}