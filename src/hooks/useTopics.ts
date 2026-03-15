import { useCallback } from "react";
import { useAppStore } from "../store/appStore";
import { getAllTopics, createTopic, updateTopic, deleteTopic } from "../lib/db";
import type { Topic } from "../types";

export function useTopics() {
  const { setTopics } = useAppStore();

  const loadTopics = useCallback(async () => {
    const topics = await getAllTopics();
    setTopics(topics);
  }, [setTopics]);

  const addTopic = useCallback(
    async (name: string, color: string): Promise<Topic> => {
      const created = await createTopic(name, color);
      await loadTopics();
      return created;
    },
    [loadTopics]
  );

  const editTopic = useCallback(
    async (id: number, name: string, color: string) => {
      await updateTopic(id, name, color);
      await loadTopics();
    },
    [loadTopics]
  );

  const removeTopic = useCallback(
    async (id: number) => {
      await deleteTopic(id);
      await loadTopics();
    },
    [loadTopics]
  );

  return { loadTopics, addTopic, editTopic, removeTopic };
}
