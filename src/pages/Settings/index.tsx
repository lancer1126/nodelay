import React, { useEffect, useState } from "react";
import { Typography, Switch, Divider, Radio, Button, message, Space } from "antd";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useAppStore, type Theme } from "../../store/appStore";
import {
  getDataDirectory,
  migrateDataDirectory,
} from "../../lib/db";
import styles from "./Settings.module.css";

const { Title } = Typography;

interface SettingRowProps {
  label: string;
  desc?: string;
  control: React.ReactNode;
}

const SettingRow: React.FC<SettingRowProps> = ({ label, desc, control }) => (
  <div className={styles.row}>
    <div className={styles.rowLeft}>
      <span className={styles.rowLabel}>{label}</span>
      {desc && <span className={styles.rowDesc}>{desc}</span>}
    </div>
    <div className={styles.rowControl}>{control}</div>
  </div>
);

const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useAppStore();
  const [dataDir, setDataDir] = useState("读取中...");
  const [changingDir, setChangingDir] = useState(false);

  const loadPaths = async () => {
    try {
      const dir = await getDataDirectory();
      setDataDir(dir);
    } catch {
      setDataDir("读取失败");
    }
  };

  useEffect(() => {
    void loadPaths();
  }, []);

  const handleOpenDataDir = async () => {
    if (!dataDir || dataDir === "读取中..." || dataDir === "读取失败") return;
    try {
      await revealItemInDir(dataDir);
    } catch (e) {
      message.warning("打开目录失败：" + String(e));
    }
  };

  const handleChangeDataDir = async () => {
    if (changingDir) return;
    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
        title: "选择 NoDelay 数据目录",
        defaultPath: dataDir !== "读取中..." && dataDir !== "读取失败" ? dataDir : undefined,
      });
      if (!selected || Array.isArray(selected)) return;
      if (selected === dataDir) return;

      setChangingDir(true);
      await migrateDataDirectory(selected);
      await loadPaths();
      message.success("数据目录已更新，正在重载应用...");
      setTimeout(() => window.location.reload(), 400);
    } catch (e) {
      message.error("修改目录失败：" + String(e));
    } finally {
      setChangingDir(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={4} style={{ margin: 0, color: "var(--text-primary)" }}>设置</Title>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>外观</div>
        <SettingRow
          label="界面主题"
          desc="切换浅色或深色显示模式"
          control={
            <Radio.Group
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
              optionType="button"
              buttonStyle="solid"
              size="small"
            >
              <Radio.Button value="light">
                浅色
              </Radio.Button>
              <Radio.Button value="dark">
                深色
              </Radio.Button>
            </Radio.Group>
          }
        />
      </div>

      <Divider style={{ borderColor: "var(--border-color)", margin: "8px 0 24px" }} />

      <div className={styles.section}>
        <div className={styles.sectionTitle}>通用</div>
        <SettingRow
          label="开机自启"
          desc="登录系统时自动启动 NoDelay"
          control={<Switch />}
        />
        <SettingRow
          label="关闭时最小化到托盘"
          desc="点击关闭按钮时不退出，保留在系统托盘"
          control={<Switch defaultChecked />}
        />
        <SettingRow
          label="数据保存目录"
          desc={dataDir}
          control={
            <Space size={8}>
              <Button size="small" onClick={() => void handleOpenDataDir()}>
                打开文件夹
              </Button>
              <Button
                size="small"
                type="primary"
                ghost
                loading={changingDir}
                onClick={() => void handleChangeDataDir()}
              >
                修改目录
              </Button>
            </Space>
          }
        />
      </div>

      <Divider style={{ borderColor: "var(--border-color)", margin: "8px 0 24px" }} />

      <div className={styles.section}>
        <div className={styles.sectionTitle}>关于</div>
        <div className={styles.aboutCard}>
          <div className={styles.appName}>
            No<span style={{ color: "#1677ff" }}>Delay</span>
          </div>
          <div className={styles.appDesc}>不拖延，每天记</div>
          <div className={styles.appVersion}>版本 0.1.0</div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
