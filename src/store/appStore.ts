import { create } from "zustand";
import dayjs from "dayjs";
import type { Tag, Topic, EntryWithTags } from "../types";

export type Theme = "light" | "dark";

interface AppState {
  // 主题
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // 当前视图月份
  currentYear: number;
  currentMonth: number;
  setCurrentMonth: (year: number, month: number) => void;

  // 本月所有事项（按日期分组用）
  monthEntries: EntryWithTags[];
  setMonthEntries: (entries: EntryWithTags[]) => void;

  // 所有标签
  tags: Tag[];
  setTags: (tags: Tag[]) => void;

  // 所有主题
  topics: Topic[];
  setTopics: (topics: Topic[]) => void;

  // 标签筛选
  filterTagId: number | null;
  setFilterTagId: (id: number | null) => void;
}

const now = dayjs();
const savedTheme = (localStorage.getItem("nd-theme") as Theme) ?? "light";

export const useAppStore = create<AppState>((set) => ({
  theme: savedTheme,
  setTheme: (theme) => {
    localStorage.setItem("nd-theme", theme);
    set({ theme });
  },

  currentYear: now.year(),
  currentMonth: now.month() + 1,
  setCurrentMonth: (year, month) =>
    set({ currentYear: year, currentMonth: month }),

  monthEntries: [],
  setMonthEntries: (entries) => set({ monthEntries: entries }),

  tags: [],
  setTags: (tags) => set({ tags }),

  topics: [],
  setTopics: (topics) => set({ topics }),

  filterTagId: null,
  setFilterTagId: (id) => set({ filterTagId: id }),
}));
