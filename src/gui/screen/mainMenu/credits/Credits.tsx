import React from 'react';
import { Strings } from '../../../../data/Strings';

export interface CreditsProps {
  contentTpl: string;
  strings: Strings;
}

export const Credits: React.FC<CreditsProps> = ({ contentTpl, strings }) => {
  // 如实迁移原项目的文本处理逻辑
  const processedContent = contentTpl
    // 替换字符串模板 {KEY} 为本地化文本
    .replace(/\{([^}]+)\}/g, (match, key) => strings.get(key) || match)
    // 处理链接 <URL> 为可点击链接
    .replace(/<([^>]+)>/g, (match, url) => 
      url.match(/^(https?|mailto):(\/\/)?/)
        ? `<a href='${encodeURI(url)}' target='_blank' rel='noopener'>${encodeURI(url)}</a>`
        : ""
    )
    // 换行符转换为 <br />
    .replace(/\t*\r?\n/g, "<br />")
    // 制作人员格式：名称 + Tab + 职位 转换为特殊格式
    .replace(
      /([^>]+)\t+([^<]+)<br \/>/g,
      `<div class='def'>
        <span class='title'>$1</span>
        <span class='filler'></span>
        <span class='name'>$2</span>
      </div>`
    );

  return (
    <div className="credits-container">
      <div 
        className="credits"
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />
    </div>
  );
}; 