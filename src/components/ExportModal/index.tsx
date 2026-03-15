import React, { useState } from "react";
import { Modal, Button, Space, message, Radio, Typography } from "antd";
import { DownloadOutlined, FilePdfOutlined, FileMarkdownOutlined } from "@ant-design/icons";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import dayjs from "dayjs";
import { getEntriesForExport } from "../../lib/db";
import { useAppStore } from "../../store/appStore";

const { Text } = Typography;

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ open, onClose }) => {
  const { currentYear, currentMonth } = useAppStore();
  const [exportType, setExportType] = useState<"markdown" | "pdf">("markdown");
  const [loading, setLoading] = useState(false);

  const htmlToMarkdown = (html: string): string => {
    return html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n")
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n")
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n")
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
      .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
      .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
      .replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*")
      .replace(/<u[^>]*>(.*?)<\/u>/gi, "_$1_")
      .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
      .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, "```\n$1\n```\n")
      .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  const handleExportMarkdown = async () => {
    setLoading(true);
    try {
      const entries = await getEntriesForExport(currentYear, currentMonth);
      const monthStr = `${currentYear}年${currentMonth}月`;
      let md = `# ${monthStr} 工作日志\n\n`;
      md += `> 导出时间：${dayjs().format("YYYY-MM-DD HH:mm:ss")}\n\n`;
      md += `---\n\n`;

      if (entries.length === 0) {
        md += "本月暂无记录。\n";
      } else {
        for (const entry of entries) {
          const dateStr = dayjs(entry.date).format("YYYY年MM月DD日 dddd");
          md += `## ${dateStr}\n\n`;
          if (entry.tags.length > 0) {
            md += `**标签：** ${entry.tags.map((t) => t.name).join("、")}\n\n`;
          }
          md += htmlToMarkdown(entry.content) + "\n\n";
          md += "---\n\n";
        }
      }

      const filePath = await save({
        defaultPath: `工作日志_${currentYear}_${String(currentMonth).padStart(2, "0")}.md`,
        filters: [{ name: "Markdown", extensions: ["md"] }],
      });

      if (filePath) {
        await writeTextFile(filePath, md);
        message.success("Markdown 导出成功！");
        onClose();
      }
    } catch (e) {
      message.error("导出失败：" + String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    setLoading(true);
    try {
      const entries = await getEntriesForExport(currentYear, currentMonth);
      const monthStr = `${currentYear}年${currentMonth}月`;

      let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${monthStr}</title>
          <style>
            body { font-family: "Microsoft YaHei", sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.8; color: #333; }
            h1 { color: #1677ff; border-bottom: 2px solid #1677ff; padding-bottom: 8px; }
            h2 { color: #333; margin-top: 32px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
            .meta { color: #999; font-size: 13px; margin-bottom: 8px; }
            .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 4px; background: #e6f4ff; color: #1677ff; }
            .entry-content { margin: 12px 0; }
            .divider { border: none; border-top: 1px dashed #ddd; margin: 24px 0; }
            code { background: #f6f8fa; padding: 2px 4px; border-radius: 3px; }
            pre { background: #f6f8fa; padding: 12px; border-radius: 6px; overflow: auto; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>${monthStr} 工作日志</h1>
          <p class="meta">导出时间：${dayjs().format("YYYY-MM-DD HH:mm:ss")} | 共 ${entries.length} 条记录</p>
          <hr class="divider">
      `;

      if (entries.length === 0) {
        html += "<p>本月暂无记录。</p>";
      } else {
        for (const entry of entries) {
          const dateStr = dayjs(entry.date).format("YYYY年MM月DD日 dddd");
          html += `<h2>${dateStr}</h2>`;
          if (entry.tags.length > 0) {
            html += `<div class="meta">`;
            entry.tags.forEach((t) => {
              html += `<span class="tag" style="background:${t.color}20;color:${t.color}">${t.name}</span>`;
            });
            html += `</div>`;
          }
          html += `<div class="entry-content">${entry.content}</div>`;
          html += `<hr class="divider">`;
        }
      }
      html += `</body></html>`;

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      }
      onClose();
    } catch (e) {
      message.error("导出失败：" + String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (exportType === "markdown") {
      handleExportMarkdown();
    } else {
      handleExportPdf();
    }
  };

  return (
    <Modal
      title="导出日志"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: "100%" }} size={16}>
        <div>
          <Text type="secondary">
            导出 {currentYear} 年 {currentMonth} 月的所有日志记录
          </Text>
        </div>

        <Radio.Group
          value={exportType}
          onChange={(e) => setExportType(e.target.value)}
        >
          <Space direction="vertical">
            <Radio value="markdown">
              <Space>
                <FileMarkdownOutlined />
                Markdown 文件（.md）
              </Space>
            </Radio>
            <Radio value="pdf">
              <Space>
                <FilePdfOutlined />
                PDF 打印（通过系统打印对话框）
              </Space>
            </Radio>
          </Space>
        </Radio.Group>

        <Button
          type="primary"
          icon={<DownloadOutlined />}
          loading={loading}
          onClick={handleExport}
          block
        >
          开始导出
        </Button>
      </Space>
    </Modal>
  );
};

export default ExportModal;
