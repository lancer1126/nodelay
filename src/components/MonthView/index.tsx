import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  Popover,
  Tag,
  Tooltip,
  Popconfirm,
  DatePicker,
  Input,
  Divider,
  message,
  Modal,
} from "antd";
import {
  LeftOutlined,
  RightOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { useAppStore } from "../../store/appStore";
import { useEntries } from "../../hooks/useEntries";
import { useTopics } from "../../hooks/useTopics";
import { useTags } from "../../hooks/useTags";
import type { EntryWithTags } from "../../types";
import styles from "./MonthView.module.css";


const WEEK_DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

const htmlToPlainText = (html: string): string =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

// ---- 事项编辑 Popover 内容 ----
interface EntryPopoverProps {
  entry?: EntryWithTags;
  date?: string;
  onSave: (
    content: string,
    topicId: number | null,
    tagIds: number[],
    date?: string
  ) => Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}

const EntryPopoverContent: React.FC<EntryPopoverProps> = ({
  entry,
  date,
  onSave,
  onDelete,
  onClose,
}) => {
  const { tags, topics } = useAppStore();
  const { addTopic } = useTopics();
  const { addTag } = useTags();
  const [isEditing, setIsEditing] = useState(!entry);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(
    entry?.topic?.id ?? entry?.topic_id ?? null
  );
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(
    entry?.tags.map((t) => t.id) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [tempTopicId, setTempTopicId] = useState<number | null>(selectedTopicId);
  const [tempTagIds, setTempTagIds] = useState<number[]>(selectedTagIds);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [creatingTopic, setCreatingTopic] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);
  const [canSave, setCanSave] = useState(
    htmlToPlainText(entry?.content ?? "").length > 0
  );

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: entry?.content ?? "",
    editable: !entry,
    onCreate: ({ editor }) => {
      setCanSave(editor.getText().trim().length > 0);
    },
    onUpdate: ({ editor }) => {
      setCanSave(editor.getText().trim().length > 0);
    },
  });

  useEffect(() => {
    editor?.setEditable(isEditing);
  }, [editor, isEditing]);

  const handleSave = async () => {
    const html = editor?.getHTML() ?? "";
    const plainText = editor?.getText().trim() ?? "";
    if (!plainText) return;
    setSaving(true);
    try {
      await onSave(html, selectedTopicId, selectedTagIds, date);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleQuickCreateTopic = async () => {
    const name = newTopicName.trim();
    if (!name || creatingTopic) return;
    const existing = topics.find((t) => t.name === name);
    if (existing) {
      setTempTopicId(existing.id);
      setNewTopicName("");
      return;
    }
    setCreatingTopic(true);
    try {
      const created = await addTopic(name, "#722ed1");
      setTempTopicId(created.id);
      setNewTopicName("");
      message.success("已新建主题");
    } catch {
      message.warning("主题名称已存在或创建失败");
    } finally {
      setCreatingTopic(false);
    }
  };

  const handleQuickCreateTag = async () => {
    const name = newTagName.trim();
    if (!name || creatingTag) return;
    const existing = tags.find((t) => t.name === name);
    if (existing) {
      setTempTagIds((prev) =>
        prev.includes(existing.id) ? prev : [...prev, existing.id]
      );
      setNewTagName("");
      return;
    }
    setCreatingTag(true);
    try {
      const created = await addTag(name, "#1677ff");
      setTempTagIds((prev) =>
        prev.includes(created.id) ? prev : [...prev, created.id]
      );
      setNewTagName("");
      message.success("已新建标签");
    } catch {
      message.warning("标签名称已存在或创建失败");
    } finally {
      setCreatingTag(false);
    }
  };

  const selectedTopic = topics.find((t) => t.id === selectedTopicId) ?? null;
  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));
  const viewContentHtml = entry?.content?.trim()
    ? entry.content
    : "<p>（空记录）</p>";

  return (
    <div className={styles.popoverContent}>
      {!entry || isEditing ? (
        <>
          <div className={styles.popoverMetaRow}>
            <Button
              size="small"
              className={styles.metaPickerBtn}
              onClick={() => {
                setTempTopicId(selectedTopicId);
                setTopicModalOpen(true);
              }}
            >
              主题
            </Button>
            <Button
              size="small"
              className={styles.metaPickerBtn}
              onClick={() => {
                setTempTagIds(selectedTagIds);
                setTagModalOpen(true);
              }}
            >
              标签
            </Button>
          </div>
          <div className={styles.selectedMetaRow}>
            {selectedTopic ? (
              <Tag
                color={selectedTopic.color}
                closable
                onClose={(e) => {
                  e.preventDefault();
                  setSelectedTopicId(null);
                }}
                style={{ margin: 0 }}
              >
                主题: {selectedTopic.name}
              </Tag>
            ) : (
              <span className={styles.metaHint}>未选择主题</span>
            )}
            {selectedTags.length > 0 ? (
              <div className={styles.metaTagsWrap}>
                {selectedTags.map((tag) => (
                  <Tag
                    key={tag.id}
                    color={tag.color}
                    closable
                    onClose={(e) => {
                      e.preventDefault();
                      setSelectedTagIds((prev) => prev.filter((id) => id !== tag.id));
                    }}
                  >
                    {tag.name}
                  </Tag>
                ))}
              </div>
            ) : (
              <span className={styles.metaHint}>未选择标签</span>
            )}
          </div>
          <div
            className={styles.popoverEditor}
            onClick={() => editor?.commands.focus("end")}
          >
            <EditorContent editor={editor} className={styles.miniEditor} />
          </div>
          <div className={styles.popoverActions}>
            {onDelete && (
              <Popconfirm
                title="确认删除此事项？"
                onConfirm={onDelete}
                okText="删除"
                cancelText="取消"
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            )}
            <div style={{ flex: 1 }} />
            <Button size="small" onClick={onClose}>
              取消
            </Button>
            <Button
              size="small"
              type="primary"
              loading={saving}
              onClick={handleSave}
              disabled={!canSave}
            >
              保存
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className={styles.viewerHeader}>
            <div className={styles.viewerTitle}>事项详情</div>
            <Button
              size="small"
              type="text"
              icon={<EditOutlined />}
              onClick={() => setIsEditing(true)}
            >
              编辑
            </Button>
          </div>
          <div className={styles.selectedMetaRow}>
            {selectedTopic ? (
              <Tag color={selectedTopic.color} style={{ margin: 0 }}>
                主题: {selectedTopic.name}
              </Tag>
            ) : (
              <span className={styles.metaHint}>未选择主题</span>
            )}
            {selectedTags.length > 0 ? (
              <div className={styles.metaTagsWrap}>
                {selectedTags.map((tag) => (
                  <Tag key={tag.id} color={tag.color}>
                    {tag.name}
                  </Tag>
                ))}
              </div>
            ) : (
              <span className={styles.metaHint}>未选择标签</span>
            )}
          </div>
          <div className={`${styles.popoverEditor} ${styles.viewerEditor}`}>
            <div
              className={styles.viewerRichText}
              dangerouslySetInnerHTML={{ __html: viewContentHtml }}
            />
          </div>
        </>
      )}

      <Modal
        title="选择主题"
        open={topicModalOpen}
        onCancel={() => setTopicModalOpen(false)}
        onOk={() => {
          setSelectedTopicId(tempTopicId);
          setTopicModalOpen(false);
        }}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <div className={styles.pickerList}>
          {topics.map((topic) => (
            <button
              key={topic.id}
              type="button"
              className={`${styles.pickerItem} ${tempTopicId === topic.id ? styles.pickerItemActive : ""}`}
              onClick={() =>
                setTempTopicId((prev) => (prev === topic.id ? null : topic.id))
              }
            >
              <Tag color={topic.color} style={{ margin: 0 }}>
                {topic.name}
              </Tag>
            </button>
          ))}
        </div>
        <Divider style={{ margin: "12px 0" }} />
        <div className={styles.quickCreateRow}>
          <Input
            className={styles.quickCreateInput}
            size="small"
            placeholder="快速新建主题"
            value={newTopicName}
            onChange={(e) => setNewTopicName(e.target.value)}
            onPressEnter={() => void handleQuickCreateTopic()}
          />
          <Button
            size="small"
            type="primary"
            className={styles.quickCreateBtn}
            loading={creatingTopic}
            onClick={() => void handleQuickCreateTopic()}
          >
            新建
          </Button>
        </div>
      </Modal>

      <Modal
        title="选择标签"
        open={tagModalOpen}
        onCancel={() => setTagModalOpen(false)}
        onOk={() => {
          setSelectedTagIds(tempTagIds);
          setTagModalOpen(false);
        }}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <div className={styles.pickerList}>
          {tags.map((tag) => {
            const checked = tempTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                className={`${styles.pickerItem} ${checked ? styles.pickerItemActive : ""}`}
                onClick={() =>
                  setTempTagIds((prev) =>
                    prev.includes(tag.id)
                      ? prev.filter((id) => id !== tag.id)
                      : [...prev, tag.id]
                  )
                }
              >
                <Tag color={tag.color} style={{ margin: 0 }}>
                  {tag.name}
                </Tag>
              </button>
            );
          })}
        </div>
        <Divider style={{ margin: "12px 0" }} />
        <div className={styles.quickCreateRow}>
          <Input
            className={styles.quickCreateInput}
            size="small"
            placeholder="快速新建标签"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onPressEnter={() => void handleQuickCreateTag()}
          />
          <Button
            size="small"
            type="primary"
            className={styles.quickCreateBtn}
            loading={creatingTag}
            onClick={() => void handleQuickCreateTag()}
          >
            新建
          </Button>
        </div>
      </Modal>
    </div>
  );
};

// ---- 单条事项展示 ----
interface EntryChipProps {
  entry: EntryWithTags;
  onUpdated: () => void;
}

const EntryChip: React.FC<EntryChipProps> = ({ entry, onUpdated }) => {
  const [open, setOpen] = useState(false);
  const [popoverSeed, setPopoverSeed] = useState(0);
  const { editEntry, removeEntry } = useEntries();

  const handleSave = async (
    content: string,
    topicId: number | null,
    tagIds: number[]
  ) => {
    const preview = htmlToPlainText(content).slice(0, 48) || "未命名记录";
    await editEntry(entry.id, preview, content, topicId, tagIds);
    onUpdated();
  };

  const handleDelete = async () => {
    await removeEntry(entry.id);
    setOpen(false);
    onUpdated();
  };

  const leftColor = entry.topic?.color ?? entry.tags[0]?.color ?? "#1677ff";
  const previewText = htmlToPlainText(entry.content) || entry.title || "（空记录）";

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setPopoverSeed((seed) => seed + 1);
      }}
      trigger="click"
      placement="right"
      arrow={false}
      overlayClassName={styles.popoverOverlay}
      content={
        <EntryPopoverContent
          key={`${entry.id}-${popoverSeed}`}
          entry={entry}
          date={entry.date}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setOpen(false)}
        />
      }
    >
      <div
        className={styles.entryChip}
        style={{ borderLeftColor: leftColor }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className={styles.chipTitle}>{previewText}</span>
      </div>
    </Popover>
  );
};

// ---- 月历主组件 ----
const MonthView: React.FC = () => {
  const { currentYear, currentMonth, setCurrentMonth, monthEntries } =
    useAppStore();
  const { refreshMonth, addEntry } = useEntries();
  const [addingDate, setAddingDate] = useState<string | null>(null);
  const [addPopoverSeed, setAddPopoverSeed] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [maxVisiblePerDay, setMaxVisiblePerDay] = useState(3);
  const [maxVisibleWithMorePerDay, setMaxVisibleWithMorePerDay] = useState(2);
  const [morePopoverDate, setMorePopoverDate] = useState<string | null>(null);

  useEffect(() => {
    refreshMonth();
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    const d = dayjs(`${currentYear}-${currentMonth}-01`).subtract(1, "month");
    setCurrentMonth(d.year(), d.month() + 1);
  };

  const handleNextMonth = () => {
    const d = dayjs(`${currentYear}-${currentMonth}-01`).add(1, "month");
    setCurrentMonth(d.year(), d.month() + 1);
  };

  const handleToday = () => {
    const today = dayjs();
    setCurrentMonth(today.year(), today.month() + 1);
  };

  const handleAddEntry = async (
    content: string,
    topicId: number | null,
    tagIds: number[],
    date?: string
  ) => {
    const targetDate = date ?? addingDate;
    if (!targetDate) return;
    const preview = htmlToPlainText(content).slice(0, 48) || "未命名记录";
    await addEntry(targetDate, preview, content, topicId, tagIds);
  };

  // 按日期分组事项
  const entriesByDate = new Map<string, EntryWithTags[]>();
  for (const e of monthEntries) {
    if (!entriesByDate.has(e.date)) entriesByDate.set(e.date, []);
    entriesByDate.get(e.date)!.push(e);
  }

  // 生成日历格子（周一开始）
  const firstDay = dayjs(
    `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`
  );
  const daysInMonth = firstDay.daysInMonth();
  // dayjs().day(): 0=周日,1=周一...  转换为周一=0
  const startWeekday = (firstDay.day() + 6) % 7;
  const today = dayjs().format("YYYY-MM-DD");

  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(
      `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    );
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weekRows = cells.length / 7;
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const recalcVisibleCount = () => {
      const gridHeight = el.clientHeight;
      if (!gridHeight || weekRows <= 0) return;

      const cellHeight = gridHeight / weekRows;
      const sampleCell = el.querySelector<HTMLElement>(`.${styles.dayCell}`);
      const sampleHeader = sampleCell?.querySelector<HTMLElement>(`.${styles.dayCellHeader}`);
      const sampleEntry = sampleCell?.querySelector<HTMLElement>(`.${styles.entryChip}`);
      const sampleMore = sampleCell?.querySelector<HTMLElement>(`.${styles.moreChip}`);
      const sampleItems = sampleCell?.querySelector<HTMLElement>(`.${styles.entryItems}`);

      const cellStyle = sampleCell ? window.getComputedStyle(sampleCell) : null;
      const itemsStyle = sampleItems ? window.getComputedStyle(sampleItems) : null;
      const paddingTop = cellStyle ? parseFloat(cellStyle.paddingTop || "0") : 0;
      const paddingBottom = cellStyle ? parseFloat(cellStyle.paddingBottom || "0") : 0;
      const verticalPadding = paddingTop + paddingBottom;
      const headerHeight = sampleHeader?.getBoundingClientRect().height ?? 24;
      const entryRowHeight = sampleEntry?.getBoundingClientRect().height ?? 20;
      const moreChipHeight = sampleMore?.getBoundingClientRect().height ?? 18;
      const rowGap = itemsStyle ? parseFloat(itemsStyle.rowGap || itemsStyle.gap || "2") : 2;

      const usableForList = cellHeight - verticalPadding - headerHeight;
      const dynamicCountWithoutMore = Math.floor(
        (usableForList + rowGap) / (entryRowHeight + rowGap)
      );
      // 只有存在隐藏项时，才使用预留“显示全部”高度后的容量。
      const availableForEntries = usableForList - moreChipHeight;
      const dynamicCountWithMore = Math.floor(
        (availableForEntries + rowGap) / (entryRowHeight + rowGap)
      );
      const nextWithoutMore = Math.min(8, Math.max(1, dynamicCountWithoutMore));
      const nextWithMore = Math.min(
        nextWithoutMore,
        Math.max(1, dynamicCountWithMore)
      );

      setMaxVisiblePerDay(nextWithoutMore);
      setMaxVisibleWithMorePerDay(nextWithMore);
    };

    recalcVisibleCount();
    const observer = new ResizeObserver(recalcVisibleCount);
    observer.observe(el);
    window.addEventListener("resize", recalcVisibleCount);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", recalcVisibleCount);
    };
  }, [weekRows]);

  return (
    <div className={styles.container}>
      {/* 头部导航 */}
      <div className={styles.header}>
        <div className={styles.navGroup}>
          <Button size="small" onClick={handleToday} style={{ padding: "4px 10px", height: "auto" }}>今天</Button>
          <Button type="text" icon={<LeftOutlined />} onClick={handlePrevMonth} />
          <Button type="text" icon={<RightOutlined />} onClick={handleNextMonth} />
          <DatePicker.MonthPicker
            value={dayjs(`${currentYear}-${String(currentMonth).padStart(2, "0")}-01`)}
            onChange={(d) => {
              if (d) {
                setCurrentMonth(d.year(), d.month() + 1);
                setPickerOpen(false);
              }
            }}
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            format="YYYY 年 M 月"
            variant="borderless"
            allowClear={false}
            suffixIcon={null}
            inputReadOnly
            style={{ width: 0, padding: 0, margin: 0, overflow: "hidden", opacity: 0, position: "absolute" }}
          />
          <span
            className={styles.monthPickerTrigger}
            onClick={() => setPickerOpen(true)}
          >
            {currentYear} 年 {currentMonth} 月
          </span>
        </div>
      </div>

      {/* 星期标题行 */}
      <div className={styles.weekRow}>
        {WEEK_DAYS.map((w) => (
          <div key={w} className={styles.weekCell}>
            {w}
          </div>
        ))}
      </div>

      {/* 日历格子 */}
      <div
        ref={gridRef}
        className={styles.grid}
        style={{ gridTemplateRows: `repeat(${cells.length / 7}, 1fr)` }}
      >
        {cells.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} className={styles.emptyCell} />;
          }

          const isToday = date === today;
          const isRightmostCol = idx % 7 === 6;
          const dayNum = parseInt(date.split("-")[2]);
          const dayEntries = entriesByDate.get(date) ?? [];
          const visibleLimit =
            dayEntries.length > maxVisiblePerDay
              ? maxVisibleWithMorePerDay
              : maxVisiblePerDay;
          const visibleEntries = dayEntries.slice(0, visibleLimit);
          const hiddenEntries = dayEntries.slice(visibleLimit);
          const hiddenCount = Math.max(0, dayEntries.length - visibleLimit);

          return (
            <div key={date} className={`${styles.dayCell} ${isToday ? styles.todayCell : ""}`}>
              {/* 日期数字 + 添加按钮 */}
              <div className={styles.dayCellHeader}>
                <span className={`${styles.dayNumber} ${isToday ? styles.todayNumber : ""}`}>
                  {dayNum}
                </span>
                <Popover
                  open={addingDate === date}
                  onOpenChange={(v) => {
                    if (!v) setAddingDate(null);
                  }}
                  trigger="click"
                  placement={isRightmostCol ? "leftTop" : "rightTop"}
                  arrow={false}
                  overlayClassName={styles.popoverOverlay}
                  content={
                    addingDate === date ? (
                      <EntryPopoverContent
                        key={`${date}-${addPopoverSeed}`}
                        date={date}
                        onSave={handleAddEntry}
                        onClose={() => setAddingDate(null)}
                      />
                    ) : null
                  }
                >
                  <span>
                    <Tooltip
                      title="添加事项"
                      placement={isRightmostCol ? "left" : "right"}
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<PlusOutlined />}
                        className={styles.addBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddingDate((prev) => {
                            const next = prev === date ? null : date;
                            if (next) {
                              setAddPopoverSeed((seed) => seed + 1);
                            }
                            return next;
                          });
                        }}
                      />
                    </Tooltip>
                  </span>
                </Popover>
              </div>

              {/* 事项列表 */}
              <div className={styles.entryList}>
                <div className={styles.entryItems}>
                  {visibleEntries.map((entry) => (
                    <EntryChip
                      key={entry.id}
                      entry={entry}
                      onUpdated={() => {}}
                    />
                  ))}
                </div>
                {hiddenCount > 0 && (
                  <Popover
                    open={morePopoverDate === date}
                    onOpenChange={(v) => {
                      if (!v) setMorePopoverDate(null);
                    }}
                    trigger="click"
                    placement={isRightmostCol ? "leftTop" : "rightTop"}
                    arrow={false}
                    overlayClassName={styles.popoverOverlay}
                    content={
                      <div className={styles.morePopoverList}>
                        {hiddenEntries.map((entry) => (
                          <EntryChip
                            key={entry.id}
                            entry={entry}
                            onUpdated={refreshMonth}
                          />
                        ))}
                        {hiddenEntries.length === 0 && (
                          <div className={styles.morePopoverEmpty}>当天暂无事项</div>
                        )}
                      </div>
                    }
                  >
                    <button
                      type="button"
                      className={styles.moreChip}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMorePopoverDate((prev) => (prev === date ? null : date));
                      }}
                    >
                      显示全部
                    </button>
                  </Popover>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthView;
