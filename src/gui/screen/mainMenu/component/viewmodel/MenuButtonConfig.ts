// MenuButtonConfig.ts
// 菜单按钮配置的类型定义

export interface MenuButtonConfig {
  label: string; // 按钮显示文本
  action: () => void; // 按钮点击时执行的操作
  icon?: string; // 可选，按钮图标
  disabled?: boolean; // 可选，是否禁用
  visible?: boolean; // 可选，是否可见
}
