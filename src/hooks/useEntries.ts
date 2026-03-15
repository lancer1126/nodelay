import { useCallback } from "react";
import { useAppStore } from "../store/appStore";
import {
  getEntriesByMonth,
  createEntry,
  updateEntry,
  deleteEntry,
} from "../lib/db";

export function useEntries() {
  const { currentYear, currentMonth, setMonthEntries } = useAppStore();

  const refreshMonth = useCallback(async () => {
    const entries = await getEntriesByMonth(currentYear, currentMonth);
    setMonthEntries(entries);
  }, [currentYear, currentMonth, setMonthEntries]);

  const addEntry = useCallback(
    async (
      date: string,
      title: string,
      content: string,
      topicId: number | null,
      tagIds: number[]
    ) => {
      await createEntry(date, title, content, topicId, tagIds);
      await refreshMonth();
    },
    [refreshMonth]
  );

  const editEntry = useCallback(
    async (
      id: number,
      title: string,
      content: string,
      topicId: number | null,
      tagIds: number[]
    ) => {
      await updateEntry(id, title, content, topicId, tagIds);
      await refreshMonth();
    },
    [refreshMonth]
  );

  const removeEntry = useCallback(
    async (id: number) => {
      await deleteEntry(id);
      await refreshMonth();
    },
    [refreshMonth]
  );

  return { refreshMonth, addEntry, editEntry, removeEntry };
}
