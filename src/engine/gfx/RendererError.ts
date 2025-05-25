// 渲染器错误类
export class RendererError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'RendererError';
  }
}