import { useCallback } from "react";
import { useAppStore } from "../store/appStore";
import { getAllTags, createTag, updateTag, deleteTag } from "../lib/db";
import type { Tag } from "../types";

export function useTags() {
  const { setTags } = useAppStore();

  const loadTags = useCallback(async () => {
    const tags = await getAllTags();
    setTags(tags);
  }, [setTags]);

  const addTag = useCallback(
    async (name: string, color: string): Promise<Tag> => {
      const created = await createTag(name, color);
      await loadTags();
      return created;
    },
    [loadTags]
  );

  const editTag = useCallback(
    async (id: number, name: string, color: string) => {
      await updateTag(id, name, color);
      await loadTags();
    },
    [loadTags]
  );

  const removeTag = useCallback(
    async (id: number) => {
      await deleteTag(id);
      await loadTags();
    },
    [loadTags]
  );

  return { loadTags, addTag, editTag, removeTag };
}
