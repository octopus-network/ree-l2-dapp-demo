import { useCallback } from "react";
import { produce } from "immer";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export enum PopupStatus {
  LOADING,
  INFO,
  SUCCESS,
  ERROR,
}

export type Popup = {
  id: number;
  status: PopupStatus;
  title: string;
  description?: string;
};

const lastPopupIdAtom = atomWithStorage<number>("lastPopupId", 10000);

const popupsAtom = atom<Popup[]>([]);

const addPopupAtom = atom(null, (get, set, { title, description, status }) => {
  const popups = get(popupsAtom);
  const id = get(lastPopupIdAtom) + 1;
  const newState = produce(popups, (draft) => {
    draft.push({
      id,
      title,
      description,
      status,
    });
  });
  set(popupsAtom, newState);
  set(lastPopupIdAtom, id);
  return id;
});

const updatePopupAtom = atom(
  null,
  (get, set, { id, status, title, description }) => {
    const popups = get(popupsAtom);
    const newState = produce(popups, (draft) => {
      const popup = draft.find((p) => p.id === id);
      if (popup) {
        popup.status = status;
        popup.title = title;
        popup.description = description;
      }
    });
    set(popupsAtom, newState);
  }
);

const removePopupAtom = atom(null, (get, set, id: number) => {
  const popups = get(popupsAtom);
  const newState = produce(popups, (draft) => {
    return draft.filter((d) => d.id !== id);
  });
  set(popupsAtom, newState);
});

export function useAddPopup() {
  const addPopup = useSetAtom(addPopupAtom);
  return useCallback(
    (title: string, status: PopupStatus, description?: string) =>
      addPopup({
        title,
        status,
        description,
      }),
    [addPopup]
  );
}

export function useUpdatePopup() {
  const updatePopup = useSetAtom(updatePopupAtom);
  return useCallback(
    (id: number, title: string, status: PopupStatus, description?: string) => {
      updatePopup({
        id,
        title,
        status,
        description,
      });
    },
    [updatePopup]
  );
}

export function useRemovePopup() {
  return useSetAtom(removePopupAtom);
}

export function usePopups() {
  const popups = useAtomValue(popupsAtom);
  return popups;
}
