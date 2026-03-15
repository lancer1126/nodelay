import React, { useEffect, useState } from "react";
import {
  Button,
  List,
  Tag,
  Modal,
  Form,
  Input,
  ColorPicker,
  Popconfirm,
  Empty,
  Typography,
  Tabs,
  Segmented,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useTags } from "../../hooks/useTags";
import { useTopics } from "../../hooks/useTopics";
import { useAppStore } from "../../store/appStore";
import styles from "./Tags.module.css";

const { Title } = Typography;

type ItemType = "topic" | "tag";
type ViewMode = "list" | "card";
const TAGS_VIEW_MODE_KEY = "nd-tags-view-mode";

const TagsPage: React.FC = () => {
  const { tags, topics } = useAppStore();
  const { addTag, editTag, removeTag } = useTags();
  const { addTopic, editTopic, removeTopic } = useTopics();

  const [modalOpen, setModalOpen] = useState(false);
  const [activeType, setActiveType] = useState<ItemType>("topic");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(TAGS_VIEW_MODE_KEY);
    return saved === "card" ? "card" : "list";
  });
  const [editingItem, setEditingItem] = useState<{
    id: number;
    name: string;
    color: string;
    type: ItemType;
  } | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    localStorage.setItem(TAGS_VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  const openAdd = (type: ItemType) => {
    setEditingItem(null);
    setActiveType(type);
    form.resetFields();
    form.setFieldsValue({ color: type === "topic" ? "#722ed1" : "#1677ff" });
    setModalOpen(true);
  };

  const openEdit = (
    item: { id: number; name: string; color: string },
    type: ItemType
  ) => {
    setEditingItem({ ...item, type });
    setActiveType(type);
    form.setFieldsValue({ name: item.name, color: item.color });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const color =
      typeof values.color === "string"
        ? values.color
        : values.color?.toHexString?.() ?? "#1677ff";
    const currentType = editingItem?.type ?? activeType;
    if (editingItem) {
      if (editingItem.type === "topic") {
        await editTopic(editingItem.id, values.name, color);
      } else {
        await editTag(editingItem.id, values.name, color);
      }
    } else {
      if (currentType === "topic") {
        await addTopic(values.name, color);
      } else {
        await addTag(values.name, color);
      }
    }
    setModalOpen(false);
  };

  const renderList = (type: ItemType) => {
    const dataSource = type === "topic" ? topics : tags;
    const title = type === "topic" ? "主题管理" : "标签管理";
    const emptyText =
      type === "topic"
        ? "还没有主题，点击右上角新建"
        : "还没有标签，点击右上角新建";

    return (
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <Title level={5} style={{ margin: 0, color: "var(--text-primary)" }}>
            {title}
          </Title>
          <div className={styles.panelActions}>
            <Segmented<ViewMode>
              options={[
                { label: "列表", value: "list" },
                { label: "卡片", value: "card" },
              ]}
              value={viewMode}
              onChange={(value) => setViewMode(value)}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openAdd(type)}>
              新建{type === "topic" ? "主题" : "标签"}
            </Button>
          </div>
        </div>
        {dataSource.length === 0 ? (
          <div className={styles.empty}>
            <Empty
              description={<span style={{ color: "#72767d" }}>{emptyText}</span>}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : (
          <>
            {viewMode === "list" ? (
              <List
                dataSource={dataSource}
                renderItem={(item) => (
                  <List.Item className={styles.listItem}>
                    <div className={styles.tagRow}>
                      <span className={styles.colorDot} style={{ background: item.color }} />
                      <Tag color={item.color} style={{ fontSize: 13, padding: "3px 10px" }}>
                        {item.name}
                      </Tag>
                      <span className={styles.colorHex}>{item.color}</span>
                    </div>
                    <div className={styles.actions}>
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        className={styles.actionBtn}
                        onClick={() => openEdit(item, type)}
                      />
                      <Popconfirm
                        title={`确认删除此${type === "topic" ? "主题" : "标签"}？`}
                        description="关联的事项不会被删除，仅移除该关联。"
                        onConfirm={() =>
                          type === "topic" ? removeTopic(item.id) : removeTag(item.id)
                        }
                        okText="删除"
                        cancelText="取消"
                      >
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          className={styles.actionBtn}
                        />
                      </Popconfirm>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <div className={styles.cardGrid}>
                {dataSource.map((item) => (
                  <div key={item.id} className={styles.cardItem}>
                    <div className={styles.cardHead}>
                      <span className={styles.colorDot} style={{ background: item.color }} />
                      <Tag color={item.color} style={{ fontSize: 13, padding: "3px 10px", margin: 0 }}>
                        {item.name}
                      </Tag>
                    </div>
                    <div className={styles.colorHex}>{item.color}</div>
                    <div className={styles.cardActions}>
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        className={styles.actionBtn}
                        onClick={() => openEdit(item, type)}
                      />
                      <Popconfirm
                        title={`确认删除此${type === "topic" ? "主题" : "标签"}？`}
                        description="关联的事项不会被删除，仅移除该关联。"
                        onConfirm={() =>
                          type === "topic" ? removeTopic(item.id) : removeTag(item.id)
                        }
                        okText="删除"
                        cancelText="取消"
                      >
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          className={styles.actionBtn}
                        />
                      </Popconfirm>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <Title level={4} style={{ margin: 0, color: "var(--text-primary)" }}>
            主题与标签管理
          </Title>
        </div>
      </div>

      <div className={styles.listWrap}>
        <Tabs
          activeKey={activeType}
          onChange={(key) => setActiveType(key as ItemType)}
          items={[
            { key: "topic", label: `主题 (${topics.length})`, children: renderList("topic") },
            { key: "tag", label: `标签 (${tags.length})`, children: renderList("tag") },
          ]}
        />
      </div>

      <Modal
        title={`${editingItem ? "编辑" : "新建"}${(editingItem?.type ?? activeType) === "topic" ? "主题" : "标签"}`}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText="确认"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={(editingItem?.type ?? activeType) === "topic" ? "主题名称" : "标签名称"}
            rules={[
              {
                required: true,
                message: (editingItem?.type ?? activeType) === "topic"
                  ? "请输入主题名称"
                  : "请输入标签名称",
              },
            ]}
          >
            <Input
              placeholder={
                (editingItem?.type ?? activeType) === "topic"
                  ? "例如：nodelay系统、工作、学习..."
                  : "例如：个人项目、react、tauriapp..."
              }
            />
          </Form.Item>
          <Form.Item name="color" label="颜色">
            <ColorPicker format="hex" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TagsPage;
