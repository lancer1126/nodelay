import React, { useEffect, useState } from "react";
import { ConfigProvider, theme, Tooltip } from "antd";
import zhCN from "antd/locale/zh_CN";
import {
  CalendarOutlined,
  ReadOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import weekday from "dayjs/plugin/weekday";
import localeData from "dayjs/plugin/localeData";

import MonthView from "./components/MonthView";
import TagsPage from "./pages/Tags";
import SettingsPage from "./pages/Settings";
import { useTags } from "./hooks/useTags";
import { useTopics } from "./hooks/useTopics";
import { useEntries } from "./hooks/useEntries";
import { useAppStore } from "./store/appStore";
import { getDb } from "./lib/db";
import styles from "./App.module.css";

dayjs.extend(weekday);
dayjs.extend(localeData);
dayjs.locale("zh-cn");

type Page = "home" | "tags" | "settings";

interface NavItem {
  key: Page;
  icon: React.ReactNode;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: "home",     icon: <CalendarOutlined />, label: "主页" },
  { key: "tags",     icon: <ReadOutlined />,     label: "主题/标签" },
];

const BOTTOM_ITEMS: NavItem[] = [
  { key: "settings", icon: <SettingOutlined />,  label: "设置" },
];

const App: React.FC = () => {
  const { loadTags } = useTags();
  const { loadTopics } = useTopics();
  const { refreshMonth } = useEntries();
  const { theme: appTheme } = useAppStore();

  const [dbReady, setDbReady] = useState(false);
  const [page, setPage] = useState<Page>("home");

  // 挂载 data-theme 到 <html>，让 CSS 变量生效
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", appTheme);
  }, [appTheme]);

  useEffect(() => {
    const init = async () => {
      await getDb();
      setDbReady(true);
      await loadTopics();
      await loadTags();
      await refreshMonth();
    };
    init();
  }, []);

  if (!dbReady) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingDot} />
      </div>
    );
  }

  const renderPage = () => {
    switch (page) {
      case "home":     return <MonthView />;
      case "tags":     return <TagsPage />;
      case "settings": return <SettingsPage />;
    }
  };

  const isDark = appTheme === "dark";

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: "#1677ff",
          borderRadius: 6,
          fontFamily: '"Microsoft YaHei", "PingFang SC", -apple-system, sans-serif',
        },
      }}
    >
      <div className={styles.shell}>
        {/* 左侧功能栏 */}
        <nav className={styles.sidebar}>
          <div className={styles.navGroup}>
            {NAV_ITEMS.map((item) => (
              <Tooltip key={item.key} title={item.label} placement="right">
                <button
                  className={`${styles.navBtn} ${page === item.key ? styles.navBtnActive : ""}`}
                  onClick={() => setPage(item.key)}
                >
                  {item.icon}
                </button>
              </Tooltip>
            ))}
          </div>

          <div className={styles.navBottom}>
            {BOTTOM_ITEMS.map((item) => (
              <Tooltip key={item.key} title={item.label} placement="right">
                <button
                  className={`${styles.navBtn} ${page === item.key ? styles.navBtnActive : ""}`}
                  onClick={() => setPage(item.key)}
                >
                  {item.icon}
                </button>
              </Tooltip>
            ))}
          </div>
        </nav>

        {/* 右侧内容区 */}
        <main className={styles.content}>
          {renderPage()}
        </main>
      </div>
    </ConfigProvider>
  );
};

export default App;
